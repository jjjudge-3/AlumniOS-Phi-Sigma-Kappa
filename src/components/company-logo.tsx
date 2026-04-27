"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function CompanyLogo({
  name,
  src,
  className,
}: {
  name: string | null | undefined;
  src: string | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = (name ?? "Company")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  if (!src || failed) {
    return (
      <div
        aria-label={name ?? "Company"}
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-xl border border-[rgba(203,238,243,0.22)] bg-[rgba(203,238,243,0.08)] text-[11px] font-semibold text-[var(--brand-ice)]",
          className,
        )}
      >
        {initials || <Building2 className="h-4 w-4" />}
      </div>
    );
  }

  return (
    <img
      alt={name ?? "Company"}
      className={cn(
        "h-10 w-10 rounded-xl border border-black/10 bg-white object-contain p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.14)]",
        className,
      )}
      loading="lazy"
      onError={() => setFailed(true)}
      src={src}
    />
  );
}
