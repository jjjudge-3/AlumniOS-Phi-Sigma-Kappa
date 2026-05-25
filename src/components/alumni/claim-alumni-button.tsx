"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ClaimAlumniButtonProps = {
  alumniId: string;
  disabled?: boolean;
  initialMessage?: string | null;
  initialError?: string | null;
};

export function ClaimAlumniButton({
  alumniId,
  disabled = false,
  initialMessage = null,
  initialError = null,
}: ClaimAlumniButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(initialMessage);
  const [error, setError] = useState<string | null>(initialError);

  return (
    <div className="space-y-2">
      <Button
        className="gap-2"
        disabled={disabled || loading}
        onClick={async () => {
          setLoading(true);
          setError(null);
          setMessage(null);

          const response = await fetch(`/api/alumni/${alumniId}/claim`, {
            method: "POST",
          });

          const payload = (await response.json().catch(() => null)) as { error?: string } | null;

          if (!response.ok) {
            setError(payload?.error ?? "Claim request failed.");
            setLoading(false);
            return;
          }

          setMessage("Claim request submitted. Once approved, this alumni profile will be linked to your account.");
          setLoading(false);
          router.refresh();
        }}
        type="button"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Request to claim this alumni profile
      </Button>
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
