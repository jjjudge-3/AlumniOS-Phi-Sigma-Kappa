import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const COMPANY_RELATION = "companies";
const COMPANY_LINK_RELATION = "company_alumni_links";
const ALUMNI_RELATION = "master alumni";
const ANALYSIS_RELATION = "company_recruiting_analysis";
const PAGE_SIZE = Number(process.env.COMPANY_RESEARCH_PAGE_SIZE ?? "5");

type CompanyRow = {
  id: string;
  company_name: string | null;
  company_domain: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;
  company_industry: string | null;
  company_summary: string | null;
  raw_company_json: Record<string, unknown> | null;
};

type AlumniRow = {
  id: string;
  full_name: string | null;
  job_title: string | null;
  job_function: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function stringValue(record: Record<string, unknown> | null, ...keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function topValues(values: Array<string | null | undefined>, limit = 5) {
  const counts = new Map<string, number>();
  for (const value of values) {
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function buildCompanyContext(company: CompanyRow, alumni: AlumniRow[]) {
  const topTitles = topValues(alumni.map((row) => row.job_title));
  const topFunctions = topValues(alumni.map((row) => row.job_function));
  const alumniContacts = alumni
    .filter((row) => row.full_name)
    .slice(0, 8)
    .map((row) => ({
      fullName: row.full_name,
      jobTitle: row.job_title,
      jobFunction: row.job_function,
    }));

  return {
    companyName: company.company_name,
    companyDomain: company.company_domain,
    companyWebsite: normalizeUrl(company.company_website ?? company.company_domain),
    companyLinkedinUrl: normalizeUrl(company.company_linkedin_url),
    companyIndustry: company.company_industry,
    companySummary: company.company_summary,
    alumniCount: alumni.length,
    topTitles,
    topFunctions,
    alumniContacts,
    rawCompanyJsonExcerpt: company.raw_company_json
      ? {
          description:
            stringValue(company.raw_company_json, "description", "about", "summary", "tagline") ?? null,
          headquarters:
            stringValue(company.raw_company_json, "headquarters", "headquarter", "hq", "location") ?? null,
          companyType: stringValue(company.raw_company_json, "type", "company_type") ?? null,
        }
      : null,
  };
}

function recruitingSchema() {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      internship_program_exists: { type: "string" },
      entry_level_hiring_exists: { type: "string" },
      likely_recruiting_window: { type: "string" },
      recruiting_cycle_confidence: { type: "string" },
      recruiting_cycle_reason: { type: "string" },
      best_time_to_apply: { type: "string" },
      hiring_intensity: { type: "string" },
      entry_level_friendliness: { type: "string" },
      common_roles_hired: {
        type: "array",
        items: { type: "string" },
      },
      popular_internship_positions: {
        type: "array",
        items: { type: "string" },
      },
      likely_internship_locations: {
        type: "array",
        items: { type: "string" },
      },
      job_alert_link: { type: "string" },
      job_alert_note: { type: "string" },
      recommended_alumni_contacts: {
        type: "array",
        items: { type: "string" },
      },
      job_market_signal: { type: "string" },
      analysis_summary: { type: "string" },
    },
    required: [
      "internship_program_exists",
      "entry_level_hiring_exists",
      "likely_recruiting_window",
      "recruiting_cycle_confidence",
      "recruiting_cycle_reason",
      "best_time_to_apply",
      "hiring_intensity",
      "entry_level_friendliness",
      "common_roles_hired",
      "popular_internship_positions",
      "likely_internship_locations",
      "job_alert_link",
      "job_alert_note",
      "recommended_alumni_contacts",
      "job_market_signal",
      "analysis_summary",
    ],
  };
}

function extractOutputText(response: Record<string, unknown>) {
  const output = Array.isArray(response.output) ? response.output : [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    if ((item as Record<string, unknown>).type !== "message") continue;
    const content = Array.isArray((item as Record<string, unknown>).content)
      ? ((item as Record<string, unknown>).content as Array<Record<string, unknown>>)
      : [];

    for (const block of content) {
      if (block.type === "output_text" && typeof block.text === "string") {
        return block.text;
      }
    }
  }

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return null;
}

function extractSources(response: Record<string, unknown>) {
  const output = Array.isArray(response.output) ? response.output : [];
  const sources: Array<Record<string, unknown>> = [];

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    if ((item as Record<string, unknown>).type !== "web_search_call") continue;
    const action = (item as Record<string, unknown>).action;
    if (!action || typeof action !== "object") continue;
    const actionSources = Array.isArray((action as Record<string, unknown>).sources)
      ? ((action as Record<string, unknown>).sources as Array<Record<string, unknown>>)
      : [];
    sources.push(...actionSources);
  }

  return sources;
}

async function runOpenAIWebResearch(input: Record<string, unknown>) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredEnv("OPENAI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_COMPANY_RESEARCH_MODEL ?? "gpt-4.1-mini",
      tools: [
        {
          type: "web_search",
          user_location: {
            type: "approximate",
            country: "US",
            city: "Boston",
            region: "Massachusetts",
            timezone: "America/New_York",
          },
        },
      ],
      tool_choice: "auto",
      include: ["web_search_call.action.sources"],
      text: {
        format: {
          type: "json_schema",
          name: "company_recruiting_analysis",
          schema: recruitingSchema(),
          strict: true,
        },
      },
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You are generating recruiting intelligence for fraternity members looking for internships and entry-level roles. Use web search. Be conservative, cite only what you can support from public sources, and explicitly infer recruiting cycles only when signals justify it. Industry should focus on roles hired, not the employer's sector alone. If you can find an official job alert, talent community, or careers notification signup page from the company, include that link. If you cannot, set job_alert_link to an empty string and explain that in job_alert_note. For likely_internship_locations, list the most likely internship locations. If no primary location is clear, return an empty array and reflect that uncertainty in the analysis summary or note.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this company for internship and entry-level recruiting. Return structured JSON only.\n\n" +
                JSON.stringify(input, null, 2),
            },
          ],
        },
      ],
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`OpenAI recruiting analysis failed (${response.status}): ${text}`);
  }

  return JSON.parse(text) as Record<string, unknown>;
}

