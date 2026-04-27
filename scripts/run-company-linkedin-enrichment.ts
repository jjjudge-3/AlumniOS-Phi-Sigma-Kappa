import { createSupabaseAdminClient } from "@/lib/supabase-admin";

const COMPANY_RELATION = "companies";
const COMPANY_DATASET_ID = "gd_l1vikfnt1wgvvqz95w";
const PAGE_SIZE = Number(process.env.COMPANY_ENRICH_PAGE_SIZE ?? "25");

type CompanyRow = {
  id: string;
  company_name: string | null;
  company_domain: string | null;
  company_website: string | null;
  company_linkedin_url: string | null;
  raw_company_json: Record<string, unknown> | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeDomain(value: string | null) {
  if (!value) return null;
  const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? null;
  }
}

async function fetchBrightDataCompanyJson(linkedinUrl: string) {
  const response = await fetch(
    `https://api.brightdata.com/datasets/v3/scrape?dataset_id=${COMPANY_DATASET_ID}&include_errors=true`,
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
    throw new Error(`Bright Data company request failed (${response.status}): ${responseText}`);
  }

  try {
    return JSON.parse(responseText) as Array<Record<string, unknown>> | Record<string, unknown>;
  } catch {
    throw new Error("Bright Data company request returned non-JSON output");
  }
}

function firstCompanyRecord(payload: Array<Record<string, unknown>> | Record<string, unknown>) {
  if (Array.isArray(payload)) {
    return payload[0] ?? null;
  }

  return payload;
}

async function main() {
  getRequiredEnv("SUPABASE_URL");
  getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
  getRequiredEnv("BRIGHTDATA_API_KEY");

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from(COMPANY_RELATION)
    .select("id, company_name, company_domain, company_website, company_linkedin_url, raw_company_json")
    .not("company_linkedin_url", "is", null)
    .order("company_name", { ascending: true })
    .limit(1000);

  if (error) {
    throw new Error(`Failed to load companies: ${error.message}`);
  }

  const allCandidates = ((data ?? []) as CompanyRow[]).filter(
    (company) =>
      company.company_linkedin_url &&
      company.company_linkedin_url.trim() &&
      !company.raw_company_json,
  );

  const companies = allCandidates.slice(0, PAGE_SIZE);

  console.log(`Company enrichment candidates in this run: ${companies.length} of ${allCandidates.length} remaining`);

  let completed = 0;
  let failed = 0;

  for (const company of companies) {
    try {
      const payload = await fetchBrightDataCompanyJson(company.company_linkedin_url!);
      const record = firstCompanyRecord(payload);

      if (!record) {
        throw new Error("Bright Data returned an empty company payload");
      }

      const website =
        (typeof record.website === "string" && record.website.trim() ? record.website.trim() : null) ??
        company.company_website;
      const domain = normalizeDomain(website) ?? company.company_domain;
      const industries = record.industries;
      const normalizedIndustry =
        typeof industries === "string"
          ? industries
          : Array.isArray(industries) && typeof industries[0] === "string"
            ? (industries[0] as string)
            : null;
      const logo = typeof record.logo === "string" && record.logo.trim() ? record.logo.trim() : null;

      const { error: updateError } = await supabase
        .from(COMPANY_RELATION)
        .update({
          company_website: website,
          company_domain: domain,
          company_logo_url: logo ?? company.company_website,
          company_industry: normalizedIndustry,
          raw_company_json: record,
        })
        .eq("id", company.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      completed += 1;
      console.log(`[company] completed ${completed}/${companies.length} :: ${company.company_name ?? company.id}`);
    } catch (error) {
      failed += 1;
      console.error(
        `[company] failed ${company.company_name ?? company.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  console.log(
    JSON.stringify({
      companiesInPage: companies.length,
      totalRemainingBeforeRun: allCandidates.length,
      completed,
      failed,
    }),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
