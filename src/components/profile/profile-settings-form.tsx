"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type {
  ActiveBrotherCoverLetterRow,
  ActiveBrotherProfileRow,
  AlumniUserProfileRow,
  AppRole,
  ProfileRow,
} from "@/lib/supabase/types";

function isPdf(file: File) {
  const name = file.name.toLowerCase();
  return name.endsWith(".pdf") || file.type === "application/pdf";
}

function normalizeSupabaseError(message: string) {
  if (message.includes("schema cache") || message.includes("does not exist")) {
    return "Your Supabase profile fields are not fully migrated yet. Run the latest `active_brother_profiles` column SQL and refresh.";
  }

  if (message.toLowerCase().includes("signature verification failed")) {
    return "Resume storage is not fully configured yet. Your profile can still save without file uploads.";
  }

  return message;
}

export function ProfileSettingsForm({
  profile,
  activeBrotherProfile,
  alumniProfile,
  coverLetters,
}: {
  profile: ProfileRow;
  activeBrotherProfile: Partial<ActiveBrotherProfileRow> | null;
  alumniProfile: Partial<AlumniUserProfileRow> | null;
  coverLetters: ActiveBrotherCoverLetterRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [coverLetterFiles, setCoverLetterFiles] = useState<File[]>([]);
  const [form, setForm] = useState({
    firstName: profile.first_name ?? "",
    lastName: profile.last_name ?? "",
    permanentAddress: profile.permanent_address ?? "",
    birthday: profile.birthday ?? "",
    schoolEmail: activeBrotherProfile?.school_email ?? "",
    linkedinUrl: activeBrotherProfile?.linkedin_url ?? "",
    hometown: activeBrotherProfile?.hometown ?? "",
    major: activeBrotherProfile?.major ?? "",
    graduationYear:
      String(activeBrotherProfile?.graduation_year ?? alumniProfile?.graduation_year ?? "").replace("0", "") === ""
        ? ""
        : String(activeBrotherProfile?.graduation_year ?? alumniProfile?.graduation_year ?? ""),
    currentGrade: activeBrotherProfile?.current_grade ?? "",
    chapter: activeBrotherProfile?.chapter ?? "",
    careerInterests: activeBrotherProfile?.career_interests ?? "",
    preferredEmail: alumniProfile?.preferred_email ?? profile.email ?? "",
    companyName: alumniProfile?.company_name ?? "",
    jobTitle: alumniProfile?.job_title ?? "",
  });

  const update =
    (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((current) => ({ ...current, [key]: event.target.value }));
    };

  const role: AppRole = profile.role;

  return (
    <Card>
      <CardHeader>
        <CardDescription>Profile Settings</CardDescription>
        <CardTitle className="text-base tracking-normal">Manage your chapter-facing profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setLoading(true);
            setError(null);
            setWarning(null);

            if (!form.firstName.trim() || !form.lastName.trim()) {
              setError("First name and last name are required.");
              setLoading(false);
              return;
            }

            if (role === "active_brother" && !form.schoolEmail.trim()) {
              setError("School email is required for active brothers.");
              setLoading(false);
              return;
            }

            let resumePath = activeBrotherProfile?.resume_storage_path ?? null;
            let resumeFileName = activeBrotherProfile?.resume_file_name ?? null;
            if ((resumeFile && !isPdf(resumeFile)) || coverLetterFiles.some((file) => !isPdf(file))) {
              setError("Resume and cover letter uploads must be PDF files.");
              setLoading(false);
              return;
            }

            if (resumeFile || coverLetterFiles.length > 0) {
              const bucketResponse = await fetch("/api/setup/resume-bucket", { method: "POST" });
              if (!bucketResponse.ok) {
                const payload = (await bucketResponse.json().catch(() => null)) as { error?: string } | null;
                setWarning(normalizeSupabaseError(payload?.error ?? "Storage setup is not ready yet."));
              }
            }

            if (resumeFile) {
              resumeFileName = `${Date.now()}-${resumeFile.name}`;
              resumePath = `${profile.id}/resume-${resumeFileName}`;
              const { error: uploadError } = await supabase.storage.from("resumes").upload(resumePath, resumeFile, { upsert: true });
              if (uploadError) {
                resumePath = activeBrotherProfile?.resume_storage_path ?? null;
                resumeFileName = activeBrotherProfile?.resume_file_name ?? null;
                setWarning(normalizeSupabaseError(uploadError.message));
              }
            }

            const { error: profileError } = await supabase
              .from("profiles")
              .update({
                first_name: form.firstName.trim(),
                last_name: form.lastName.trim(),
                permanent_address: form.permanentAddress.trim() || null,
                birthday: form.birthday || null,
              })
              .eq("id", profile.id);

            if (profileError) {
              setError(normalizeSupabaseError(profileError.message));
              setLoading(false);
              return;
            }

            if (role === "active_brother") {
              const { error: activeError } = await supabase.from("active_brother_profiles").upsert(
                {
                  profile_id: profile.id,
                  school_email: form.schoolEmail.trim(),
                  linkedin_url: form.linkedinUrl.trim() || null,
                  hometown: form.hometown.trim() || null,
                  major: form.major.trim() || null,
                  graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
                  current_grade: form.currentGrade || null,
                  chapter: form.chapter.trim() || null,
                  career_interests: form.careerInterests.trim() || null,
                  resume_storage_path: resumePath,
                  resume_file_name: resumeFileName,
                },
                { onConflict: "profile_id" },
              );

              if (activeError) {
                setError(normalizeSupabaseError(activeError.message));
                setLoading(false);
                return;
              }

              if (coverLetterFiles.length > 0) {
                for (const file of coverLetterFiles) {
                  const fileName = `${Date.now()}-${file.name}`;
                  const storagePath = `${profile.id}/cover-letters/${fileName}`;
                  const { error: uploadError } = await supabase.storage.from("resumes").upload(storagePath, file, { upsert: true });

                  if (uploadError) {
                    setWarning(normalizeSupabaseError(uploadError.message));
                    continue;
                  }

                  const { error: insertError } = await supabase.from("active_brother_cover_letters").insert({
                    profile_id: profile.id,
                    storage_path: storagePath,
                    file_name: fileName,
                  });

                  if (insertError) {
                    setWarning(normalizeSupabaseError(insertError.message));
                  }
                }
              }
            } else {
              const { error: alumniError } = await supabase.from("alumni_user_profiles").upsert(
                {
                  profile_id: profile.id,
                  preferred_email: form.preferredEmail.trim() || null,
                  graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
                  company_name: form.companyName.trim() || null,
                  job_title: form.jobTitle.trim() || null,
                },
                { onConflict: "profile_id" },
              );

              if (alumniError) {
                setError(normalizeSupabaseError(alumniError.message));
                setLoading(false);
                return;
              }
            }

            router.refresh();
            setResumeFile(null);
            setCoverLetterFiles([]);
            setLoading(false);
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="First name" value={form.firstName} onChange={update("firstName")} />
            <Input placeholder="Last name" value={form.lastName} onChange={update("lastName")} />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Permanent address" value={form.permanentAddress} onChange={update("permanentAddress")} />
            <Input type="date" value={form.birthday ?? ""} onChange={update("birthday")} />
          </div>

          {role === "active_brother" ? (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="School email" type="email" value={form.schoolEmail} onChange={update("schoolEmail")} />
                <Input placeholder="LinkedIn URL" type="url" value={form.linkedinUrl} onChange={update("linkedinUrl")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Hometown" value={form.hometown} onChange={update("hometown")} />
                <Input placeholder="Major" value={form.major} onChange={update("major")} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <Input placeholder="Graduation year" type="number" value={form.graduationYear} onChange={update("graduationYear")} />
                <Select value={form.currentGrade} onChange={update("currentGrade")}>
                  <option value="">Current grade</option>
                  <option value="Freshman">Freshman</option>
                  <option value="Sophomore">Sophomore</option>
                  <option value="Junior">Junior</option>
                  <option value="Senior">Senior</option>
                  <option value="Graduate Student">Graduate Student</option>
                </Select>
                <Input placeholder="Chapter" value={form.chapter} onChange={update("chapter")} />
              </div>
              <textarea
                className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Career interests, target industries, target companies, or networking goals"
                value={form.careerInterests}
                onChange={update("careerInterests")}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <UploadCloud className="h-4 w-4 text-slate-500" />
                  <span>{resumeFile ? resumeFile.name : activeBrotherProfile?.resume_file_name ?? "Upload resume (PDF only)"}</span>
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <UploadCloud className="h-4 w-4 text-slate-500" />
                  <span>
                    {coverLetterFiles.length > 0
                      ? `${coverLetterFiles.length} cover letter${coverLetterFiles.length > 1 ? "s" : ""} selected`
                      : "Upload cover letters (PDF only)"}
                  </span>
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    onChange={(event) => setCoverLetterFiles(Array.from(event.target.files ?? []))}
                  />
                </label>
              </div>
              {coverLetters.length > 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2 text-sm font-medium text-slate-900">Uploaded cover letters</div>
                  <div className="space-y-1 text-sm text-slate-600">
                    {coverLetters.map((letter) => (
                      <div key={letter.id}>{letter.file_name}</div>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Preferred email" type="email" value={form.preferredEmail} onChange={update("preferredEmail")} />
                <Input placeholder="Graduation year" type="number" value={form.graduationYear} onChange={update("graduationYear")} />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Input placeholder="Current company" value={form.companyName} onChange={update("companyName")} />
                <Input placeholder="Current job title" value={form.jobTitle} onChange={update("jobTitle")} />
              </div>
            </>
          )}

          {warning ? <p className="text-sm text-amber-700">{warning}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex items-center justify-end">
            <Button type="submit" className="gap-2" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save Profile
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
