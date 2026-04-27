import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : "";

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>New Account</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-slate-950">Create your AlumniOS account</CardTitle>
          <p className="text-sm text-slate-600">Choose your role first. That controls the onboarding sequence and profile fields we collect.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<div className="text-sm text-slate-500">Loading signup...</div>}>
            <SignupForm />
          </Suspense>
          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link className="brand-link" href={`/login${next}`}>
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
