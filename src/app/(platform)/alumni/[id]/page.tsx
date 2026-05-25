import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, Linkedin } from "lucide-react";
import { ClaimAlumniButton } from "@/components/alumni/claim-alumni-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { companyValueSummary, normalizeUrl, summarizeEnrichedPerson } from "@/lib/alumni";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAlumni, getAlumniById, getClaimRequestForProfile, getCurrentAlumniUserProfile, getCurrentProfile } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function AlumniProfilePage({ params }: { params: { id: string } }) {
  const authSupabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  const [alumni, allAlumni, viewerProfile] = await Promise.all([
    getAlumniById(params.id),
    getAlumni(),
    user ? getCurrentProfile(user.id) : Promise.resolve(null),
  ]);
  if (!alumni) notFound();

  const [viewerAlumniProfile, existingClaimRequest] = viewerProfile
    ? await Promise.all([
        viewerProfile.role === "alumni" ? getCurrentAlumniUserProfile(viewerProfile.id) : Promise.resolve(null),
        getClaimRequestForProfile(viewerProfile.id, params.id),
      ])
    : [null, null];

  const alumniAtCompanyCount = allAlumni.filter((row) => row.company_name === alumni.company_name).length;
  const whyValuable = companyValueSummary({
    companyName: alumni.company_name,
    companyIndustry: alumni.company_industry,
    alumniAtCompanyCount,
    locationState: alumni.location_state,
    workEmail: alumni.work_email,
    jobFunction: alumni.job_function,
  });
  const enrichedSummary = alumni.profile_summary ?? summarizeEnrichedPerson(alumni.enriched_person_json);
  const linkedinUrl = normalizeUrl(alumni.linkedin_url);
  const companyLinkedinUrl = normalizeUrl(alumni.company_linkedin_url);
  const companyWebsite = normalizeUrl(alumni.company_website);
  const canClaim = Boolean(
    viewerProfile?.role === "alumni" &&
      alumni.linkedin_url &&
      alumni.enriched_person_json &&
      !viewerAlumniProfile?.claimed_alumni_id &&
      existingClaimRequest?.status !== "pending" &&
      existingClaimRequest?.status !== "approved",
  );

  const claimMessage =
    existingClaimRequest?.status === "pending"
      ? "Your claim request is pending admin review."
      : existingClaimRequest?.status === "approved"
        ? "This alumni profile has already been approved for your account."
        : existingClaimRequest?.status === "rejected"
          ? "A previous claim request was rejected. You can submit another request."
          : viewerAlumniProfile?.claimed_alumni_id
            ? "Your account already has an approved alumni profile claim."
            : null;

  return (
    <div className="space-y-4">
      <Link href="/directory" className="brand-link text-sm hover:underline">← Back to Alumni</Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl tracking-tight text-slate-950">{alumni.full_name}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
          <p><span className="font-medium text-slate-900">College:</span> {alumni.college ?? "University of Massachusetts Amherst"}</p>
          <p><span className="font-medium text-slate-900">Years:</span> {alumni.all_years_on_composite ?? `${alumni.earliest_year ?? "?"}-${alumni.latest_year ?? "?"}`}</p>
          <p><span className="font-medium text-slate-900">Earliest Year:</span> {alumni.earliest_year ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-900">Latest Year:</span> {alumni.latest_year ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-900">Positions Held:</span> {alumni.positions_held ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-900">Composite Years:</span> {alumni.all_years_on_composite ?? "Not listed"}</p>
          <p>
            <span className="font-medium text-slate-900">LinkedIn:</span>{" "}
            {linkedinUrl ? (
              <a className="brand-link hover:underline" href={linkedinUrl} rel="noreferrer" target="_blank">
                Profile
              </a>
            ) : (
              "Not available"
            )}
          </p>
          <p><span className="font-medium text-slate-900">Company:</span> {alumni.company_name ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-900">Job Title:</span> {alumni.job_title ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-900">Industry:</span> {alumni.company_industry ?? "Other"}</p>
          <p><span className="font-medium text-slate-900">Sub-Industry:</span> {alumni.sub_industry ?? "Not listed"}</p>
          <p><span className="font-medium text-slate-900">Function:</span> {alumni.job_function ?? "General"}</p>
          <p>
            <span className="font-medium text-slate-900">Referral Power Score:</span>{" "}
            {typeof alumni.referral_power_score === "number" ? `${alumni.referral_power_score}/10` : "Not scored yet"}
          </p>
          <p><span className="font-medium text-slate-900">Location:</span> {[alumni.location_city, alumni.location_state].filter(Boolean).join(", ") || alumni.location || "Unknown"}</p>
          <p><span className="font-medium text-slate-900">Work Email:</span> {alumni.work_email ?? "Not available"}</p>
          <p><span className="font-medium text-slate-900">Company Domain:</span> {alumni.company_website ?? "Not available"}</p>
          <p><span className="font-medium text-slate-900">Alumni at same company:</span> {alumniAtCompanyCount}</p>
          <p><span className="font-medium text-slate-900">Company LinkedIn:</span> {alumni.company_linkedin_url ?? "Unknown"}</p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Referral Power Reasoning:</span>{" "}
            {alumni.referral_power_reason ?? "No referral reasoning is available yet for this alumnus."}
          </p>
          <p className="md:col-span-2">
            <span className="font-medium text-slate-900">Company Coverage:</span>{" "}
            <Badge variant="blue">{alumni.company_industry ?? "Other"}</Badge>
          </p>
          <div className="md:col-span-2 flex flex-wrap gap-3 pt-2">
            {linkedinUrl ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                href={linkedinUrl}
                rel="noreferrer"
                target="_blank"
              >
                <Linkedin className="h-4 w-4 text-[var(--brand-primary)]" />
                View Personal LinkedIn
              </a>
            ) : null}
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
            {alumni.company_name ? (
              <Link
                className="inline-flex items-center gap-2 rounded-lg border border-[rgba(221,45,74,0.16)] bg-[rgba(221,45,74,0.08)] px-3 py-2 text-sm text-[var(--brand-primary)] hover:bg-[rgba(221,45,74,0.12)]"
                href={`/companies?search=${encodeURIComponent(alumni.company_name)}`}
              >
                <Building2 className="h-4 w-4 text-[var(--brand-primary)]" />
                View Company Insights
              </Link>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {viewerProfile?.role === "alumni" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base tracking-normal">Claim this alumni profile</CardTitle>
          </CardHeader>
          <CardContent>
            <ClaimAlumniButton
              alumniId={params.id}
              disabled={!canClaim}
              initialMessage={claimMessage && !canClaim && existingClaimRequest?.status !== "rejected" ? claimMessage : null}
              initialError={claimMessage && !canClaim && existingClaimRequest?.status === "rejected" ? claimMessage : null}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Why this company is valuable for active brothers</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-7 text-slate-600">{whyValuable}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">Career Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
            {enrichedSummary ?? "No enriched summary is available yet for this alumnus."}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
