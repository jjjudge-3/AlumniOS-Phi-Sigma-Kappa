import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileSettingsForm } from "@/components/profile/profile-settings-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getActiveBrotherCoverLetters,
  getCurrentActiveBrotherProfile,
  getCurrentAlumniUserProfile,
  getCurrentProfile,
} from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentProfile(user.id);

  if (!profile) {
    redirect("/onboarding");
  }

  const [activeBrotherProfile, alumniProfile, coverLetters] = await Promise.all([
    profile.role === "active_brother" ? getCurrentActiveBrotherProfile(user.id) : Promise.resolve(null),
    profile.role === "alumni" ? getCurrentAlumniUserProfile(user.id) : Promise.resolve(null),
    profile.role === "active_brother" ? getActiveBrotherCoverLetters([user.id]) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Update the details, files, and links that appear across AlumniOS and the Actives dashboard.</p>
      </div>

      <ProfileSettingsForm
        profile={profile}
        activeBrotherProfile={activeBrotherProfile}
        alumniProfile={alumniProfile}
        coverLetters={coverLetters}
      />

      <Card>
        <CardHeader>
          <CardDescription>Actives Visibility</CardDescription>
          <CardTitle className="text-base tracking-normal">What your chapter can see</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>Active-brother profiles can surface your LinkedIn, hometown, major, graduation year, current grade, resume, and cover letter for chapter members.</p>
          <p>Resume and cover letter uploads are stored as PDFs only so the shared materials stay consistent and easy to review.</p>
        </CardContent>
      </Card>
    </div>
  );
}
