"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [role, setRole] = useState<AppRole>("active_brother");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        const supabase = createSupabaseBrowserClient();
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { role },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/onboarding?role=${role}`)}`,
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          setLoading(false);
          return;
        }

        const activeSession = data.session;
        if (!activeSession) {
          router.push(`/signup/pending?role=${role}&email=${encodeURIComponent(email)}`);
          router.refresh();
          return;
        }

        router.push(`/onboarding?role=${role}`);
        router.refresh();
      }}
    >
      <div className="space-y-3">
        {roles.map((item) => (
          <button
            key={item.value}
            className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
              role === item.value
                ? "border-[#de4949]/30 bg-[#de4949]/14 text-white"
                : "border-white/8 bg-white/[0.02] text-stone-300 hover:bg-white/[0.04]"
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
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button className="w-full gap-2" disabled={loading} type="submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Create Account
      </Button>
    </form>
  );
}
