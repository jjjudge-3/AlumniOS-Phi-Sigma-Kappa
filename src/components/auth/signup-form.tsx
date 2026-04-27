"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeAuthError, normalizeAuthRedirect } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/lib/supabase/types";

const roles: Array<{ value: AppRole; label: string; description: string }> = [
  {
    value: "active_brother",
    label: "Active Brother",
    description: "Current undergraduate user. Uses school email, uploads resume, and tracks career interests.",
  },
  {
    value: "alumni",
    label: "Alumni",
    description: "Former member. Shares graduation year, company, title, and how they can help.",
  },
];

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [role, setRole] = useState<AppRole>("active_brother");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();
        const next = normalizeAuthRedirect(searchParams.get("next"), "/dashboard");

        if (!trimmedEmail) {
          setError("Enter your email address.");
          return;
        }

        if (password.length < 6) {
          setError("Choose a password with at least 6 characters.");
          return;
        }

        if (password !== confirmPassword) {
          setError("Your password confirmation does not match.");
          return;
        }

        setLoading(true);
        setError(null);
        const supabase = createSupabaseBrowserClient();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: { role },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/onboarding?role=${role}&next=${encodeURIComponent(next)}`)}`,
          },
        });

        if (signUpError) {
          setError(normalizeAuthError(signUpError.message));
          setLoading(false);
          return;
        }

        const activeSession = data.session;
        if (!activeSession) {
          router.push(`/signup/pending?role=${role}&email=${encodeURIComponent(trimmedEmail)}&next=${encodeURIComponent(next)}`);
          router.refresh();
          return;
        }

        router.push(`/onboarding?role=${role}&next=${encodeURIComponent(next)}`);
        router.refresh();
      }}
    >
      <div className="space-y-3">
        {roles.map((item) => (
          <button
            key={item.value}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
              role === item.value
                ? "border-[rgba(203,238,243,0.2)] bg-[rgba(203,238,243,0.1)] text-white"
                : "border-white/8 bg-white/[0.02] text-stone-300 hover:bg-[rgba(203,238,243,0.06)]"
            }`}
            onClick={() => setRole(item.value)}
            type="button"
          >
            <div className="font-medium">{item.label}</div>
            <div className="mt-1 text-sm text-stone-300">{item.description}</div>
          </button>
        ))}
      </div>

      <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      <Input
        placeholder="Confirm password"
        type="password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button className="w-full gap-2" disabled={loading} type="submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Create Account
      </Button>
    </form>
  );
}
