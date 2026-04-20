import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, Linkedin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companyValueSummary, normalizeUrl, summarizeEnrichedPerson } from "@/lib/alumni";
import { getAlumni, getAlumniById } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AlumniProfilePage({ params }: { params: { id: string } }) {
  const [alumni, allAlumni] = await Promise.all([getAlumniById(params.id), getAlumni()]);
  if (!alumni) notFound();

  const alumniAtCompanyCount = allAlumni.filter((row) => row.company_name === alumni.company_name).length;
  const whyValuable = companyValueSummary({
    companyName: alumni.company_name,
    companyIndustry: alumni.company_industry,
    alumniAtCompanyCount,
    locationState: alumni.location_state,
    workEmail: alumni.work_email,
    jobFunction: alumni.job_function,
  });
  const enrichedSummary = summarizeEnrichedPerson(alumni.enriched_person_json);
  const linkedinUrl = normalizeUrl(alumni.linkedin_url);
  const companyLinkedinUrl = normalizeUrl(alumni.company_linkedin_url);
  const companyWebsite = normalizeUrl(alumni.company_website);

  return (
    <div className="space-y-4">
      <Link href="/directory" className="text-sm text-[#ffd6d6] hover:text-white hover:underline">← Back to Alumni</Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight text-white">{alumni.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-300 md:grid-cols-2">
          <p><span className="font-medium text-slate-100">College:</span> {alumni.college ?? "University of Massachusetts Amherst"}</p>
          <p><span className="font-medium text-slate-100">Years:</span> {alumni.all_years_on_composite ?? `${alumni.earliest_year ?? "?"}-${alumni.latest_year ?? "?"}`}</p>
          <p><span className="font-medium text-slate-100">Earliest Year:</span> {alumni.earliest_year ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-100">Latest Year:</span> {alumni.latest_year ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-100">Positions Held:</span> {alumni.positions_held ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-100">Composite Years:</span> {alumni.all_years_on_composite ?? "Not listed"}</p>
          <p>
            <span className="font-medium text-slate-100">LinkedIn:</span>{" "}
            {linkedinUrl ? (
              <a className="text-[#ffd6d6] hover:text-white hover:underline" href={linkedinUrl} rel="noreferrer" target="_blank">
                Profile
              </a>
            ) : (
              "Not available"
            )}
          </p>
          <p><span className="font-medium text-slate-100">Company:</span> {alumni.company_name ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-100">Job Title:</span> {alumni.job_title ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-100">Industry:</span> {alumni.company_industry ?? "Other"}</p>
          <p><span className="font-medium text-slate-100">Function:</span> {alumni.job_function ?? "General"}</p>
          <p><span className="font-medium text-slate-100">Location:</span> {[alumni.location_city, alumni.location_state].filter(Boolean).join(", ") || alumni.location || "Unknown"}</p>
          <p><span className="font-medium text-slate-100">Work Email:</span> {alumni.work_email ?? "Not available"}</p>
          <p><span className="font-medium text-slate-100">Company Domain:</span> {alumni.company_website ?? "Not available"}</p>
          <p><span className="font-medium text-slate-100">Alumni at same company:</span> {alumniAtCompanyCount}</p>
          <p><span className="font-medium text-slate-100">Company LinkedIn:</span> {alumni.company_linkedin_url ?? "Unknown"}</p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-100">Company Coverage:</span>{" "}
            <Badge variant="blue">{alumni.company_industry ?? "Other"}</Badge>
          </p>
          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            {linkedinUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-100 hover:bg-white/[0.06]"
                href={linkedinUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Linkedin className="h-4 w-4 text-[#ffd6d6]" />
                View Personal LinkedIn
              </a>
            ) : null}
            {companyLinkedinUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-100 hover:bg-white/[0.06]"
                href={companyLinkedinUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Building2 className="h-4 w-4 text-[#ffd6d6]" />
                View Company LinkedIn
              </a>
            ) : null}
            {companyWebsite ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-stone-100 hover:bg-white/[0.06]"
                href={companyWebsite}
                rel="noreferrer"
                target="_blank"
              >
                <ArrowUpRight className="h-4 w-4 text-[#ffd6d6]" />
                Open Company Website
              </a>
            ) : null}
            {alumni.company_name ? (
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-[#de4949]/25 bg-[#de4949]/12 px-3 py-2 text-sm text-white hover:bg-[#de4949]/20"
                href={`/companies?search=${encodeURIComponent(alumni.company_name)}`}
              >
                <Building2 className="h-4 w-4 text-[#ffd6d6]" />
                View Company Insights
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Why this company is valuable for active brothers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-slate-300">{whyValuable}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Expanded Alumni Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-slate-300">
            {enrichedSummary ?? "No enriched summary is available yet for this alumnus."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
