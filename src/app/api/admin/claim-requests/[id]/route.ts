import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin-helpers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authSupabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { action?: string } | null;
  const action = body?.action;

  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid admin action." }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: requestRow, error: requestError } = await supabase
    .from("alumni_claim_requests")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (requestError) {
    return NextResponse.json({ error: requestError.message }, { status: 500 });
  }

  if (!requestRow) {
    return NextResponse.json({ error: "Claim request not found." }, { status: 404 });
  }

  if (action === "approve") {
    const { error: profileUpdateError } = await supabase
      .from("alumni_user_profiles")
      .upsert(
        {
          profile_id: requestRow.profile_id,
          claimed_alumni_id: requestRow.alumni_id,
          claimed_alumni_relation: requestRow.alumni_relation,
          claim_approved_at: new Date().toISOString(),
        },
        { onConflict: "profile_id" },
      );

    if (profileUpdateError) {
      return NextResponse.json({ error: profileUpdateError.message }, { status: 500 });
    }
  }

  const { error: updateError } = await supabase
    .from("alumni_claim_requests")
    .update({
      status: action === "approve" ? "approved" : "rejected",
      reviewed_by_profile_id: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", params.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  if (action === "approve") {
    await supabase
      .from("alumni_claim_requests")
      .update({
        status: "rejected",
        admin_notes: "Another claim request was approved for this alumni profile.",
        reviewed_by_profile_id: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("alumni_id", requestRow.alumni_id)
      .eq("alumni_relation", requestRow.alumni_relation)
      .eq("status", "pending")
      .neq("id", params.id);
  }

  return NextResponse.json({ ok: true });
}
