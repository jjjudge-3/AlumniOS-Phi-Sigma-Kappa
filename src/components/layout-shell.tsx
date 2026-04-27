"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BriefcaseBusiness, Building2, Compass, LayoutDashboard, MapPinned, Settings, ShieldCheck, Users } from "lucide-react";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/directory", label: "Alumni", icon: Building2 },
  { href: "/actives", label: "Actives", icon: Users },
  { href: "/companies", label: "Companies", icon: BriefcaseBusiness },
  { href: "/internships-jobs", label: "Internships/Jobs", icon: BriefcaseBusiness },
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
    <div className="h-screen overflow-hidden text-slate-900">
      <div className="flex h-full">
        <aside className="hidden h-screen w-72 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-6 py-6">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl">
                <Compass className="h-5 w-5" />
              </div>
              <div>
                <div className="text-lg font-semibold tracking-tight text-slate-950">AlumniOS</div>
                <div className="text-xs text-slate-500">Operator Network Intelligence</div>
              </div>
            </Link>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-5">
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
                      ? "border border-[rgba(221,45,74,0.16)] bg-[rgba(221,45,74,0.08)] text-slate-950"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                  )}
                >
                  <Icon className={cn("h-4 w-4", active ? "text-[var(--brand-primary)]" : "text-slate-400")} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="border-t border-slate-200 px-4 py-4">
            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(221,45,74,0.12)] text-sm font-semibold text-[var(--brand-primary)]">
                {initials}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-slate-950">
                  {[profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "AlumniOS User"}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {profile?.role === "active_brother" ? "Active Brother" : profile?.role === "alumni" ? "Alumni" : "Authenticated User"}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <div className="text-xs text-slate-500">
                Signed in as
                <div className="truncate text-sm font-medium text-slate-950">
                  {profile?.email ?? "No email"}
                </div>
              </div>
              <SignOutButton />
            </div>
          </div>
        </aside>

        <main className="flex h-screen flex-1 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between px-5 py-4 lg:px-8">
              <div>
                <div className="text-sm font-medium text-slate-950">AlumniOS Workspace</div>
                <div className="text-xs text-slate-500">Search, segment, and action fraternity alumni relationships.</div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                >
                  <Settings className="h-3.5 w-3.5" />
                  My Profile
                </Link>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  Supabase Preview
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
