import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";

export default async function OnboardingPage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);
  if (profile?.onboarding_complete) redirect("/dashboard");

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>Onboarding</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-slate-950">Complete your AlumniOS profile</CardTitle>
          <p className="text-sm text-slate-600">We use this information to tailor the member experience and connect the right people to the right alumni.</p>
        </CardHeader>
        <CardContent>
          <OnboardingForm userId={user.id} email={user.email ?? null} />
        </CardContent>
      </Card>
    </div>
  );
}
