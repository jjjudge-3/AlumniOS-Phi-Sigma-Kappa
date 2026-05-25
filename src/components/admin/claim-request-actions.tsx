"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ClaimRequestActions({ requestId, disabled }: { requestId: string; disabled?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    const response = await fetch(`/api/admin/claim-requests/${requestId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "Admin action failed.");
      setLoading(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          className="h-8 px-3 text-xs"
          disabled={disabled || Boolean(loading)}
          onClick={() => submit("approve")}
          type="button"
        >
          {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Approve
        </Button>
        <Button
          className="h-8 px-3 text-xs"
          disabled={disabled || Boolean(loading)}
          onClick={() => submit("reject")}
          type="button"
          variant="secondary"
        >
          {loading === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Reject
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
