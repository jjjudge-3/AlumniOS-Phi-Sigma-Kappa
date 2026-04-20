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
        variant === "default" && "border-[#de4949]/30 bg-[#de4949]/18 text-stone-50 hover:bg-[#de4949]/28",
        variant === "secondary" && "border-white/8 bg-[#483f43] text-stone-100 hover:bg-[#544a4f]",
        variant === "outline" && "border-white/8 bg-[#40373a] text-stone-200 hover:bg-white/[0.05]",
        variant === "ghost" && "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white",
        className,
      )}
      {...props}
    />
  );
}
