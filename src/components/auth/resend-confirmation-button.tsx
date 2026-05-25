"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildAuthVerifyPath, normalizeAuthError } from "@/lib/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { AppRole } from "@/lib/supabase/types";

type ResendConfirmationButtonProps = {
  email: string;
  next: string;
  role: AppRole;
};

export function ResendConfirmationButton({ email, next, role }: ResendConfirmationButtonProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <Button
        className="w-full gap-2 sm:w-auto"
        disabled={loading}
        onClick={async () => {
          setLoading(true);
          setMessage(null);
          setError(null);

          const supabase = createSupabaseBrowserClient();
          const onboardingPath = `/onboarding?role=${role}&next=${encodeURIComponent(next)}`;
          const { error: resendError } = await supabase.auth.resend({
            type: "signup",
            email,
            options: {
              emailRedirectTo: `${window.location.origin}${buildAuthVerifyPath(onboardingPath)}`,
            },
          });

          if (resendError) {
            setError(normalizeAuthError(resendError.message));
            setLoading(false);
            return;
          }

          setMessage("A fresh confirmation email is on the way. Open the newest message in this browser.");
          setLoading(false);
        }}
        type="button"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Resend confirmation email
      </Button>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
