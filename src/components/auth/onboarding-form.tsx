"use client";

import { ChangeEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeAuthRedirect } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/lib/supabase/types";

export function OnboardingForm({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = (searchParams.get("role") as AppRole | null) ?? "active_brother";
  const next = normalizeAuthRedirect(searchParams.get("next"), "/dashboard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    permanentAddress: "",
    schoolEmail: "",
    linkedinUrl: "",
    hometown: "",
    major: "",
    graduationYear: "",
    currentGrade: "",
    chapter: "",
    careerInterests: "",
    preferredEmail: email ?? "",
    companyName: "",
    jobTitle: "",
  });

  const update = (key: keyof typeof form) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
  };

  const normalizeSupabaseError = (message: string) => {
    if (message.includes("public.profiles") || message.includes("schema cache")) {
      return "Supabase is missing the AlumniOS app tables. Open the Supabase SQL Editor and run `/Users/jerryjudge/Documents/New project/supabase/schema.sql`, then try onboarding again.";
    }

    if (message.toLowerCase().includes("signature verification failed")) {
      return "Supabase rejected the storage/admin key for resume setup. Onboarding can continue, but resume upload needs the correct service role key or a manually created `resumes` bucket.";
    }

    return message;
  };

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        if (!form.firstName.trim() || !form.lastName.trim()) {
          setError("Add your first and last name to finish onboarding.");
          return;
        }

        if (role === "active_brother" && !form.schoolEmail.trim()) {
          setError("School email is required for active brother accounts.");
          return;
        }

        setLoading(true);
        setError(null);
        setWarning(null);
        const supabase = createSupabaseBrowserClient();

        let resumePath: string | null = null;
        let resumeFileName: string | null = null;

        if (role === "active_brother" && resumeFile) {
          const fileName = resumeFile.name.toLowerCase();
          if (!fileName.endsWith(".pdf") && resumeFile.type !== "application/pdf") {
            setError("Resume uploads must be PDF files.");
            setLoading(false);
            return;
          }

          const bucketResponse = await fetch("/api/setup/resume-bucket", { method: "POST" });
          if (!bucketResponse.ok) {
            const bucketPayload = (await bucketResponse.json().catch(() => null)) as { error?: string } | null;
            setWarning(
              normalizeSupabaseError(
                bucketPayload?.error ?? "Resume storage is not ready yet. We will finish onboarding without uploading the file.",
              ),
            );
          } else {
            resumeFileName = `${Date.now()}-${resumeFile.name}`;
            resumePath = `${userId}/${resumeFileName}`;
            const { error: uploadError } = await supabase.storage
              .from("resumes")
              .upload(resumePath, resumeFile, { upsert: true });

            if (uploadError) {
              resumePath = null;
              resumeFileName = null;
              setWarning(
                uploadError.message.includes("Bucket not found")
                  ? "Resume storage is not configured yet. Your profile will still be created, and you can upload your resume later."
                  : normalizeSupabaseError(uploadError.message),
              );
            }
          }
        }

        const { error: profileError } = await supabase.from("profiles").upsert({
          id: userId,
          role,
          email,
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          permanent_address: form.permanentAddress || null,
          onboarding_complete: false,
        });

        if (profileError) {
          setError(normalizeSupabaseError(profileError.message));
          setLoading(false);
          return;
        }

        if (role === "active_brother") {
          const { error: activeBrotherError } = await supabase.from("active_brother_profiles").upsert(
            {
              profile_id: userId,
              school_email: form.schoolEmail.trim(),
              linkedin_url: form.linkedinUrl.trim() || null,
              hometown: form.hometown.trim() || null,
              major: form.major || null,
              graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
              current_grade: form.currentGrade || null,
              chapter: form.chapter || null,
              career_interests: form.careerInterests || null,
              resume_storage_path: resumePath,
              resume_file_name: resumeFileName,
            },
            { onConflict: "profile_id" },
          );

          if (activeBrotherError) {
            setError(normalizeSupabaseError(activeBrotherError.message));
            setLoading(false);
            return;
          }
        } else {
          const { error: alumniError } = await supabase.from("alumni_user_profiles").upsert(
            {
              profile_id: userId,
              preferred_email: form.preferredEmail.trim() || null,
              graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
              company_name: form.companyName || null,
              job_title: form.jobTitle || null,
            },
            { onConflict: "profile_id" },
          );

          if (alumniError) {
            setError(normalizeSupabaseError(alumniError.message));
            setLoading(false);
            return;
          }
        }

        const { error: profileFinalizeError } = await supabase
          .from("profiles")
          .update({ onboarding_complete: true })
          .eq("id", userId);

        if (profileFinalizeError) {
          setError(normalizeSupabaseError(profileFinalizeError.message));
          setLoading(false);
          return;
        }

        router.push(next);
        router.refresh();
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="First name" value={form.firstName} onChange={update("firstName")} />
        <Input placeholder="Last name" value={form.lastName} onChange={update("lastName")} />
      </div>
      <Input placeholder="Permanent address" value={form.permanentAddress} onChange={update("permanentAddress")} />

      {role === "active_brother" ? (
        <>
          <Input placeholder="School email" type="email" value={form.schoolEmail} onChange={update("schoolEmail")} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="LinkedIn URL" type="url" value={form.linkedinUrl} onChange={update("linkedinUrl")} />
            <Input placeholder="Hometown" value={form.hometown} onChange={update("hometown")} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input placeholder="Major" value={form.major} onChange={update("major")} />
            <Input placeholder="Graduation year" type="number" value={form.graduationYear} onChange={update("graduationYear")} />
            <select
              className="flex h-10 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={form.currentGrade}
              onChange={update("currentGrade")}
            >
              <option value="">Current grade</option>
              <option value="Freshman">Freshman</option>
              <option value="Sophomore">Sophomore</option>
              <option value="Junior">Junior</option>
              <option value="Senior">Senior</option>
              <option value="Graduate Student">Graduate Student</option>
            </select>
          </div>
          <Input placeholder="Chapter" value={form.chapter} onChange={update("chapter")} />
          <textarea
            className="flex min-h-[120px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Career interests, target industries, target companies, or networking goals"
            value={form.careerInterests}
            onChange={update("careerInterests")}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <UploadCloud className="h-4 w-4 text-slate-500" />
            <span>{resumeFile ? resumeFile.name : "Upload resume (PDF only)"}</span>
            <input
              className="hidden"
              type="file"
              accept=".pdf,application/pdf"
              onChange={(event) => setResumeFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Graduation year" type="number" value={form.graduationYear} onChange={update("graduationYear")} />
            <Input placeholder="Preferred email" type="email" value={form.preferredEmail} onChange={update("preferredEmail")} />
          </div>
          <Input placeholder="Current company" value={form.companyName} onChange={update("companyName")} />
          <Input placeholder="Current job title" value={form.jobTitle} onChange={update("jobTitle")} />
        </>
      )}

      {warning ? <p className="text-sm text-amber-700">{warning}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button className="w-full gap-2" disabled={loading} type="submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Finish Onboarding
      </Button>
    </form>
  );
}
