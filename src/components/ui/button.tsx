import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "secondary" | "outline" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "border-[var(--brand-primary)] bg-[var(--brand-primary)] text-white hover:bg-[#c51f3b]",
        variant === "secondary" && "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        variant === "outline" && "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
        variant === "ghost" && "border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950",
        className,
      )}
      {...props}
    />
  );
}
