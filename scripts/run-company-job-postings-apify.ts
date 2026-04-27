import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const COMPANY_RELATION = "companies";
const JOB_POSTINGS_RELATION = "company_job_postings";
const PAGE_SIZE = Number(process.env.APIFY_COMPANY_JOBS_PAGE_SIZE ?? "10");
const APIFY_BASE_URL = "https://api.apify.com/v2";
const APIFY_SOURCE = "apify";

type CompanyRow = {
  id: string;
  company_name: string | null;
  company_domain: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;
};

type ActorRunResponse = {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

type ExtractedJob = {
  company_id?: string;
  company_name?: string;
  companyName?: string;
  title?: string;
  description?: string;
  location?: string;
  companyLocation?: string;
  employment_type?: string;
  employmentType?: string;
  experience_level?: string;
  experienceLevel?: string;
  salary_range?: string;
  salary?: string;
  department?: string;
  jobFunction?: string;
  requirements?: string[];
  benefits?: string[];
  source_url?: string;
  sourceUrl?: string;
  application_url?: string;
  applyUrl?: string;
  posted_at?: string;
  listedAt?: string;
  workplace_type?: string;
  company?: string;
  url?: string;
  criteria?: Array<{ title?: string; value?: string }>;
  confidence?: number;
  relevance?: string;
  ats_system?: string;
  extracted_at?: string;
  id?: string;
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

function slugify(value: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function inferBooleanFromText(text: string | null, checks: RegExp[]) {
  if (!text) return false;
  return checks.some((pattern) => pattern.test(text));
}

function safeJsonParse<T>(value: string | undefined, fallback: T) {
  if (!value) return fallback;

  try {
    return JSON.parse(value) as T;
  } catch {
    throw new Error(`Failed to parse JSON env value: ${value}`);
  }
}

function buildActorInput(companies: CompanyRow[]) {
  const keywords = safeJsonParse<string[]>(
    process.env.APIFY_LINKEDIN_JOB_KEYWORDS,
    ["intern", "internship", "new grad", "entry level", "analyst", "associate"],
  );

  return {
    keywords,
    companyNames: companies.map((company) => company.company_name ?? company.company_domain ?? company.id),
    location: process.env.APIFY_LINKEDIN_JOB_LOCATION ?? "United States",
    timeRange: process.env.APIFY_LINKEDIN_JOB_TIME_RANGE ?? "r2592000",
    maxItems: Number(process.env.APIFY_LINKEDIN_JOB_MAX_ITEMS ?? "250"),
    minDelay: Number(process.env.APIFY_LINKEDIN_JOB_MIN_DELAY ?? "5"),
    maxDelay: Number(process.env.APIFY_LINKEDIN_JOB_MAX_DELAY ?? "10"),
    maxConcurrency: Number(process.env.APIFY_LINKEDIN_JOB_MAX_CONCURRENCY ?? "2"),
    minConcurrency: Number(process.env.APIFY_LINKEDIN_JOB_MIN_CONCURRENCY ?? "1"),
    maxRequestRetries: Number(process.env.APIFY_LINKEDIN_JOB_MAX_RETRIES ?? "8"),
    proxy: {
      useApifyProxy: true,
      apifyProxyGroups: ["RESIDENTIAL"],
    },
  };
}

async function runActor(actorId: string, input: Record<string, unknown>) {
  const token = getRequiredEnv("APIFY_API_TOKEN");
  const waitSecs = Number(process.env.APIFY_WAIT_FOR_FINISH_SECS ?? "300");
  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${encodeURIComponent(actorId)}/runs?waitForFinish=${waitSecs}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    },
  );

  const payloadText = await response.text();

  if (!response.ok) {
    throw new Error(`Apify actor run failed (${response.status}): ${payloadText}`);
  }

  return JSON.parse(payloadText) as ActorRunResponse;
}

async function fetchDatasetItems(datasetId: string) {
  const token = getRequiredEnv("APIFY_API_TOKEN");
  const response = await fetch(
    `${APIFY_BASE_URL}/datasets/${encodeURIComponent(datasetId)}/items?format=json&clean=true`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const payloadText = await response.text();

  if (!response.ok) {
    throw new Error(`Apify dataset fetch failed (${response.status}): ${payloadText}`);
  }

  const parsed = JSON.parse(payloadText) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error("Apify dataset response was not an array");
  }

  return parsed.filter((item): item is ExtractedJob => !!item && typeof item === "object" && !Array.isArray(item));
}

function normalizePosting(job: ExtractedJob) {
  const title = job.title?.trim() ?? null;
  const sourceUrl = job.source_url?.trim() ?? job.sourceUrl?.trim() ?? job.url?.trim() ?? null;
  const applicationUrl = job.application_url?.trim() ?? job.applyUrl?.trim() ?? null;
  const criteria = Array.isArray(job.criteria) ? job.criteria : [];
  const criteriaValue = (label: string) =>
    criteria.find((item) => item.title?.toLowerCase() === label.toLowerCase())?.value?.trim() ?? null;
  const employmentType = job.employment_type?.trim() ?? job.employmentType?.trim() ?? criteriaValue("Employment type");
  const experienceLevel = job.experience_level?.trim() ?? job.experienceLevel?.trim() ?? criteriaValue("Seniority level");
  const location = job.location?.trim() ?? job.companyLocation?.trim() ?? null;
  const description = job.description?.trim() ?? null;
  const department = job.department?.trim() ?? job.jobFunction?.trim() ?? criteriaValue("Job function");
  const salaryRange = job.salary_range?.trim() ?? job.salary?.trim() ?? null;

  const combinedText = [title, employmentType, experienceLevel, description].filter(Boolean).join(" ");
  const isInternship =
    inferBooleanFromText(combinedText, [/intern/i, /internship/i, /\bco-op\b/i]) ||
    /intern/i.test(employmentType ?? "");
  const isNewGrad = inferBooleanFromText(combinedText, [/new grad/i, /graduate/i, /campus/i, /entry level/i]);
  const isEntryLevel =
    isInternship ||
    isNewGrad ||
    inferBooleanFromText(combinedText, [/\bjunior\b/i, /\banalyst\b/i, /\bassociate\b/i, /\bcoordinator\b/i]);

  const sourceJobId =
    sourceUrl ??
    applicationUrl ??
    slugify(`${job.company_id}-${title ?? "job"}-${location ?? ""}-${job.posted_at ?? ""}`);

  return {
    title,
    description,
    department,
    location,
    employmentType,
    seniorityLevel: experienceLevel,
    isInternship,
    isEntryLevel,
    isNewGrad,
    applyUrl: applicationUrl,
    postingUrl: sourceUrl,
    sourceJobId,
    postedAt: job.posted_at ?? null,
    companyName: job.company_name?.trim() ?? job.companyName?.trim() ?? job.company?.trim() ?? null,
    workplaceType: job.workplace_type ?? null,
    confidence: typeof job.confidence === "number" ? job.confidence : null,
    salaryRange,
    benefits: Array.isArray(job.benefits) ? job.benefits : null,
    requirements: Array.isArray(job.requirements) ? job.requirements : null,
    relevance: job.relevance ?? null,
    atsSystem: job.ats_system ?? null,
  };
}

async function main() {
  getRequiredEnv("SUPABASE_URL");
  getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  const actorId = getRequiredEnv("APIFY_COMPANY_JOBS_ACTOR_ID");
  getRequiredEnv("APIFY_API_TOKEN");

  const onlyIds = process.env.APIFY_COMPANY_ONLY_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  const forceOnlyIds = process.env.APIFY_FORCE_COMPANY_ONLY_IDS === "true";
  const supabase = createSupabaseAdminClient();

  const [{ data: companies, error: companiesError }, { data: existingRows, error: existingError }] = await Promise.all([
    supabase
      .from(COMPANY_RELATION)
      .select("id, company_name, company_domain, company_website, company_linkedin_url")
      .order("alumni_count", { ascending: false })
      .limit(1000),
    supabase.from(JOB_POSTINGS_RELATION).select("company_id"),
  ]);

  if (companiesError) {
    throw new Error(`Failed to load companies: ${companiesError.message}`);
  }

  if (existingError) {
    throw new Error(`Failed to load existing job postings: ${existingError.message}`);
  }

  const alreadyProcessedIds = new Set((existingRows ?? []).map((row) => String(row.company_id)));
  const candidates = ((companies ?? []) as CompanyRow[])
    .filter((company) => {
      if (onlyIds.length > 0) {
        if (!onlyIds.includes(company.id)) return false;
        return forceOnlyIds ? !!(company.company_website || company.company_domain || company.company_name) : !alreadyProcessedIds.has(company.id);
      }
      const hasSeed = company.company_website || company.company_domain;
      return hasSeed && !alreadyProcessedIds.has(company.id);
    })
    .slice(0, PAGE_SIZE);

  if (candidates.length === 0) {
    console.log("No company job posting candidates remain for this run.");
    return;
  }

  const actorInput = buildActorInput(candidates);
  const run = await runActor(actorId, actorInput);
  const datasetId = run.data?.defaultDatasetId;

  if (!datasetId) {
    throw new Error("Apify run did not return a defaultDatasetId");
  }

  const items = await fetchDatasetItems(datasetId);
  const companyById = new Map(candidates.map((company) => [company.id, company]));
  const companyByName = new Map(
    candidates.map((company) => [(company.company_name ?? company.company_domain ?? company.id).toLowerCase(), company]),
  );
  const postings = items
    .map((item) => {
      const normalized = normalizePosting(item);
      if (!normalized.title) return null;
      const matchedCompany =
        (item.company_id ? companyById.get(String(item.company_id)) : undefined) ??
        (normalized.companyName ? companyByName.get(normalized.companyName.toLowerCase()) : undefined);

      if (!matchedCompany) return null;

      return {
        company_id: matchedCompany.id,
        title: normalized.title,
        department: normalized.department,
        location: normalized.location,
        employment_type: normalized.employmentType,
        seniority_level: normalized.seniorityLevel,
        is_internship: normalized.isInternship,
        is_entry_level: normalized.isEntryLevel,
        is_new_grad: normalized.isNewGrad,
        apply_url: normalized.applyUrl,
        posting_url: normalized.postingUrl,
        source: APIFY_SOURCE,
        source_job_id: normalized.sourceJobId,
        posted_at: normalized.postedAt,
        last_seen_at: new Date().toISOString(),
        status: "active",
        raw_job_json: item,
        normalized_job_json: normalized,
      };
    })
    .filter(Boolean);

  if (postings.length > 0) {
    const { error: insertError } = await supabase
      .from(JOB_POSTINGS_RELATION)
      .upsert(postings, { onConflict: "company_id,source,source_job_id" });

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  console.log(
    JSON.stringify({
      companiesInRun: candidates.length,
      datasetItems: items.length,
      storedPostings: postings.length,
      actorId,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
