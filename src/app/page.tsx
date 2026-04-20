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
    <main className="min-h-screen bg-[#261f21] text-stone-100">
      <section className="border-b border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-lg font-semibold tracking-tight">AlumniOS</div>
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
          <div className="mb-4 inline-flex rounded-full border border-[#de4949]/20 bg-[#de4949]/12 px-3 py-1 text-xs text-[#ffd6d6]">
            Alumni directory infrastructure for fraternities
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-stone-50">
            Build the alumni network into a real operating system for intros, recruiting, and long-term chapter value.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-300">
            AlumniOS gives active brothers a secure directory, company intelligence, onboarding workflows, and structured alumni data powered by Supabase.
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
          <div className="text-xs uppercase tracking-[0.18em] text-stone-400">What the product handles</div>
          <div className="mt-6 space-y-4">
            {highlights.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#de4949]/20 bg-[#de4949]/12">
                      <Icon className="h-5 w-5 text-[#ffd6d6]" />
                    </div>
                    <div className="font-medium text-stone-100">{item.title}</div>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-stone-300">{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
