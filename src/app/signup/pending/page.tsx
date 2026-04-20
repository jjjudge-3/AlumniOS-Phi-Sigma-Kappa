import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignupPendingPage({
  searchParams,
}: {
  searchParams: { email?: string; role?: string };
}) {
  const email = searchParams.email ?? "your email";
  const role = searchParams.role === "alumni" ? "alumni" : "active brother";

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#261f21] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardDescription>Confirm your email</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-white">Check {email}</CardTitle>
          <p className="text-sm text-slate-300">
            We sent a confirmation link for your {role} account. Open that link in this browser and we will bring you
            straight back into onboarding.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-stone-300">
          <p>Your progress is preserved by role. Once the email link is confirmed, AlumniOS will continue at the next step automatically.</p>
          <div className="flex items-center gap-3">
            <Link className="text-[#ffd6d6] hover:text-white" href="/login">
              Back to sign in
            </Link>
            <Link className="text-[#ffd6d6] hover:text-white" href="/signup">
              Use a different email
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
