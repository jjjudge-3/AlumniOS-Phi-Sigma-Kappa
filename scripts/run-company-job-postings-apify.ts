import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const COMPANY_RELATION = "companies";
const JOB_POSTINGS_RELATION = "company_job_postings";
const PAGE_SIZE = Number(process.env.APIFY_COMPANY_JOBS_PAGE_SIZE ?? "3");
const APIFY_BASE_URL = "https://api.apify.com/v2";
const DEFAULT_ACTOR_ID = "agentx/all-jobs-scraper";
const LEGACY_ACTOR_ID = "memo23/apify-linkedin-search-results-scraper";
const APIFY_SOURCE = "apify-all-jobs";
const MIN_RESULTS_PER_QUERY = 10;

type CompanyRow = {
  id: string;
  company_name: string | null;
  company_domain: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;
  raw_company_json?: Record<string, unknown> | null;
};

type ActorRunResponse = {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

type ExtractedJob = {
  id?: string;
  platform?: string;
  platform_url?: string;
  official_url?: string;
  title?: string;
  description?: string;
  location?: string;
  job_type?: string;
  job_level?: string;
  job_function?: string;
  posted_date?: string;
  company_name?: string;
  company_url?: string;
  company_website?: string;
  company_industry?: string;
  company_logo?: string;
  salary_period?: string;
  salary_minimum?: number | null;
  salary_maximum?: number | null;
  salary_currency?: string;
  is_remote?: boolean;
  processed_at?: string;
};

type NormalizedPosting = {
  title: string | null;
  description: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  seniorityLevel: string | null;
  isInternship: boolean;
  isEntryLevel: boolean;
  isNewGrad: boolean;
  applyUrl: string | null;
  postingUrl: string | null;
  sourceJobId: string;
  postedAt: string | null;
  companyName: string | null;
  workplaceType: string | null;
  confidence: number | null;
  salaryRange: string | null;
  benefits: string[] | null;
  requirements: string[] | null;
  relevance: string | null;
  atsSystem: string | null;
};

type QueryPlan = {
  keyword: string;
  variant: string;
};

type PostingRow = {
  company_id: string;
  title: string;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  seniority_level: string | null;
  is_internship: boolean;
  is_entry_level: boolean;
  is_new_grad: boolean;
  apply_url: string | null;
  posting_url: string | null;
  source: string;
  source_job_id: string;
  posted_at: string | null;
  last_seen_at: string;
  status: string;
  raw_job_json: ExtractedJob;
  normalized_job_json: NormalizedPosting;
};

const EXCLUDED_TITLE_PATTERNS = [/\bconference\b/i, /\bsummit\b/i, /\bwebinar\b/i, /\bworkshop\b/i, /\binfo session\b/i];

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
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

function normalizeCompanyName(value: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\b(the|inc|incorporated|llc|l\.l\.c|llp|l\.l\.p|lp|ltd|limited|corp|corporation|co|company|plc)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isCompanyMatch(candidate: string | null, expected: CompanyRow) {
  const normalizedCandidate = normalizeCompanyName(candidate);
  const normalizedExpected = normalizeCompanyName(expected.company_name ?? expected.company_domain ?? expected.id);

  if (!normalizedCandidate || !normalizedExpected) return false;
  if (normalizedCandidate === normalizedExpected) return true;

  const expectedTokens = new Set(normalizedExpected.split(" ").filter(Boolean));
  const candidateTokens = new Set(normalizedCandidate.split(" ").filter(Boolean));

  if (expectedTokens.size === 0 || candidateTokens.size === 0) return false;

  let sharedTokens = 0;
  for (const token of expectedTokens) {
    if (candidateTokens.has(token)) sharedTokens += 1;
  }

  return sharedTokens === expectedTokens.size;
}

function buildQueryPlan(company: CompanyRow) {
  const baseName = company.company_name?.trim() ?? company.company_domain?.trim() ?? company.id;
  const configuredRegions = safeJsonParse<string[]>(
    process.env.APIFY_COMPANY_JOB_REGIONS,
    ["New York", "Boston", "Massachusetts", "Connecticut"],
  )
    .map((value) => value.trim())
    .filter(Boolean);

  const plans: QueryPlan[] = [{ keyword: baseName, variant: "base" }];
  const includeRegionalFallbacks = process.env.APIFY_COMPANY_JOB_USE_REGION_FALLBACKS !== "false";

  if (includeRegionalFallbacks) {
    for (const region of configuredRegions) {
      plans.push({
        keyword: `${baseName} ${region} internship`,
        variant: `region:${region}`,
      });
    }
  }

  return plans;
}

function buildActorInput(keyword: string) {
  return {
    country: process.env.APIFY_JOB_COUNTRY ?? "United States",
    currency: process.env.APIFY_JOB_CURRENCY ?? "USD",
    distance: Number(process.env.APIFY_JOB_DISTANCE ?? "200"),
    job_type: process.env.APIFY_JOB_TYPE ?? "all",
    keyword,
    max_results: Math.max(Number(process.env.APIFY_JOB_MAX_RESULTS ?? "10"), MIN_RESULTS_PER_QUERY),
    posted_since: process.env.APIFY_JOB_POSTED_SINCE ?? "6 months",
    remote_only: process.env.APIFY_JOB_REMOTE_ONLY === "true",
  };
}

function allowedPlatforms() {
  return new Set(
    safeJsonParse<string[]>(
      process.env.APIFY_COMPANY_JOB_ALLOWED_PLATFORMS,
      ["LinkedIn", "Indeed", "Glassdoor", "ZipRecruiter"],
    )
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function resolveActorId() {
  const configured = process.env.APIFY_COMPANY_JOBS_ACTOR_ID?.trim();
  if (!configured || configured === LEGACY_ACTOR_ID) {
    return DEFAULT_ACTOR_ID;
  }
  return configured;
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

function normalizePosting(job: ExtractedJob): NormalizedPosting {
  const title = job.title?.trim() ?? null;
  const sourceUrl = job.platform_url?.trim() ?? null;
  const applicationUrl = job.official_url?.trim() || sourceUrl;
  const employmentType = job.job_type?.trim() ?? null;
  const seniorityLevel = job.job_level?.trim() ?? null;
  const location = job.location?.trim() ?? null;
  const description = job.description?.trim() ?? null;
  const department = job.job_function?.trim() ?? null;
  const salaryRange =
    job.salary_minimum != null || job.salary_maximum != null
      ? [job.salary_currency, job.salary_minimum, job.salary_maximum].filter((value) => value != null).join(" ")
      : null;

  const combinedText = [title, employmentType, seniorityLevel, description].filter(Boolean).join(" ");
  const isInternship = inferBooleanFromText(combinedText, [/\binternship\b/i, /\bintern\b/i, /\bco-op\b/i, /\bco op\b/i]);
  const isNewGrad = inferBooleanFromText(combinedText, [/new grad/i, /graduate/i, /campus/i, /entry level/i]);
  const isEntryLevel =
    isInternship ||
    isNewGrad ||
    inferBooleanFromText(combinedText, [/\bjunior\b/i, /\banalyst\b/i, /\bassociate\b/i, /\bcoordinator\b/i]);

  const companyName = job.company_name?.trim() ?? null;
  const sourceJobId =
    sourceUrl ??
    applicationUrl ??
    slugify(`${companyName ?? "company"}-${title ?? "job"}-${location ?? ""}-${job.posted_date ?? ""}`);

  return {
    title,
    description,
    department,
    location,
    employmentType,
    seniorityLevel,
    isInternship,
    isEntryLevel,
    isNewGrad,
    applyUrl: applicationUrl,
    postingUrl: sourceUrl,
    sourceJobId,
    postedAt: job.posted_date ?? null,
    companyName,
    workplaceType: job.is_remote ? "Remote" : null,
    confidence: null,
    salaryRange,
    benefits: null,
    requirements: null,
    relevance: job.platform ?? null,
    atsSystem: null,
  };
}

async function fetchJobsForCompany(actorId: string, company: CompanyRow) {
  const plans = buildQueryPlan(company);
  const collected = new Map<string, ExtractedJob>();
  const matchedVariants = new Set<string>();
  const platformAllowlist = allowedPlatforms();

  for (const plan of plans) {
    const run = await runActor(actorId, buildActorInput(plan.keyword));
    const datasetId = run.data?.defaultDatasetId;

    if (!datasetId) {
      throw new Error(`Apify run did not return a defaultDatasetId for ${company.company_name ?? company.id}`);
    }

    const items = await fetchDatasetItems(datasetId);
    const matchingItems = items.filter((item) => {
      const normalizedPlatform = item.platform?.trim().toLowerCase() ?? "";
      if (!platformAllowlist.has(normalizedPlatform)) return false;
      if (!isCompanyMatch(item.company_name ?? null, company)) return false;
      if (EXCLUDED_TITLE_PATTERNS.some((pattern) => pattern.test(item.title ?? ""))) return false;
      return true;
    });

    for (const item of matchingItems) {
      const key = item.platform_url?.trim() || item.official_url?.trim() || `${item.company_name}-${item.title}-${item.posted_date}`;
      collected.set(key, item);
    }

    if (matchingItems.some((item) => inferBooleanFromText(item.title ?? item.description ?? null, [/intern/i, /internship/i, /new grad/i, /entry level/i, /analyst/i, /associate/i]))) {
      matchedVariants.add(plan.variant);
      break;
    }

    if (matchingItems.length > 0 && plan.variant === "base") {
      matchedVariants.add(plan.variant);
      continue;
    }
  }

  return {
    items: Array.from(collected.values()),
    variants: Array.from(matchedVariants),
  };
}

async function main() {
  getRequiredEnv("SUPABASE_URL");
  getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  getRequiredEnv("APIFY_API_TOKEN");

  const actorId = resolveActorId();
  const onlyIds = process.env.APIFY_COMPANY_ONLY_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [];
  const forceOnlyIds = process.env.APIFY_FORCE_COMPANY_ONLY_IDS === "true";
  const supabase = createSupabaseAdminClient();

  const [{ data: companies, error: companiesError }, { data: existingRows, error: existingError }] = await Promise.all([
    supabase
      .from(COMPANY_RELATION)
      .select("id, company_name, company_domain, company_website, company_linkedin_url, raw_company_json")
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
      const companyIsEnriched = Boolean(company.company_linkedin_url?.trim() && company.raw_company_json);
      if (!companyIsEnriched) return false;

      if (onlyIds.length > 0) {
        if (!onlyIds.includes(company.id)) return false;
        return forceOnlyIds ? true : !alreadyProcessedIds.has(company.id);
      }

      return !alreadyProcessedIds.has(company.id);
    })
    .slice(0, PAGE_SIZE);

  if (candidates.length === 0) {
    console.log("No company job posting candidates remain for this run.");
    return;
  }

  const postings: PostingRow[] = [];
  const companySummaries: Array<Record<string, unknown>> = [];

  for (const company of candidates) {
    const result = await fetchJobsForCompany(actorId, company);
    const companyPostings = result.items
      .map((item) => {
        const normalized = normalizePosting(item);
        if (!normalized.title) return null;

        return {
          company_id: company.id,
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
      .filter((posting): posting is PostingRow => posting !== null);

    postings.push(...companyPostings);
    companySummaries.push({
      companyId: company.id,
      companyName: company.company_name,
      matchedJobs: companyPostings.length,
      queryVariantsUsed: result.variants,
    });
  }

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
      storedPostings: postings.length,
      actorId,
      companies: companySummaries,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
