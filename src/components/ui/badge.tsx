import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: "neutral" | "success" | "blue";
};

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
        variant === "neutral" && "border border-slate-200 bg-slate-50 text-slate-700",
        variant === "success" && "border border-emerald-500/20 bg-emerald-500/10 text-emerald-700",
        variant === "blue" && "border border-[rgba(221,45,74,0.16)] bg-[rgba(221,45,74,0.08)] text-[var(--brand-primary)]",
        className,
      )}
      {...props}
    />
  );
}
