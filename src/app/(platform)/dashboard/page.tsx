import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { breakdown, topCompanies } from "@/lib/metrics";
import { getAlumni } from "@/lib/supabase/queries";
import { PieBreakdown } from "@/components/charts/pie-breakdown";
import { BarBreakdown } from "@/components/charts/bar-breakdown";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const alumni = await getAlumni();
  const linkedinValidated = alumni.filter((row) => row.linkedin_url);
  const industryBreakdown = breakdown(linkedinValidated, "company_industry");
  const locationBreakdown = breakdown(alumni, "location_state", { normalizeState: true });
  const companyBreakdown = topCompanies(alumni, 8).map((item) => ({ name: item.company, value: item.count }));
  const withEmailCount = alumni.filter((row) => row.work_email).length;
  const withLinkedinCount = linkedinValidated.length;
  const withLinkedinPercent = alumni.length ? Math.round((withLinkedinCount / alumni.length) * 100) : 0;
  const companyCount = new Set(alumni.map((row) => row.company_website ?? row.company_name).filter(Boolean)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Live overview of real alumni records, company concentration, and reachable contact coverage.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Alumni</CardDescription>
            <CardTitle className="text-3xl tracking-tight text-[var(--brand-deep)]">{alumni.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Companies Represented</CardDescription>
            <CardTitle className="text-3xl tracking-tight text-[var(--brand-deep)]">{companyCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Work Emails Available</CardDescription>
            <CardTitle className="text-3xl tracking-tight text-[var(--brand-deep)]">{withEmailCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>LinkedIn Profiles Mapped</CardDescription>
            <CardTitle className="text-3xl tracking-tight text-[var(--brand-deep)]">{withLinkedinCount}</CardTitle>
            <p className="text-sm text-slate-500">{withLinkedinPercent}% of alumni</p>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Industry Breakdown</CardTitle>
            <CardDescription>LinkedIn-validated alumni only, grouped by role-based industry</CardDescription>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={industryBreakdown} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={locationBreakdown} />
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Top Companies Represented</CardTitle>
          </CardHeader>
          <CardContent>
            <BarBreakdown data={companyBreakdown} color="#3b82f6" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
