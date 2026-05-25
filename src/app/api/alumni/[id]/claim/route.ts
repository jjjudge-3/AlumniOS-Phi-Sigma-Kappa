import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAlumniById, getActiveAlumniRelation, getCurrentProfile } from "@/lib/supabase/queries";

export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "You need to sign in before requesting a claim." }, { status: 401 });
  }

  const profile = await getCurrentProfile(user.id);

  if (!profile || profile.role !== "alumni") {
    return NextResponse.json({ error: "Only alumni accounts can request alumni profile claims." }, { status: 403 });
  }

  const alumniProfileSupabase = createSupabaseAdminClient();
  const { data: alumniUserProfile, error: alumniProfileError } = await alumniProfileSupabase
    .from("alumni_user_profiles")
    .select("claimed_alumni_id, claimed_alumni_relation")
    .eq("profile_id", user.id)
    .maybeSingle();

  if (alumniProfileError && alumniProfileError.code !== "PGRST205") {
    return NextResponse.json({ error: alumniProfileError.message }, { status: 500 });
  }

  if (alumniUserProfile?.claimed_alumni_id && alumniUserProfile.claimed_alumni_id !== params.id) {
    return NextResponse.json({ error: "Your account already has an approved alumni profile claim." }, { status: 409 });
  }

  const alumnus = await getAlumniById(params.id);

  if (!alumnus.linkedin_url || !alumnus.enriched_person_json) {
    return NextResponse.json(
      { error: "Only enriched alumni profiles can be claimed right now." },
      { status: 400 },
    );
  }

  const relation = await getActiveAlumniRelation();

  const { data: existingRequest, error: existingRequestError } = await alumniProfileSupabase
    .from("alumni_claim_requests")
    .select("id, status")
    .eq("profile_id", user.id)
    .eq("alumni_id", params.id)
    .maybeSingle();

  if (existingRequestError && existingRequestError.code !== "PGRST205") {
    return NextResponse.json({ error: existingRequestError.message }, { status: 500 });
  }

  if (existingRequest?.status === "pending") {
    return NextResponse.json({ error: "You already have a pending claim request for this alumni profile." }, { status: 409 });
  }

  if (existingRequest?.status === "approved") {
    return NextResponse.json({ error: "This alumni profile is already claimed by your account." }, { status: 409 });
  }

  const payload = {
    alumni_id: params.id,
    alumni_relation: relation,
    alumni_name: alumnus.full_name,
    alumni_company_name: alumnus.company_name,
    profile_id: user.id,
    requester_email: user.email ?? profile.email ?? null,
    status: "pending",
    admin_notes: null,
    reviewed_by_profile_id: null,
    reviewed_at: null,
  };

  const result = existingRequest
    ? await alumniProfileSupabase.from("alumni_claim_requests").update(payload).eq("id", existingRequest.id)
    : await alumniProfileSupabase.from("alumni_claim_requests").insert(payload);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