async function main() {
  getRequiredEnv("SUPABASE_URL");
  getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  getRequiredEnv("OPENAI_API_KEY");

  const supabase = createSupabaseAdminClient();
  const onlyIds = process.env.COMPANY_RESEARCH_ONLY_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  const forceOnlyIds = process.env.COMPANY_RESEARCH_FORCE_ONLY_IDS === "true";
  const forceAll = process.env.COMPANY_RESEARCH_FORCE_ALL === "true";

  const [{ data: companies, error: companiesError }, { data: existingAnalysis, error: analysisError }] = await Promise.all([
    supabase
      .from(COMPANY_RELATION)
      .select("id, company_name, company_domain, company_website, company_linkedin_url, company_industry, company_summary, raw_company_json")
      .not("company_name", "is", null)
      .order("alumni_count", { ascending: false })
      .limit(1000),
    supabase.from(ANALYSIS_RELATION).select("company_id"),
  ]);

  if (companiesError) {
    throw new Error(`Failed to load companies: ${companiesError.message}`);
  }

  if (analysisError) {
    throw new Error(`Failed to load recruiting analysis rows: ${analysisError.message}`);
  }

  const existingIds = new Set((existingAnalysis ?? []).map((row) => String(row.company_id)));
  const candidates = ((companies ?? []) as CompanyRow[])
    .filter((company) => {
      const companyIsEnriched = Boolean(
        company.company_linkedin_url &&
          company.company_linkedin_url.trim() &&
          company.raw_company_json,
      );

      if (!companyIsEnriched) return false;

      if (forceAll) return true;
      if (onlyIds.length > 0) {
        if (!onlyIds.includes(company.id)) return false;
        return forceOnlyIds ? true : !existingIds.has(company.id);
      }
      return !existingIds.has(company.id);
    })
    .slice(0, PAGE_SIZE);

  if (candidates.length === 0) {
    console.log("No company recruiting analysis candidates remain for this run.");
    return;
  }

  const companyIds = candidates.map((company) => company.id);
  const [{ data: links, error: linksError }, { data: alumniRows, error: alumniError }] = await Promise.all([
    supabase.from(COMPANY_LINK_RELATION).select("company_id, alumni_id").in("company_id", companyIds),
    supabase.from(ALUMNI_RELATION).select("id, full_name, job_title, job_function"),
  ]);

  if (linksError) {
    throw new Error(`Failed to load company alumni links: ${linksError.message}`);
  }

  if (alumniError) {
    throw new Error(`Failed to load alumni rows: ${alumniError.message}`);
  }

  const alumniById = new Map(((alumniRows ?? []) as AlumniRow[]).map((row) => [row.id, row]));
  const alumniIdsByCompany = new Map<string, string[]>();
  for (const link of links ?? []) {
    const companyId = String(link.company_id);
    const alumniId = String(link.alumni_id);
    alumniIdsByCompany.set(companyId, [...(alumniIdsByCompany.get(companyId) ?? []), alumniId]);
  }

  let completed = 0;
  let failed = 0;

  for (const company of candidates) {
    try {
      const linkedAlumni = (alumniIdsByCompany.get(company.id) ?? [])
        .map((id) => alumniById.get(id))
        .filter(Boolean) as AlumniRow[];
      const context = buildCompanyContext(company, linkedAlumni);
      const response = await runOpenAIWebResearch(context);
      const outputText = extractOutputText(response);

      if (!outputText) {
        throw new Error("OpenAI recruiting analysis returned no text output");
      }

      const parsed = JSON.parse(outputText) as Record<string, unknown>;
      const sources = extractSources(response);

      const { error: upsertError } = await supabase.from(ANALYSIS_RELATION).upsert(
        {
          company_id: company.id,
          internship_program_exists: parsed.internship_program_exists ?? null,
          entry_level_hiring_exists: parsed.entry_level_hiring_exists ?? null,
          likely_recruiting_window: parsed.likely_recruiting_window ?? null,
          recruiting_cycle_confidence: parsed.recruiting_cycle_confidence ?? null,
          recruiting_cycle_reason: parsed.recruiting_cycle_reason ?? null,
          best_time_to_apply: parsed.best_time_to_apply ?? null,
          hiring_intensity: parsed.hiring_intensity ?? null,
          entry_level_friendliness: parsed.entry_level_friendliness ?? null,
          common_roles_hired: Array.isArray(parsed.common_roles_hired) ? parsed.common_roles_hired : [],
          recommended_alumni_contacts: Array.isArray(parsed.recommended_alumni_contacts)
            ? parsed.recommended_alumni_contacts
            : [],
          job_market_signal: parsed.job_market_signal ?? null,
          analysis_summary: parsed.analysis_summary ?? null,
          cited_sources: sources,
          raw_analysis_json: {
            parsed,
            response,
          },
          last_analyzed_at: new Date().toISOString(),
        },
        { onConflict: "company_id" },
      );

      if (upsertError) {
        throw new Error(upsertError.message);
      }

      completed += 1;
      console.log(`[recruiting] completed ${completed}/${candidates.length} :: ${company.company_name ?? company.id}`);
    } catch (error) {
      failed += 1;
      console.error(
        `[recruiting] failed ${company.company_name ?? company.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(JSON.stringify({ companiesInRun: candidates.length, completed, failed }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
