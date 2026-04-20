import { redirect } from "next/navigation";
import { LayoutShell } from "@/components/layout-shell";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/supabase/queries";

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getCurrentProfile(user.id);

  if (!profile?.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <LayoutShell
      profile={{
        email: profile.email,
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role,
      }}
    >
      {children}
    </LayoutShell>
  );
}
