"use client";

import { ChangeEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    permanentAddress: "",
    birthday: "",
    schoolEmail: "",
    major: "",
    graduationYear: "",
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
        setLoading(true);
        setError(null);
        setWarning(null);
        const supabase = createSupabaseBrowserClient();

        let resumePath: string | null = null;
        let resumeFileName: string | null = null;

        if (role === "active_brother" && resumeFile) {
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
          first_name: form.firstName,
          last_name: form.lastName,
          permanent_address: form.permanentAddress || null,
          birthday: form.birthday || null,
          onboarding_complete: true,
        });

        if (profileError) {
          setError(normalizeSupabaseError(profileError.message));
          setLoading(false);
          return;
        }

        if (role === "active_brother") {
          const { error: activeBrotherError } = await supabase.from("active_brother_profiles").upsert({
            profile_id: userId,
            school_email: form.schoolEmail,
            major: form.major || null,
            graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
            chapter: form.chapter || null,
            career_interests: form.careerInterests || null,
            resume_storage_path: resumePath,
            resume_file_name: resumeFileName,
          });

          if (activeBrotherError) {
            setError(normalizeSupabaseError(activeBrotherError.message));
            setLoading(false);
            return;
          }
        } else {
          const { error: alumniError } = await supabase.from("alumni_user_profiles").upsert({
            profile_id: userId,
            preferred_email: form.preferredEmail || null,
            graduation_year: form.graduationYear ? Number(form.graduationYear) : null,
            company_name: form.companyName || null,
            job_title: form.jobTitle || null,
          });

          if (alumniError) {
            setError(normalizeSupabaseError(alumniError.message));
            setLoading(false);
            return;
          }
        }

        router.push("/dashboard");
        router.refresh();
      }}
    >
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="First name" value={form.firstName} onChange={update("firstName")} />
        <Input placeholder="Last name" value={form.lastName} onChange={update("lastName")} />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Input placeholder="Permanent address" value={form.permanentAddress} onChange={update("permanentAddress")} />
        <Input placeholder="Birthday" type="date" value={form.birthday} onChange={update("birthday")} />
      </div>

      {role === "active_brother" ? (
        <>
          <Input placeholder="School email" type="email" value={form.schoolEmail} onChange={update("schoolEmail")} />
          <div className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Major" value={form.major} onChange={update("major")} />
            <Input placeholder="Graduation year" type="number" value={form.graduationYear} onChange={update("graduationYear")} />
          </div>
          <Input placeholder="Chapter" value={form.chapter} onChange={update("chapter")} />
          <textarea
            className="flex min-h-[120px] w-full rounded-lg border border-white/8 bg-[#40373a] px-3 py-2 text-sm text-stone-100 placeholder:text-stone-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Career interests, target industries, target companies, or networking goals"
            value={form.careerInterests}
            onChange={update("careerInterests")}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-white/10 bg-white/[0.02] px-4 py-4 text-sm text-slate-300">
            <UploadCloud className="h-4 w-4 text-stone-300" />
            <span>{resumeFile ? resumeFile.name : "Upload resume (PDF or DOC)"}</span>
            <input
              className="hidden"
              type="file"
              accept=".pdf,.doc,.docx"
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

      {warning ? <p className="text-sm text-amber-200">{warning}</p> : null}
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button className="w-full gap-2" disabled={loading} type="submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Finish Onboarding
      </Button>
    </form>
  );
}
