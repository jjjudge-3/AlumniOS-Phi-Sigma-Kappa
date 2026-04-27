import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const highlights = [
  {
    title: "Search your alumni graph",
    description: "Surface alumni by company, role, location, and function across the entire chapter network.",
    icon: Users,
  },
  {
    title: "Operational company views",
    description: "Understand where alumni concentration exists and which companies are strongest for outreach.",
    icon: Building2,
  },
  {
    title: "Structured member onboarding",
    description: "Bring active brothers and alumni into one secure system with resumes, profiles, and role-specific access.",
    icon: ShieldCheck,
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-lg font-semibold tracking-tight text-slate-950">AlumniOS</div>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <div className="brand-pill mb-4 inline-flex rounded-full px-3 py-1 text-xs">
            Alumni directory infrastructure for fraternities
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-slate-950">
            The Most Advanced Alumni Intelligence Platform for Career Opportunities
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Track where your alumni work, uncover hiring patterns, network for referrals, track internship and job openings in real time, and know exactly when and where to apply.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button className="gap-2">
                Create Account
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="secondary">Sign In</Button>
            </Link>
          </div>
        </div>

        <div className="app-panel p-6">
          <div className="text-xs uppercase tracking-[0.18em] text-slate-500">What the product handles</div>
          <div className="mt-6 space-y-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-3">
                    <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-xl">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="font-medium text-slate-950">{item.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
