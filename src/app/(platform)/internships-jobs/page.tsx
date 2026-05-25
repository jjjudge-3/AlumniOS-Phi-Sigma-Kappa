import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { clsx } from "clsx";

function normalizeUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

function parsedRecruitingAnalysis(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const parsed = record.parsed;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return record;
}

export const dynamic = "force-dynamic";

type OpportunityView = "intelligence" | "jobs" | "internships";

type PostingRow = {
  id: string;
  title: string;
  location: string | null;
  employmentType: string | null;
  postedAt: string | null;
  postingUrl: string | null;
  companyId: string;
  companyName: string;
  companyDomain: string | null;
  companyLogoUrl: string | null;
};

function formatPostedDate(value: string | null) {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeView(value: string | string[] | undefined): OpportunityView {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === "jobs" || candidate === "internships" ? candidate : "intelligence";
}

function isCompanyOpportunityReady(company: {
  company_linkedin_url?: string | null;
  raw_company_json?: Record<string, unknown> | null;
}) {
  return Boolean(company.company_linkedin_url && company.raw_company_json);
}

export default async function InternshipsJobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string | string[] }>;
}) {
  const supabase = createSupabaseAdminClient();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentView = normalizeView(resolvedSearchParams?.view);

  const [
    { count: companiesCount },
    { count: companiesWithLinkedinCount },
    { count: companiesWithRawJsonCount },
    { count: activeJobPostingsCount },
    { count: activeInternshipPostingsCount },
    recruitingAnalysisCountResult,
    recruitingRowsResult,
    activeJobsResult,
    internshipJobsResult,
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }).not("company_linkedin_url", "is", null),
    supabase.from("companies").select("*", { count: "exact", head: true }).not("raw_company_json", "is", null),
    supabase.from("company_job_postings").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase
      .from("company_job_postings")
      .select("*", { count: "exact", head: true })
      .eq("status", "active")
      .eq("is_internship", true),
    supabase
      .from("company_recruiting_analysis")
      .select(`
        company_id,
        companies!inner (
          id,
          company_linkedin_url,
          raw_company_json
        )
      `),
    supabase
      .from("company_recruiting_analysis")
      .select(`
        company_id,
        likely_recruiting_window,
        best_time_to_apply,
        recruiting_cycle_confidence,
        analysis_summary,
        raw_analysis_json,
        companies!inner (
          id,
          company_name,
          company_domain,
          company_linkedin_url,
          company_logo_url,
          company_website,
          raw_company_json
        )
      `)
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("company_job_postings")
      .select(`
        id,
        title,
        location,
        employment_type,
        posted_at,
        posting_url,
        companies!inner (
          id,
          company_name,
          company_domain,
          company_logo_url
        )
      `)
      .eq("status", "active")
      .eq("is_internship", false)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(40),
    supabase
      .from("company_job_postings")
      .select(`
        id,
        title,
        location,
        employment_type,
        posted_at,
        posting_url,
        companies!inner (
          id,
          company_name,
          company_domain,
          company_logo_url
        )
      `)
      .eq("status", "active")
      .eq("is_internship", true)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(40),
  ]);

  const companiesWithRecruitingAnalysisCount = (recruitingAnalysisCountResult.data ?? []).filter((row) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    return isCompanyOpportunityReady({
      company_linkedin_url: (company?.company_linkedin_url as string | null) ?? null,
      raw_company_json:
        company?.raw_company_json && typeof company.raw_company_json === "object" && !Array.isArray(company.raw_company_json)
          ? (company.raw_company_json as Record<string, unknown>)
          : null,
    });
  }).length;

  const recruitingRows = (recruitingRowsResult.data ?? []).map((row) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    return {
      companyId: String(company?.id),
      companyName: String(company?.company_name ?? "Unknown Company"),
      companyDomain: (company?.company_domain as string | null) ?? null,
      companyLinkedinUrl: (company?.company_linkedin_url as string | null) ?? null,
      companyLogoUrl: (company?.company_logo_url as string | null) ?? null,
      companyWebsite: (company?.company_website as string | null) ?? null,
      rawCompanyJson:
        company?.raw_company_json && typeof company.raw_company_json === "object" && !Array.isArray(company.raw_company_json)
          ? (company.raw_company_json as Record<string, unknown>)
          : null,
      likelyRecruitingWindow: (row.likely_recruiting_window as string | null) ?? null,
      bestTimeToApply: (row.best_time_to_apply as string | null) ?? null,
      recruitingCycleConfidence: (row.recruiting_cycle_confidence as string | null) ?? null,
      analysisSummary: (row.analysis_summary as string | null) ?? null,
      popularInternshipPositions: Array.isArray(parsedRecruitingAnalysis(row.raw_analysis_json)?.popular_internship_positions)
        ? ((parsedRecruitingAnalysis(row.raw_analysis_json)?.popular_internship_positions as string[]))
        : [],
      likelyInternshipLocations: Array.isArray(parsedRecruitingAnalysis(row.raw_analysis_json)?.likely_internship_locations)
        ? ((parsedRecruitingAnalysis(row.raw_analysis_json)?.likely_internship_locations as string[]))
        : [],
      jobAlertLink: (parsedRecruitingAnalysis(row.raw_analysis_json)?.job_alert_link as string | null) ?? null,
      jobAlertNote: (parsedRecruitingAnalysis(row.raw_analysis_json)?.job_alert_note as string | null) ?? null,
    };
  }).filter((row) => isCompanyOpportunityReady({
    company_linkedin_url: row.companyLinkedinUrl,
    raw_company_json: row.rawCompanyJson,
  })).slice(0, 8);

  const mapPostingRows = (rows: Array<Record<string, unknown>> | null | undefined): PostingRow[] =>
    (rows ?? []).map((row) => {
      const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
      return {
        id: String(row.id),
        title: String(row.title ?? "Untitled posting"),
        location: (row.location as string | null) ?? null,
        employmentType: (row.employment_type as string | null) ?? null,
        postedAt: (row.posted_at as string | null) ?? null,
        postingUrl: (row.posting_url as string | null) ?? null,
        companyId: String(company?.id ?? ""),
        companyName: String(company?.company_name ?? "Unknown Company"),
        companyDomain: (company?.company_domain as string | null) ?? null,
        companyLogoUrl: (company?.company_logo_url as string | null) ?? null,
      };
    });

  const activeJobRows = mapPostingRows(activeJobsResult.data as Array<Record<string, unknown>> | null | undefined);
  const internshipRows = mapPostingRows(internshipJobsResult.data as Array<Record<string, unknown>> | null | undefined);
  const activeNonInternshipCount = Math.max((activeJobPostingsCount ?? 0) - (activeInternshipPostingsCount ?? 0), 0);
  const viewLinks: Array<{ key: OpportunityView; label: string; count: number }> = [
    { key: "intelligence", label: "Recruiting Intelligence", count: companiesWithRecruitingAnalysisCount ?? 0 },
    { key: "jobs", label: "Active Jobs", count: activeNonInternshipCount },
    { key: "internships", label: "Internships", count: activeInternshipPostingsCount ?? 0 },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Internships/Jobs</h1>
        <p className="page-subtitle">
          This is the company opportunity intelligence layer. We’ll use enriched companies as the source for live job
          postings, internships, and recruiting-cycle analysis.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Company Universe</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{companiesCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Total normalized companies ready for opportunity scraping.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>LinkedIn Mapped</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{companiesWithLinkedinCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Companies with a LinkedIn company URL available for enrichment.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Company Profiles Enriched</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{companiesWithRawJsonCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Companies with raw Bright Data profile JSON already stored in Supabase.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Recruiting Analyses Written</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{companiesWithRecruitingAnalysisCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Companies with web-search-backed recruiting intelligence saved in Supabase.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Active Job Postings</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{activeJobPostingsCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Job postings currently stored in the opportunity layer.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardDescription>Internship Postings</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{activeInternshipPostingsCount ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Internship postings currently stored in the opportunity layer.
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        {viewLinks.map((view) => (
          <Link
            key={view.key}
            href={view.key === "intelligence" ? "/internships-jobs" : `/internships-jobs?view=${view.key}`}
            className={clsx(
              "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition",
              currentView === view.key
                ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
            )}
          >
            <span>{view.label}</span>
            <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-500">{view.count}</span>
          </Link>
        ))}
      </div>

      {currentView === "intelligence" ? (
      <Card>
        <CardHeader>
          <CardTitle>Recruiting Intelligence Feed</CardTitle>
          <CardDescription>
            Recent company-level recruiting analyses generated from OpenAI web search.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {recruitingRows.length ? (
            recruitingRows.map((row) => (
              <div key={row.companyId} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CompanyLogo
                      className="h-10 w-10 rounded-lg"
                      name={row.companyName}
                      src={row.companyLogoUrl ?? normalizeUrl(row.companyWebsite)}
                    />
                    <div>
                      <Link className="text-base font-medium text-slate-950 hover:text-[var(--brand-primary)]" href={`/companies/${row.companyId}`}>
                        {row.companyName}
                      </Link>
                      <div className="text-xs text-slate-500">{row.companyDomain ?? "No domain available"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">{row.recruitingCycleConfidence ?? "Unscored"}</div>
                </div>
                <div className="mt-2 text-sm text-slate-600">
                  {row.analysisSummary ?? "No recruiting summary generated yet."}
                </div>
                <div className="mt-3 grid gap-2 text-xs text-slate-500 md:grid-cols-2">
                  <div>Window: {row.likelyRecruitingWindow ?? "Not set"}</div>
                  <div>Best time to apply: {row.bestTimeToApply ?? "Not set"}</div>
                  <div>Popular internship roles: {row.popularInternshipPositions.join(", ") || "Not set"}</div>
                  <div>Likely internship locations: {row.likelyInternshipLocations.join(", ") || "No primary internship location identified"}</div>
                </div>
                <div className="mt-3 text-xs text-slate-500">
                  {row.jobAlertLink ? (
                    <a
                      className="brand-link inline-flex items-center gap-2"
                      href={normalizeUrl(row.jobAlertLink)!}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <BellRing className="h-3.5 w-3.5" />
                      Join official alerts
                    </a>
                  ) : (
                    row.jobAlertNote ?? "No official job alert signup identified"
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
              No recruiting analyses have been generated yet. The next step is the OpenAI web-search company analysis run.
            </div>
          )}
        </CardContent>
      </Card>
      ) : (
      <Card>
        <CardHeader>
          <CardTitle>{currentView === "jobs" ? "Active Job Postings" : "Internship Postings"}</CardTitle>
          <CardDescription>
            {currentView === "jobs"
              ? "Live company-matched job postings stored in the opportunity layer."
              : "Live company-matched internship postings stored in the opportunity layer."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {(currentView === "jobs" ? activeJobRows : internshipRows).length ? (
            (currentView === "jobs" ? activeJobRows : internshipRows).map((row) => (
              <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <CompanyLogo className="h-10 w-10 rounded-lg" name={row.companyName} src={row.companyLogoUrl} />
                    <div>
                      <div className="text-base font-medium text-slate-950">{row.title}</div>
                      <Link className="text-sm text-[var(--brand-primary)] hover:underline" href={`/companies/${row.companyId}`}>
                        {row.companyName}
                      </Link>
                      <div className="text-xs text-slate-500">{row.companyDomain ?? "No domain available"}</div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-500">
                    <div>{formatPostedDate(row.postedAt)}</div>
                    <div>{row.employmentType ?? "Type unavailable"}</div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                  <span>{row.location ?? "Location unavailable"}</span>
                  {row.postingUrl ? (
                    <a
                      className="brand-link"
                      href={normalizeUrl(row.postingUrl)!}
                      rel="noreferrer"
                      target="_blank"
                    >
                      View posting
                    </a>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-sm text-slate-500">
              {currentView === "jobs"
                ? "No active non-internship job postings have been stored yet."
                : "No internship postings have been stored yet."}
            </div>
          )}
        </CardContent>
      </Card>
      )}
    </div>
  );
}
