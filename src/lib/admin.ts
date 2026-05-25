import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin-helpers";

export async function requireAdminUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdminEmail(user.email)) {
    return null;
  }

  return user;
}

export async function getAdminDashboardData() {
  const supabase = createSupabaseAdminClient();

  const [usersResult, profilesResult, claimsResult] = await Promise.all([
    supabase.auth.admin.listUsers(),
    supabase
      .from("profiles")
      .select("id, email, role, first_name, last_name, onboarding_complete, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("alumni_claim_requests")
      .select("id, alumni_id, alumni_relation, alumni_name, alumni_company_name, requester_email, status, admin_notes, reviewed_at, created_at, profile_id")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (usersResult.error) {
    throw new Error(usersResult.error.message);
  }

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (claimsResult.error) {
    throw new Error(claimsResult.error.message);
  }

  const users = (usersResult.data?.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? null,
    createdAt: user.created_at ?? null,
    lastSignInAt: user.last_sign_in_at ?? null,
    confirmedAt: user.email_confirmed_at ?? null,
  }));

  const profiles = (profilesResult.data ?? []).map((profile) => ({
    id: String(profile.id),
    email: (profile.email as string | null) ?? null,
    role: (profile.role as string | null) ?? null,
    firstName: (profile.first_name as string | null) ?? null,
    lastName: (profile.last_name as string | null) ?? null,
    onboardingComplete: Boolean(profile.onboarding_complete),
    createdAt: String(profile.created_at),
  }));

  const profileIds = [...new Set((claimsResult.data ?? []).map((request) => String(request.profile_id)))];
  const requestProfilesResult =
    profileIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .in("id", profileIds)
      : { data: [], error: null };

  if (requestProfilesResult.error) {
    throw new Error(requestProfilesResult.error.message);
  }

  const requesterProfilesById = new Map(
    (requestProfilesResult.data ?? []).map((profile) => [
      String(profile.id),
      {
        firstName: (profile.first_name as string | null) ?? null,
        lastName: (profile.last_name as string | null) ?? null,
        email: (profile.email as string | null) ?? null,
      },
    ]),
  );

  const claimRequests = (claimsResult.data ?? []).map((request) => {
    const profile = requesterProfilesById.get(String(request.profile_id));

    return {
      id: String(request.id),
      alumniId: String(request.alumni_id),
      alumniRelation: String(request.alumni_relation),
      alumniName: (request.alumni_name as string | null) ?? "Unknown alumnus",
      alumniCompanyName: (request.alumni_company_name as string | null) ?? null,
      requesterEmail: (request.requester_email as string | null) ?? null,
      status: (request.status as "pending" | "approved" | "rejected") ?? "pending",
      adminNotes: (request.admin_notes as string | null) ?? null,
      reviewedAt: (request.reviewed_at as string | null) ?? null,
      createdAt: String(request.created_at),
      requesterName: [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || profile?.email || "Unknown user",
      profileId: String(request.profile_id),
    };
  });

  return { users, profiles, claimRequests };
}
