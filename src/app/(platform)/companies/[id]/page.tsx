import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BellRing, Building2, ExternalLink, Users } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeUrl, summarizeEnrichedPerson } from "@/lib/alumni";
import { getCompanyById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

function stringValue(record: Record<string, unknown> | null, ...keys: string[]) {
  if (!record) return null;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function booleanLikePublicStatus(record: Record<string, unknown> | null) {
  if (!record) return null;

  const companyType = stringValue(record, "type", "company_type");
  if (companyType) {
    if (/public/i.test(companyType)) return "Public";
    if (/private/i.test(companyType)) return "Private";
  }

  const ticker = stringValue(record, "ticker", "stock_ticker", "stock_symbol");
  if (ticker) return "Public";

  return null;
}

function summaryFromCompany(record: Record<string, unknown> | null) {
  return (
    stringValue(record, "description", "about", "summary", "tagline", "slogan") ??
    summarizeEnrichedPerson(record)
  );
}

function headquartersFromCompany(record: Record<string, unknown> | null) {
  return (
    stringValue(record, "headquarters", "headquarter", "hq", "location", "headquarters_location") ??
    null
  );
}

function officeLocationsFromCompany(record: Record<string, unknown> | null) {
  if (!record) return [];

  const candidates = ["locations", "office_locations", "offices"];

  for (const key of candidates) {
    const value = record[key];
    if (Array.isArray(value)) {
      const extracted = value
        .map((item) => {
          if (typeof item === "string" && item.trim()) return item.trim();
          if (item && typeof item === "object") {
            const location = stringValue(item as Record<string, unknown>, "location", "name", "city", "formatted");
            return location;
          }
          return null;
        })
        .filter(Boolean) as string[];

      if (extracted.length) return [...new Set(extracted)];
    }
  }

  return [];
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
    .map(([value, count]) => ({ value, count }));
}

export default async function CompanyProfilePage({ params }: { params: { id: string } }) {
  let company;

  try {
    company = await getCompanyById(params.id);
  } catch {
    notFound();
  }

  const rawCompany = company.rawCompanyJson;
  const companySummary = company.companySummary ?? summaryFromCompany(rawCompany);
  const headquarters = headquartersFromCompany(rawCompany);
  const officeLocations = officeLocationsFromCompany(rawCompany);
  const publicStatus = booleanLikePublicStatus(rawCompany);
  const companyWebsite = normalizeUrl(company.companyWebsite ?? company.companyDomain);
  const companyLinkedinUrl = normalizeUrl(company.companyLinkedinUrl);
  const topTitles = topValues(company.alumni.map((alumnus) => alumnus.jobTitle));
  const topFunctions = topValues(company.alumni.map((alumnus) => alumnus.jobFunction));
  const recruiting = company.recruitingAnalysis;

  return (
    <div className="space-y-4">
      <Link href="/companies" className="brand-link text-sm hover:underline">
        ← Back to Companies
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <CompanyLogo className="h-14 w-14 rounded-xl" name={company.company} src={company.companyLogoUrl} />
            <div className="space-y-2">
              <CardTitle className="text-2xl tracking-tight text-slate-950">{company.company}</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="neutral">{company.companyIndustry ?? "Other"}</Badge>
                <Badge variant="blue">{company.alumniCount} alumni mapped</Badge>
                <Badge variant="neutral">{company.activeJobCount ?? 0} active jobs</Badge>
                <Badge variant="neutral">{company.activeInternshipCount ?? 0} internships</Badge>
                {publicStatus ? <Badge variant="success">{publicStatus}</Badge> : null}
              </div>
              <div className="text-sm text-slate-500">
                {company.companyDomain ?? "No domain available"}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <p>
            <span className="font-medium text-slate-900">Overview:</span>{" "}
            {companySummary ?? "A detailed company summary has not been generated yet, but company profile data is already mapped."}
          </p>
          <p>
            <span className="font-medium text-slate-900">Public/Private:</span>{" "}
            {publicStatus ?? "Not confirmed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Headquarters:</span>{" "}
            {headquarters ?? "Not confirmed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Typical alumni functions here:</span>{" "}
            {topFunctions.map((item) => item.value).join(", ") || "No function data yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Typical alumni titles here:</span>{" "}
            {topTitles.map((item) => item.value).join(", ") || "No title data yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Known office locations:</span>{" "}
            {officeLocations.length ? officeLocations.join(", ") : "Not confirmed yet"}
          </p>

          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            {companyLinkedinUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                href={companyLinkedinUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                View Company LinkedIn
              </a>
            ) : null}
            {companyWebsite ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                href={companyWebsite}
                rel="noreferrer"
                target="_blank"
              >
                <ArrowUpRight className="h-4 w-4 text-[var(--brand-primary)]" />
                Open Company Website
              </a>
            ) : null}
            <Link
              className="inline-flex items-center gap-2 rounded-lg border border-[rgba(221,45,74,0.16)] bg-[rgba(221,45,74,0.08)] px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-[rgba(221,45,74,0.12)]"
              href={`/companies?search=${encodeURIComponent(company.company)}`}
            >
              <Users className="h-4 w-4 text-[var(--brand-primary)]" />
              Back to company alumni list
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Alumni At This Company</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {company.alumni.map((alumnus) => (
            <div key={alumnus.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <Link className="font-medium text-slate-950 hover:text-[var(--brand-primary)]" href={`/alumni/${alumnus.id}`}>
                {alumnus.fullName}
              </Link>
              <div className="mt-1 text-sm text-slate-600">{alumnus.jobTitle ?? "Unknown title"}</div>
              <div className="mt-1 text-xs text-slate-500">{alumnus.jobFunction ?? "General"}</div>
              <div className="mt-1 text-xs text-slate-500">{alumnus.yearsOnComposite ?? "Composite years unavailable"}</div>
              {alumnus.linkedinUrl ? (
                <a
                  className="brand-link mt-2 inline-flex items-center gap-2 text-xs"
                  href={normalizeUrl(alumnus.linkedinUrl)!}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View LinkedIn
                </a>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Recruiting Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <p>
            <span className="font-medium text-slate-900">Internship program:</span>{" "}
            {recruiting?.internshipProgramExists ?? "Not analyzed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Entry-level hiring:</span>{" "}
            {recruiting?.entryLevelHiringExists ?? "Not analyzed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Likely recruiting window:</span>{" "}
            {recruiting?.likelyRecruitingWindow ?? "Not analyzed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Best time to apply:</span>{" "}
            {recruiting?.bestTimeToApply ?? "Not analyzed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Hiring intensity:</span>{" "}
            {recruiting?.hiringIntensity ?? "Not analyzed yet"}
          </p>
          <p>
            <span className="font-medium text-slate-900">Entry-level friendliness:</span>{" "}
            {recruiting?.entryLevelFriendliness ?? "Not analyzed yet"}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Why this matters:</span>{" "}
            {recruiting?.analysisSummary ?? "We haven’t run recruiting intelligence for this company yet."}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Likely roles hired:</span>{" "}
            {recruiting?.commonRolesHired?.join(", ") || "Not analyzed yet"}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Popular internship positions:</span>{" "}
            {recruiting?.popularInternshipPositions?.join(", ") || "Not analyzed yet"}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Likely internship locations:</span>{" "}
            {recruiting?.likelyInternshipLocations?.join(", ") || "No primary internship location identified"}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Internship/job alerts:</span>{" "}
            {recruiting?.jobAlertLink ? (
              <a
                className="brand-link inline-flex items-center gap-2"
                href={normalizeUrl(recruiting.jobAlertLink)!}
                rel="noreferrer"
                target="_blank"
              >
                <BellRing className="h-4 w-4" />
                Join official alerts
              </a>
            ) : (
              recruiting?.jobAlertNote ?? "No official job alert signup identified yet"
            )}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Recommended alumni contacts:</span>{" "}
            {recruiting?.recommendedAlumniContacts?.join(", ") || "Not analyzed yet"}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Confidence:</span>{" "}
            {recruiting?.recruitingCycleConfidence ?? "Not analyzed yet"}
            {recruiting?.recruitingCycleReason ? ` — ${recruiting.recruitingCycleReason}` : ""}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Raw Company JSON</CardTitle>
        </CardHeader>
        <CardContent>
          {rawCompany ? (
            <pre className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-700">
              {JSON.stringify(rawCompany, null, 2)}
            </pre>
          ) : (
            <p className="text-sm leading-7 text-slate-600">
              No Bright Data company JSON is available yet for this company.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
