import { Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#261f21] p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardDescription>Authentication</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-white">Sign in to AlumniOS</CardTitle>
          <p className="text-sm text-stone-300">Access the alumni directory, company map, and chapter onboarding workflows.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Suspense fallback={<div className="text-sm text-stone-300">Loading sign-in...</div>}>
            <LoginForm />
          </Suspense>
          <p className="text-center text-sm text-stone-400">
            Need an account?{" "}
            <Link className="text-[#ffd6d6] hover:text-white" href="/signup">
              Create one
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
