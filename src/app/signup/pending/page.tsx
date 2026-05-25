import Link from "next/link";
import { ResendConfirmationButton } from "@/components/auth/resend-confirmation-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { normalizeAuthRedirect } from "@/lib/auth";
import type { AppRole } from "@/lib/supabase/types";

export default function SignupPendingPage({
  searchParams,
}: {
  searchParams: { email?: string; role?: string; next?: string };
}) {
  const email = searchParams.email?.trim().toLowerCase() ?? "";
  const role: AppRole = searchParams.role === "alumni" ? "alumni" : "active_brother";
  const roleLabel = role === "alumni" ? "alumni" : "active brother";
  const normalizedNext = normalizeAuthRedirect(searchParams.next, "/dashboard");
  const nextQuery = normalizedNext !== "/dashboard" ? `?next=${encodeURIComponent(normalizedNext)}` : "";

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardDescription>Confirm your email</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-slate-950">Check {email || "your email"}</CardTitle>
          <p className="text-sm text-slate-600">
            We sent a confirmation link for your {roleLabel} account. Open that link in this browser and we will bring you
            straight back into onboarding.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>Your progress is preserved by role. Once the email link is confirmed, AlumniOS will continue at the next step automatically.</p>
          {email ? <ResendConfirmationButton email={email} next={normalizedNext} role={role} /> : null}
          <div className="flex items-center gap-3">
            <Link className="brand-link" href={`/login${nextQuery}`}>
              Back to sign in
            </Link>
            <Link className="brand-link" href={`/signup${nextQuery}`}>
              Use a different email
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
