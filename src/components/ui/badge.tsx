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
        variant === "neutral" && "bg-white/[0.07] text-stone-200",
        variant === "success" && "border border-emerald-500/25 bg-emerald-500/10 text-emerald-300",
        variant === "blue" && "border border-[#de4949]/30 bg-[#de4949]/14 text-[#ffd6d6]",
        className,
      )}
      {...props}
    />
  );
}
