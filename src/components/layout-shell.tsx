"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Building2, Compass, LayoutDashboard, MapPinned, ShieldCheck } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/directory", label: "Alumni", icon: Building2 },
  { href: "/companies", label: "Companies", icon: BriefcaseBusiness },
  { href: "/industry", label: "Industry", icon: BarChart3 },
  { href: "/locations", label: "Locations", icon: MapPinned },
];

export function LayoutShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile?: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    role: string | null;
  } | null;
}) {
  const pathname = usePathname();
  const initials = `${profile?.firstName?.[0] ?? "A"}${profile?.lastName?.[0] ?? "O"}`.toUpperCase();

  return (
    <div className="min-h-screen bg-[#261f21] text-stone-100">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/[0.05] bg-[#211a1c] lg:flex lg:flex-col">
          <div className="border-b border-white/[0.05] px-6 py-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#de4949]/25 bg-[#de4949]/14 text-[#ffd6d6]">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-stone-50">AlumniOS</div>
                <div className="text-xs text-stone-400">Operator Network Intelligence</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 px-4 py-5">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium transition-colors",
                    active
                      ? "border border-[#de4949]/20 bg-[#de4949]/14 text-white"
                      : "text-stone-300 hover:bg-white/[0.05] hover:text-white",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[#ffd6d6]" : "text-stone-500")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-white/[0.05] px-4 py-4">
            <div className="flex items-center gap-3 rounded-xl bg-[#2e2729] px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#4a4043] text-sm font-semibold text-stone-100">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-stone-100">
                  {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "AlumniOS User"}
                </div>
                <div className="flex items-center gap-1 text-xs text-stone-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {profile?.role === "active_brother" ? "Active Brother" : profile?.role === "alumni" ? "Alumni" : "Authenticated User"}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] px-3 py-2">
              <div className="text-xs text-stone-400">
                Signed in as
                <div className="truncate text-sm font-medium text-stone-200">
                  {profile?.email ?? "No email"}
                </div>
              </div>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="border-b border-white/[0.05] bg-[#31282b]/85 backdrop-blur">
            <div className="flex items-center justify-between px-5 py-4 lg:px-8">
              <div>
                <div className="text-sm font-medium text-stone-100">AlumniOS Workspace</div>
                <div className="text-xs text-stone-400">Search, segment, and action fraternity alumni relationships.</div>
              </div>
              <div className="rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 text-xs text-stone-300">
                Supabase Preview
              </div>
            </div>
          </div>

          <div className="px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
