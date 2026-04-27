import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const next = searchParams.next ? `?next=${encodeURIComponent(searchParams.next)}` : "";

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardDescription>Authentication</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-slate-950">Sign in to AlumniOS</CardTitle>
          <p className="text-sm text-slate-600">Access the alumni directory, company map, and chapter onboarding workflows.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<div className="text-sm text-slate-500">Loading sign-in...</div>}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-slate-500">
            Need an account?{" "}
            <Link className="brand-link" href={`/signup${next}`}>
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
