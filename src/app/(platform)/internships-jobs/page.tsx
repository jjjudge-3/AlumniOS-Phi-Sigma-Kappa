import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";

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

export default async function InternshipsJobsPage() {
  const supabase = createSupabaseAdminClient();

  const [
    { count: companiesCount },
    { count: companiesWithLinkedinCount },
    { count: companiesWithRawJsonCount },
    { count: companiesWithRecruitingAnalysisCount },
    { count: activeJobPostingsCount },
    { count: activeInternshipPostingsCount },
    recruitingRowsResult,
  ] = await Promise.all([
    supabase.from("companies").select("*", { count: "exact", head: true }),
    supabase.from("companies").select("*", { count: "exact", head: true }).not("company_linkedin_url", "is", null),
    supabase.from("companies").select("*", { count: "exact", head: true }).not("raw_company_json", "is", null),
    supabase.from("company_recruiting_analysis").select("*", { count: "exact", head: true }),
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
        likely_recruiting_window,
        best_time_to_apply,
        recruiting_cycle_confidence,
        analysis_summary,
        raw_analysis_json,
        companies!inner (
          id,
          company_name,
          company_domain,
          company_logo_url,
          company_website
        )
      `)
      .order("updated_at", { ascending: false })
      .limit(8),
  ]);

  const recruitingRows = (recruitingRowsResult.data ?? []).map((row) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    return {
      companyId: String(company?.id),
      companyName: String(company?.company_name ?? "Unknown Company"),
      companyDomain: (company?.company_domain as string | null) ?? null,
      companyLogoUrl: (company?.company_logo_url as string | null) ?? null,
      companyWebsite: (company?.company_website as string | null) ?? null,
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
  });

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

      <Card>
        <CardHeader>
          <CardTitle>What Happens Next</CardTitle>
          <CardDescription>We’re now at the handoff point between company enrichment and opportunity scraping.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>1. Add `company_job_postings` so live internship and job rows have a dedicated table.</p>
          <p>2. Run Apify actors against `public.companies` using company name, domain, website, and LinkedIn URL.</p>
          <p>3. Store raw job posting results in Supabase and normalize them with OpenAI.</p>
          <p>4. Add company-level recruiting-cycle analysis once enough posting history exists.</p>
        </CardContent>
      </Card>

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
    </div>
  );
}
