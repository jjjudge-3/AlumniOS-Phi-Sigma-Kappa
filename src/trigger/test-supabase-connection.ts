import { logger, task } from "@trigger.dev/sdk/v3";
import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const ALUMNI_RELATION_CANDIDATES = ["master alumni", "alumni"] as const;

type AlumniSampleRow = {
  id: string | number | null;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  job_title?: string | null;
  linkedin_url?: string | null;
  created_at?: string | null;
};

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

function getLinkedinUrlFromAlumniRow(row: Record<string, unknown>) {
  const candidates = [
    row["Final LinkedIn URL"],
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

function getFullNameFromAlumniRow(row: Record<string, unknown>) {
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

async function fetchBrightDataProfileJson(linkedinUrl: string) {
  const response = await fetch(
    "https://api.brightdata.com/datasets/v3/scrape?dataset_id=gd_l1viktl72bvl7bjuj0&include_errors=true",
    {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.BRIGHTDATA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
        input: [
          {
            url: linkedinUrl,
          },
        ],
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

async function generateOpenAIProfileSummary(alumnus: Record<string, unknown>) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing required environment variable: OPENAI_API_KEY");
  }

  const rawProfile = alumnus.enriched_person_json;

  if (!rawProfile) {
    throw new Error(`Alumni row ${String(alumnus.id ?? "")} is missing enriched_person_json`);
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
                "You are writing high-quality alumni career profiles for a fraternity alumni networking platform and also normalizing profile data into clean database fields. Use only the supplied LinkedIn JSON and alumni row. Do not hallucinate. Write in polished, specific, chronological prose similar to a professional operator memo. Emphasize career progression, promotions, performance signals, vertical specialization, executive exposure, and why this person would be valuable for a student or alumnus to speak with. If a fact is not supported by the input, leave it out. For industry, choose the single best broad category from this set when possible: Finance, Technology, Healthcare, Consulting, Real Estate, Government, Law, Media, Consumer, Education, Logistics, Energy, Manufacturing, Nonprofit, Sales, Insurance, Human Resources, Hospitality, Sports, Telecommunications, Construction, Transportation, Aerospace & Defense, Venture Capital, Private Equity, Investment Banking, Asset Management, Marketing, Retail, or Professional Services. For sub-industry, be as specific as the profile supports. Good examples include Investment Banking, Private Equity, Venture Capital, Wealth Management, Asset Management, Commercial Banking, Insurance Brokerage, Health Tech, Biotech, Medical Devices, Enterprise SaaS, Cybersecurity, Cloud Infrastructure, Data & AI, FinTech, PropTech, AdTech, MarTech, Management Consulting, Strategy Consulting, Logistics, Supply Chain, Consumer Packaged Goods, E-commerce, Higher Education, Government Contracting, or Legal Services. Also score referral power from 1 to 10 based on likely referral leverage for a student or alumnus, using title seniority, company influence, career performance, and likely internal credibility. Include a concise reason grounded in the profile facts.",
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
              profileSummary: {
                type: "string",
              },
              confidence: {
                type: "string",
                enum: ["high", "medium", "low"],
              },
              currentTitle: {
                type: ["string", "null"],
              },
              currentCompany: {
                type: ["string", "null"],
              },
              location: {
                type: ["string", "null"],
              },
              locationCity: {
                type: ["string", "null"],
              },
              locationState: {
                type: ["string", "null"],
              },
              education: {
                type: ["string", "null"],
              },
              broadIndustry: {
                type: ["string", "null"],
              },
              subIndustry: {
                type: ["string", "null"],
              },
              jobFunction: {
                type: ["string", "null"],
              },
              companyLinkedinUrl: {
                type: ["string", "null"],
              },
              companyWebsite: {
                type: ["string", "null"],
              },
              referralPowerScore: {
                type: ["number", "null"],
              },
              referralPowerReason: {
                type: ["string", "null"],
              },
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

  const outputText = parsed.output_text;
  if (typeof outputText !== "string" || !outputText.trim()) {
    throw new Error("OpenAI profile summary response did not include output_text");
  }

  try {
    return JSON.parse(outputText) as OpenAIProfileSummaryResponse;
  } catch {
    throw new Error("OpenAI profile summary output_text was not valid JSON");
  }
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

async function getReadableAlumniRelation() {
  const supabase = createSupabaseAdminClient();

  for (const relation of ALUMNI_RELATION_CANDIDATES) {
    const { error } = await supabase.from(relation).select("id").limit(1);

    if (!error) {
      return relation;
    }

    if (error.code !== "PGRST205" && !error.message.includes("does not exist")) {
      throw new Error(`Supabase alumni relation check failed for ${relation}: ${error.message}`);
    }
  }

  throw new Error(`No readable alumni relation found. Tried: ${ALUMNI_RELATION_CANDIDATES.join(", ")}`);
}

async function fetchAlumnusRowById(alumniId: string) {
  const supabase = createSupabaseAdminClient();
  const relation = await getReadableAlumniRelation();
  const { data, error } = await supabase
    .from(relation)
    .select("*")
    .eq("id", alumniId)
    .maybeSingle();

  if (error) {
    throw new Error(`Supabase alumni lookup failed: ${error.message}`);
  }

  if (!data) {
    throw new Error(`No alumni row found for alumniId: ${alumniId}`);
  }

  return { relation, data: data as Record<string, unknown> };
}

async function updateRawLinkedinJson(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  relation: string,
  alumniId: string,
  profileJson: BrightDataProfileResponse,
) {
  const { error } = await supabase
    .from(relation)
    .update({
      enriched_person_json: profileJson,
    })
    .eq("id", alumniId);

  if (error) {
    throw new Error(`Supabase alumni update failed: ${error.message}`);
  }
}

async function updateNormalizedSummary(
  supabase: ReturnType<typeof createSupabaseAdminClient>,
  relation: string,
  alumniId: string,
  row: Record<string, unknown>,
  summary: OpenAIProfileSummaryResponse,
) {
  const { error } = await supabase
    .from(relation)
    .update({
      linkedin_url: getLinkedinUrlFromAlumniRow(row),
      full_name: getFullNameFromAlumniRow(row),
      first_name: typeof row["First Name"] === "string" ? row["First Name"] : null,
      last_name: typeof row["Last Name"] === "string" ? row["Last Name"] : null,
      college: typeof row.College === "string" ? row.College : null,
      all_years_on_composite:
        typeof row["All Composite Years"] === "string" ? row["All Composite Years"] : null,
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
    .eq("id", alumniId);

  if (error) {
    throw new Error(`Supabase alumni summary update failed: ${error.message}`);
  }
}

export const testSupabaseConnection = task({
  id: "test-supabase-connection",
  maxDuration: 300,
  run: async () => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabase = createSupabaseAdminClient();
    const relation = await getReadableAlumniRelation();
    const { data, error, count } = await supabase
      .from(relation)
      .select("*", { count: "exact" })
      .limit(5);

    if (error) {
      throw new Error(`Supabase alumni query failed: ${error.message}`);
    }

    const rows = (data ?? []) as AlumniSampleRow[];

    logger.log("Supabase alumni connection test succeeded", {
      count: count ?? rows.length,
      sampleRows: rows,
      relation,
    });

    return {
      count: count ?? rows.length,
      sampleRows: rows,
      relation,
    };
  },
});

export const fetchAlumnusById = task({
  id: "fetch-alumnus-by-id",
  maxDuration: 300,
  run: async (payload: { alumniId?: string }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    const alumniId = payload?.alumniId?.trim();

    if (!alumniId) {
      throw new Error("Missing required payload field: alumniId");
    }

    const { relation, data } = await fetchAlumnusRowById(alumniId);

    logger.log("Fetched alumnus from Supabase", {
      alumniId,
      alumnus: data,
      relation,
    });

    return {
      alumniId,
      alumnus: data,
      relation,
    };
  },
});

export const fetchLinkedinProfileJson = task({
  id: "fetch-linkedin-profile-json",
  maxDuration: 300,
  run: async (payload: { alumniId?: string }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!process.env.BRIGHTDATA_API_KEY) {
      throw new Error("Missing required environment variable: BRIGHTDATA_API_KEY");
    }

    const alumniId = payload?.alumniId?.trim();

    if (!alumniId) {
      throw new Error("Missing required payload field: alumniId");
    }

    const { relation, data } = await fetchAlumnusRowById(alumniId);

    const linkedinUrl = getLinkedinUrlFromAlumniRow(data as Record<string, unknown>);

    if (!linkedinUrl) {
      throw new Error(`Alumni row ${alumniId} is missing Final LinkedIn URL/linkedin_url`);
    }

    const profileJson = await fetchBrightDataProfileJson(linkedinUrl);

    logger.log("Fetched LinkedIn profile JSON from Bright Data", {
      alumniId,
      linkedinUrl,
      brightDataResponseType: Array.isArray(profileJson) ? "array" : "object",
      relation,
    });

    return {
      alumniId,
      linkedinUrl,
      profileJson,
      relation,
    };
  },
});

export const batchFetchLinkedinProfileJson = task({
  id: "batch-fetch-linkedin-profile-json",
  maxDuration: 3600,
  run: async (payload: { batchSize?: number; skipAlreadyEnriched?: boolean }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!process.env.BRIGHTDATA_API_KEY) {
      throw new Error("Missing required environment variable: BRIGHTDATA_API_KEY");
    }

    const batchSize = Math.min(Math.max(payload?.batchSize ?? 20, 1), 20);
    const supabase = createSupabaseAdminClient();
    const relation = await getReadableAlumniRelation();
    const skipAlreadyEnriched = payload?.skipAlreadyEnriched ?? true;

    const results: Array<{
      alumniId: string;
      fullName: string;
      linkedinUrl: string;
      status: "completed" | "failed";
      error?: string;
    }> = [];

    let offset = 0;
    let pagesScanned = 0;

    while (true) {
      const { data, error } = await supabase
        .from(relation)
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw new Error(`Supabase alumni batch query failed: ${error.message}`);
      }

      const pageRows = (data ?? []) as Record<string, unknown>[];
      if (!pageRows.length) {
        break;
      }

      pagesScanned += 1;

      const candidateRows = pageRows
        .map((row) => ({
          row,
          alumniId: String(row.id ?? ""),
          linkedinUrl: getLinkedinUrlFromAlumniRow(row),
          fullName: getFullNameFromAlumniRow(row),
          alreadyEnriched: Boolean(row.enriched_person_json),
        }))
        .filter((item) => item.alumniId && item.linkedinUrl)
        .filter((item) => (skipAlreadyEnriched ? !item.alreadyEnriched : true));

      for (const item of candidateRows) {
        try {
          const profileJson = await fetchBrightDataProfileJson(item.linkedinUrl!);
          await updateRawLinkedinJson(supabase, relation, item.alumniId, profileJson);

          logger.log("Saved Bright Data LinkedIn profile JSON to public alumni row", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            linkedinUrl: item.linkedinUrl,
            relation,
          });

          results.push({
            alumniId: item.alumniId,
            fullName: item.fullName,
            linkedinUrl: item.linkedinUrl!,
            status: "completed",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown batch processing error";

          logger.error("Failed to fetch/save Bright Data LinkedIn profile JSON", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            linkedinUrl: item.linkedinUrl,
            error: message,
            relation,
          });

          results.push({
            alumniId: item.alumniId,
            fullName: item.fullName,
            linkedinUrl: item.linkedinUrl!,
            status: "failed",
            error: message,
          });
        }
      }

      offset += batchSize;
    }

    const completed = results.filter((item) => item.status === "completed").length;
    const failed = results.filter((item) => item.status === "failed").length;

    return {
      relation,
      batchSize,
      skipAlreadyEnriched,
      pagesScanned,
      processed: results.length,
      completed,
      failed,
      results,
    };
  },
});

export const summarizeAlumnusProfile = task({
  id: "summarize-alumnus-profile",
  maxDuration: 300,
  run: async (payload: { alumniId?: string }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY");
    }

    const alumniId = payload?.alumniId?.trim();
    if (!alumniId) {
      throw new Error("Missing required payload field: alumniId");
    }

    const supabase = createSupabaseAdminClient();
    const { relation, data } = await fetchAlumnusRowById(alumniId);
    const summary = await generateOpenAIProfileSummary(data);
    await updateNormalizedSummary(supabase, relation, alumniId, data, summary);

    logger.log("Saved alumni profile summary", {
      alumniId,
      relation,
      confidence: summary.confidence,
    });

    return {
      alumniId,
      relation,
      summary,
    };
  },
});

export const batchSummarizeAlumniProfiles = task({
  id: "batch-summarize-alumni-profiles",
  maxDuration: 3600,
  run: async (payload: { batchSize?: number; skipExistingSummary?: boolean }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY");
    }

    const batchSize = Math.min(Math.max(payload?.batchSize ?? 20, 1), 20);
    const skipExistingSummary = payload?.skipExistingSummary ?? true;
    const relation = await getReadableAlumniRelation();
    const supabase = createSupabaseAdminClient();
    const results: Array<{
      alumniId: string;
      fullName: string;
      status: "completed" | "failed";
      error?: string;
    }> = [];

    let offset = 0;
    let pagesScanned = 0;

    while (results.length < batchSize) {
      const { data, error } = await supabase
        .from(relation)
        .select("*")
        .range(offset, offset + batchSize - 1);

      if (error) {
        throw new Error(`Supabase alumni summary batch query failed: ${error.message}`);
      }

      const pageRows = (data ?? []) as Record<string, unknown>[];
      if (!pageRows.length) {
        break;
      }

      pagesScanned += 1;

      const candidateRows = pageRows
        .map((row) => ({
          row,
          alumniId: String(row.id ?? ""),
          fullName: getFullNameFromAlumniRow(row),
          hasRawProfile: Boolean(row.enriched_person_json),
          hasSummary: typeof row.profile_summary === "string" && row.profile_summary.trim().length > 0,
        }))
        .filter((item) => item.alumniId && item.hasRawProfile)
        .filter((item) => (skipExistingSummary ? !item.hasSummary : true));

      for (const item of candidateRows) {
        if (results.length >= batchSize) break;

        try {
          const summary = await generateOpenAIProfileSummary(item.row);
          await updateNormalizedSummary(supabase, relation, item.alumniId, item.row, summary);

          logger.log("Saved OpenAI alumni profile summary", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            relation,
            confidence: summary.confidence,
          });

          results.push({
            alumniId: item.alumniId,
            fullName: item.fullName,
            status: "completed",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown alumni summary batch error";

          logger.error("Failed to create/save alumni profile summary", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            relation,
            error: message,
          });

          results.push({
            alumniId: item.alumniId,
            fullName: item.fullName,
            status: "failed",
            error: message,
          });
        }
      }

      offset += batchSize;
    }

    return {
      relation,
      batchSize,
      skipExistingSummary,
      pagesScanned,
      processed: results.length,
      completed: results.filter((item) => item.status === "completed").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
    };
  },
});

export const enrichAllMasterAlumniLinkedinProfiles = task({
  id: "enrich-all-master-alumni-linkedin-profiles",
  maxDuration: 36000,
  run: async (payload: { pageSize?: number; skipAlreadyEnriched?: boolean }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!process.env.BRIGHTDATA_API_KEY) {
      throw new Error("Missing required environment variable: BRIGHTDATA_API_KEY");
    }

    const pageSize = Math.min(Math.max(payload?.pageSize ?? 20, 1), 50);
    const skipAlreadyEnriched = payload?.skipAlreadyEnriched ?? true;
    const relation = await getReadableAlumniRelation();
    const supabase = createSupabaseAdminClient();

    let offset = 0;
    let pagesScanned = 0;
    let processed = 0;
    let completed = 0;
    let failed = 0;
    const failures: Array<{ alumniId: string; fullName: string; error: string }> = [];

    while (true) {
      const { data, error } = await supabase
        .from(relation)
        .select("*")
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Supabase alumni full enrichment query failed: ${error.message}`);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) break;

      pagesScanned += 1;

      const candidates = rows
        .map((row) => ({
          row,
          alumniId: String(row.id ?? ""),
          linkedinUrl: getLinkedinUrlFromAlumniRow(row),
          fullName: getFullNameFromAlumniRow(row),
          alreadyEnriched: Boolean(row.enriched_person_json),
        }))
        .filter((item) => item.alumniId && item.linkedinUrl)
        .filter((item) => (skipAlreadyEnriched ? !item.alreadyEnriched : true));

      for (const item of candidates) {
        processed += 1;

        try {
          const profileJson = await fetchBrightDataProfileJson(item.linkedinUrl!);
          await updateRawLinkedinJson(supabase, relation, item.alumniId, profileJson);
          completed += 1;

          logger.log("Saved Bright Data LinkedIn profile JSON to master alumni row", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            relation,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown full enrichment error";
          failed += 1;
          failures.push({
            alumniId: item.alumniId,
            fullName: item.fullName,
            error: message,
          });

          logger.error("Failed to enrich master alumni LinkedIn profile", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            relation,
            error: message,
          });
        }
      }

      offset += pageSize;
    }

    return {
      relation,
      pageSize,
      skipAlreadyEnriched,
      pagesScanned,
      processed,
      completed,
      failed,
      failures: failures.slice(0, 100),
    };
  },
});

export const summarizeAllMasterAlumniProfiles = task({
  id: "summarize-all-master-alumni-profiles",
  maxDuration: 36000,
  run: async (payload: { pageSize?: number; skipExistingSummary?: boolean }) => {
    if (!process.env.SUPABASE_URL) {
      throw new Error("Missing required environment variable: SUPABASE_URL");
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY");
    }

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing required environment variable: OPENAI_API_KEY");
    }

    const pageSize = Math.min(Math.max(payload?.pageSize ?? 20, 1), 50);
    const skipExistingSummary = payload?.skipExistingSummary ?? true;
    const relation = await getReadableAlumniRelation();
    const supabase = createSupabaseAdminClient();

    let offset = 0;
    let pagesScanned = 0;
    let processed = 0;
    let completed = 0;
    let failed = 0;
    const failures: Array<{ alumniId: string; fullName: string; error: string }> = [];

    while (true) {
      const { data, error } = await supabase
        .from(relation)
        .select("*")
        .range(offset, offset + pageSize - 1);

      if (error) {
        throw new Error(`Supabase alumni full summary query failed: ${error.message}`);
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      if (!rows.length) break;

      pagesScanned += 1;

      const candidates = rows
        .map((row) => ({
          row,
          alumniId: String(row.id ?? ""),
          fullName: getFullNameFromAlumniRow(row),
          hasRawProfile: Boolean(row.enriched_person_json),
          hasSummary: typeof row.profile_summary === "string" && row.profile_summary.trim().length > 0,
        }))
        .filter((item) => item.alumniId && item.hasRawProfile)
        .filter((item) => (skipExistingSummary ? !item.hasSummary : true));

      for (const item of candidates) {
        processed += 1;

        try {
          const summary = await generateOpenAIProfileSummary(item.row);
          await updateNormalizedSummary(supabase, relation, item.alumniId, item.row, summary);
          completed += 1;

          logger.log("Saved OpenAI alumni profile summary to master alumni row", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            relation,
            confidence: summary.confidence,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown full summary error";
          failed += 1;
          failures.push({
            alumniId: item.alumniId,
            fullName: item.fullName,
            error: message,
          });

          logger.error("Failed to summarize master alumni profile", {
            alumniId: item.alumniId,
            fullName: item.fullName,
            relation,
            error: message,
          });
        }
      }

      offset += pageSize;
    }

    return {
      relation,
      pageSize,
      skipExistingSummary,
      pagesScanned,
      processed,
      completed,
      failed,
      failures: failures.slice(0, 100),
    };
  },
});
