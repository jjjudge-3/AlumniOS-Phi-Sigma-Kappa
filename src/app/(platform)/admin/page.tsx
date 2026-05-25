import { redirect } from "next/navigation";
import { ClaimRequestActions } from "@/components/admin/claim-request-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdminUser, getAdminDashboardData } from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "Not available";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default async function AdminPage() {
  const user = await requireAdminUser();

  if (!user) {
    redirect("/dashboard");
  }

  const { users, profiles, claimRequests } = await getAdminDashboardData();
  const pendingClaims = claimRequests.filter((request) => request.status === "pending");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Admin</h1>
        <p className="page-subtitle">Visibility into signups, onboarding state, and alumni claim requests.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total signups</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{users.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>App profiles</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{profiles.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Pending claims</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{pendingClaims.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alumni Claim Requests</CardTitle>
          <CardDescription>Approve or reject requests from alumni trying to claim a directory profile.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {claimRequests.length ? (
            claimRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="font-medium text-slate-950">{request.alumniName}</div>
                      <Badge variant={request.status === "approved" ? "blue" : request.status === "rejected" ? "neutral" : "neutral"}>
                        {request.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-600">
                      Requested by {request.requesterName} ({request.requesterEmail ?? "No email"}) on {formatDate(request.createdAt)}
                    </div>
                    <div className="text-sm text-slate-500">
                      {request.alumniCompanyName ?? "No company listed"} • source relation: {request.alumniRelation}
                    </div>
                    {request.adminNotes ? <div className="text-xs text-slate-500">{request.adminNotes}</div> : null}
                    {request.reviewedAt ? (
                      <div className="text-xs text-slate-500">Reviewed at {formatDate(request.reviewedAt)}</div>
                    ) : null}
                  </div>
                  <ClaimRequestActions requestId={request.id} disabled={request.status !== "pending"} />
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-sm text-slate-500">
              No alumni claim requests yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Signups</CardTitle>
          <CardDescription>Auth users created in Supabase.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {users.slice(0, 20).map((signup) => (
            <div key={signup.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-medium text-slate-950">{signup.email ?? "No email"}</div>
              <div className="mt-1 text-sm text-slate-600">Created {formatDate(signup.createdAt)}</div>
              <div className="mt-1 text-xs text-slate-500">
                Confirmed: {formatDate(signup.confirmedAt)} • Last sign-in: {formatDate(signup.lastSignInAt)}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App Profiles</CardTitle>
          <CardDescription>Profiles created inside AlumniOS after onboarding begins.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {profiles.slice(0, 30).map((profile) => (
            <div key={profile.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <div className="font-medium text-slate-950">
                  {[profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email || "Unnamed user"}
                </div>
                <Badge variant="neutral">{profile.role ?? "unknown"}</Badge>
                <Badge variant="neutral">{profile.onboardingComplete ? "onboarded" : "incomplete"}</Badge>
              </div>
              <div className="mt-1 text-sm text-slate-600">{profile.email ?? "No email"}</div>
              <div className="mt-1 text-xs text-slate-500">Created {formatDate(profile.createdAt)}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
