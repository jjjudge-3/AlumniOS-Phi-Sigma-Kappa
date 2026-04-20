import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#261f21] p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>New Account</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-white">Create your AlumniOS account</CardTitle>
          <p className="text-sm text-stone-300">Choose your role first. That controls the onboarding sequence and profile fields we collect.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignupForm />
          <p className="text-center text-sm text-stone-400">
            Already have an account?{" "}
            <Link className="text-[#ffd6d6] hover:text-white" href="/login">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
