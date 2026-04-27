import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPendingPage({
  searchParams,
}: {
  searchParams: { email?: string; role?: string; next?: string };
}) {
  const email = searchParams.email ?? "your email";
  const role = searchParams.role === "alumni" ? "alumni" : "active brother";
  const next = searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : "";

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardDescription>Confirm your email</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-slate-950">Check {email}</CardTitle>
          <p className="text-sm text-slate-600">
            We sent a confirmation link for your {role} account. Open that link in this browser and we will bring you
            straight back into onboarding.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          <p>Your progress is preserved by role. Once the email link is confirmed, AlumniOS will continue at the next step automatically.</p>
          <div className="flex items-center gap-3">
            <Link className="brand-link" href={`/login${next}`}>
              Back to sign in
            </Link>
            <Link className="brand-link" href={`/signup${next}`}>
              Use a different email
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
