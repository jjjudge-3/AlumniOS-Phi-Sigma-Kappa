"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeAuthError, normalizeAuthRedirect } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const callbackError = searchParams.get("error");
    if (callbackError) {
      setError(normalizeAuthError(callbackError));
    }
  }, [searchParams]);

  return (
    <form
      className="space-y-4"
      onSubmit={async (event) => {
        event.preventDefault();
        const trimmedEmail = email.trim().toLowerCase();

        if (!trimmedEmail || !password) {
          setError("Enter both your email and password.");
          return;
        }

        setLoading(true);
        setError(null);
        const supabase = createSupabaseBrowserClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });

        if (signInError) {
          setError(normalizeAuthError(signInError.message));
          setLoading(false);
          return;
        }

        router.push(normalizeAuthRedirect(searchParams.get("next"), "/dashboard"));
        router.refresh();
      }}
    >
      <Input placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {error ? <p className="text-sm text-red-300">{error}</p> : null}
      <Button className="w-full gap-2" disabled={loading} type="submit">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Sign In
      </Button>
    </form>
  );
}
