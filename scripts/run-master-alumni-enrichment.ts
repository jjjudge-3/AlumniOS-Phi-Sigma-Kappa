import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ALUMNI_RELATION = "master alumni";

type RawRow = Record<string, unknown>;
type BrightDataProfileResponse = Record<string, unknown> | Array<Record<string, unknown>>;
type OpenAIProfileSummaryResponse = {
  profileSummary: string;
  confidence: "high" | "medium" | "low";
  currentTitle: string | null;
  currentCompany: string | null;
  location: string | null;
  locationCity: string | null;
  locationState: string | null;
  education: string | null;
  broadIndustry: string | null;
  subIndustry: string | null;
  jobFunction: string | null;
  companyLinkedinUrl: string | null;
  companyWebsite: string | null;
  referralPowerScore: number | null;
  referralPowerReason: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getLinkedinUrlFromAlumniRow(row: RawRow) {
  const candidates = [
    row["Final LinkedIn URL"],
    row["Final Linkedin URL"],
    row["final_linkedin_url"],
    row.linkedin_url,
    row["LinkedIn URL"],
    row["linkedin url"],
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
}

function getFullNameFromAlumniRow(row: RawRow) {
  const candidates = [
    row.full_name,
    row["Full Name"],
    [row.first_name, row.last_name].filter((value) => typeof value === "string" && value.trim()).join(" "),
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "Unknown Alumni";
}

function companyLogoUrlFromWebsite(companyWebsite: string | null) {
  if (!companyWebsite) return null;
  const normalized = companyWebsite.startsWith("http://") || companyWebsite.startsWith("https://")
    ? companyWebsite
    : `https://${companyWebsite}`;
  try {
    const hostname = new URL(normalized).hostname.replace(/^www\./, "");
    return hostname ? `https://logo.clearbit.com/${hostname}` : null;
  } catch {
    const hostname = companyWebsite.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return hostname ? `https://logo.clearbit.com/${hostname}` : null;
  }
}

async function fetchBrightDataProfileJson(linkedinUrl: string) {
  const response = await fetch(
    "https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&include_errors=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getRequiredEnv("BRIGHTDATA_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: [{ url: linkedinUrl }],
      }),
    },
  );

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`Bright Data profile request failed (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText) as BrightDataProfileResponse;
  } catch {
    throw new Error("Bright Data profile request returned non-JSON output");
  }
}

async function generateOpenAIProfileSummary(alumnus: RawRow) {
  const rawProfile = alumnus.enriched_person_json;

  if (!rawProfile) {
    throw new Error(`Alumni row ${String(alumnus.id ?? "")} is missing enriched_person_json`);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredEnv("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL || "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are writing high-quality alumni career profiles for a fraternity alumni networking platform and also normalizing profile data into clean database fields. Use only the supplied LinkedIn JSON and alumni row. Do not hallucinate. Write in polished, specific, chronological prose similar to a professional operator memo. Emphasize career progression, promotions, performance signals, vertical specialization, executive exposure, and why this person would be valuable for a student or alumnus to speak with. If a fact is not supported by the input, leave it out. Important: in this system, industry means the alumnus's professional lane or career track based on their job title and function, not the employer's sector. Example: a software engineer at a construction company should still be categorized under Software Engineering, not Construction. For industry, choose the single best broad role-based category from this set when possible: Software Engineering, Data & AI, Product, Design, Finance, Sales, Marketing, Consulting, Operations, Construction, Legal, Human Resources, Healthcare, Education, Real Estate, Government, Media, or General Business. For sub-industry, be as specific as the role supports. Good examples include Frontend Engineering, Backend Engineering, Full-Stack Engineering, Infrastructure & DevOps, Machine Learning, Data Science, Product Management, Investment Banking, Private Equity, Venture Capital, Wealth Management, Corporate Finance & Accounting, Sales Development, Account Executive Sales, Customer Success, Growth Marketing, Brand & Content Marketing, Management Consulting, Operations Consulting, Supply Chain & Logistics, Construction Management, Legal Practice, Recruiting & People Operations, Clinical Care, or Education. Also score referral power from 1 to 10 based on likely referral leverage for a student or alumnus, using title seniority, company influence, career performance, and likely internal credibility. Include a concise reason grounded in the profile facts.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                alumniRow: alumnus,
                rawLinkedinJson: rawProfile,
                outputStyle: {
                  title: "Career Profile",
                  audience: "students and alumni using an internal fraternity alumni network",
                  format:
                    "Start with one headline line including current role, company, location, and education when available. Then write multiple sections in natural prose: foundation and early career, major career phases, current role, and bottom line.",
                },
              }),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "alumni_profile_summary",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              profileSummary: { type: "string" },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              currentTitle: { type: ["string", "null"] },
              currentCompany: { type: ["string", "null"] },
              location: { type: ["string", "null"] },
              locationCity: { type: ["string", "null"] },
              locationState: { type: ["string", "null"] },
              education: { type: ["string", "null"] },
              broadIndustry: { type: ["string", "null"] },
              subIndustry: { type: ["string", "null"] },
              jobFunction: { type: ["string", "null"] },
              companyLinkedinUrl: { type: ["string", "null"] },
              companyWebsite: { type: ["string", "null"] },
              referralPowerScore: { type: ["number", "null"] },
              referralPowerReason: { type: ["string", "null"] },
            },
            required: [
              "profileSummary",
              "confidence",
              "currentTitle",
              "currentCompany",
              "location",
              "locationCity",
              "locationState",
              "education",
              "broadIndustry",
              "subIndustry",
              "jobFunction",
              "companyLinkedinUrl",
              "companyWebsite",
              "referralPowerScore",
              "referralPowerReason",
            ],
          },
        },
      },
    }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`OpenAI profile summary request failed (${response.status}): ${responseText}`);
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(responseText) as Record<string, unknown>;
  } catch {
    throw new Error("OpenAI profile summary request returned non-JSON output");
  }

  const outputText =
    (typeof parsed.output_text === "string" && parsed.output_text.trim()
      ? parsed.output_text
      : extractOutputText(parsed)) ?? null;

  if (!outputText) {
    throw new Error("OpenAI profile summary response did not include output_text");
  }

  try {
    return JSON.parse(outputText) as OpenAIProfileSummaryResponse;
  } catch {
    throw new Error("OpenAI profile summary output_text was not valid JSON");
  }
}

function extractOutputText(parsed: Record<string, unknown>) {
  const output = parsed.output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as Record<string, unknown>).content;
    if (!Array.isArray(content)) continue;

    for (const chunk of content) {
      if (!chunk || typeof chunk !== "object") continue;
      const record = chunk as Record<string, unknown>;
      if (typeof record.text === "string" && record.text.trim()) {
        return record.text;
      }
    }
  }

  return null;
}

function isRateLimitError(message: string) {
  return message.includes("rate_limit_exceeded") || message.includes("Rate limit reached");
}

function parseRetryDelayMs(message: string) {
  const secondsMatch = message.match(/try again in (\d+)s/i);
  if (secondsMatch) {
    return (Number(secondsMatch[1]) + 2) * 1000;
  }
  return 25000;
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLinkedinEnrichment(pageSize: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(ALUMNI_RELATION).select("*");

  if (error) {
    throw new Error(`Supabase alumni full enrichment query failed: ${error.message}`);
  }

  const candidates = ((data ?? []) as RawRow[])
    .map((row) => ({
      row,
      alumniId: String(row.id ?? ""),
      linkedinUrl: getLinkedinUrlFromAlumniRow(row),
      fullName: getFullNameFromAlumniRow(row),
      alreadyEnriched: Boolean(row.enriched_person_json),
    }))
    .filter((item) => item.alumniId && item.linkedinUrl && !item.alreadyEnriched);

  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (const item of candidates) {
    processed += 1;

    try {
      const profileJson = await fetchBrightDataProfileJson(item.linkedinUrl!);
      const { error: updateError } = await supabase
        .from(ALUMNI_RELATION)
        .update({ enriched_person_json: profileJson })
        .eq("id", item.alumniId);

      if (updateError) {
        throw new Error(`Supabase alumni update failed: ${updateError.message}`);
      }

      completed += 1;
      console.log(`[linkedin] completed ${completed}/${processed} :: ${item.fullName}`);
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown enrichment error";
      console.error(`[linkedin] failed ${item.fullName}: ${message}`);
    }
  }

  return { processed, completed, failed, remainingSkipped: 0 };
}

async function runSummaryEnrichment(pageSize: number) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(ALUMNI_RELATION).select("*");

  if (error) {
    throw new Error(`Supabase alumni full summary query failed: ${error.message}`);
  }

  const candidates = ((data ?? []) as RawRow[])
    .map((row) => ({
      row,
      alumniId: String(row.id ?? ""),
      fullName: getFullNameFromAlumniRow(row),
      hasRawProfile: Boolean(row.enriched_person_json),
      hasSummary: typeof row.profile_summary === "string" && row.profile_summary.trim().length > 0,
    }))
    .filter((item) => item.alumniId && item.hasRawProfile && !item.hasSummary);

  let processed = 0;
  let completed = 0;
  let failed = 0;

  for (const item of candidates) {
    processed += 1;

    let attempts = 0;

    while (true) {
      attempts += 1;

      try {
        const summary = await generateOpenAIProfileSummary(item.row);
        const { error: updateError } = await supabase
          .from(ALUMNI_RELATION)
          .update({
            linkedin_url: getLinkedinUrlFromAlumniRow(item.row),
            full_name: getFullNameFromAlumniRow(item.row),
            first_name: typeof item.row["First Name"] === "string" ? item.row["First Name"] : null,
            last_name: typeof item.row["Last Name"] === "string" ? item.row["Last Name"] : null,
            college: typeof item.row.College === "string" ? item.row.College : null,
            all_years_on_composite:
              typeof item.row["All Composite Years"] === "string" ? item.row["All Composite Years"] : null,
            job_title: summary.currentTitle,
            company_name: summary.currentCompany,
            location: summary.location,
            location_city: summary.locationCity,
            location_state: summary.locationState,
            company_linkedin_url: summary.companyLinkedinUrl,
            company_website: summary.companyWebsite,
            company_logo_url: companyLogoUrlFromWebsite(summary.companyWebsite),
            company_industry: summary.broadIndustry,
            sub_industry: summary.subIndustry,
            job_function: summary.jobFunction,
            referral_power_score: summary.referralPowerScore,
            referral_power_reason: summary.referralPowerReason,
            profile_summary: summary.profileSummary,
          })
          .eq("id", item.alumniId);

        if (updateError) {
          throw new Error(`Supabase alumni summary update failed: ${updateError.message}`);
        }

        completed += 1;
        console.log(`[summary] completed ${completed}/${processed} :: ${item.fullName}`);
        await sleep(21000);
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown summary error";

        if (isRateLimitError(message) && attempts < 10) {
          const delay = parseRetryDelayMs(message);
          console.warn(`[summary] rate limited for ${item.fullName}, waiting ${Math.round(delay / 1000)}s before retry`);
          await sleep(delay);
          continue;
        }

        failed += 1;
        console.error(`[summary] failed ${item.fullName}: ${message}`);
        break;
      }
    }
  }

  return { processed, completed, failed, remainingSkipped: 0 };
}

async function main() {
  getRequiredEnv("SUPABASE_URL");
  getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  getRequiredEnv("BRIGHTDATA_API_KEY");
  getRequiredEnv("OPENAI_API_KEY");

  const pageSize = Number(process.env.ENRICH_PAGE_SIZE || "25");

  console.log(`Starting full master alumni enrichment with pageSize=${pageSize}`);
  const linkedinStats = await runLinkedinEnrichment(pageSize);
  console.log("LinkedIn enrichment complete:", linkedinStats);

  const summaryStats = await runSummaryEnrichment(pageSize);
  console.log("Summary enrichment complete:", summaryStats);
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
