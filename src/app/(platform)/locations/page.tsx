import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieBreakdown } from "@/components/charts/pie-breakdown";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function LocationsPage() {
  const alumni = await getAlumni();

  const byState = alumni.reduce<Record<string, number>>((acc, row) => {
    const key = row.location_state ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const byCity = alumni.reduce<Record<string, number>>((acc, row) => {
    const key = row.location_city ?? "Unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const heat = Object.keys(byState).map((state) => ({
    state,
    alumni: byState[state],
    emailCoverage: alumni.filter((a) => (a.location_state ?? "Unknown") === state && a.work_email).length,
    companies: new Set(
      alumni
        .filter((a) => (a.location_state ?? "Unknown") === state)
        .map((a) => a.company_name)
        .filter(Boolean),
    ).size,
  }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Location Intelligence</h1>
        <p className="page-subtitle">Track where alumni are concentrated, where companies are represented, and where direct work-email coverage is strongest.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Alumni by State</CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={Object.entries(byState).map(([name, value]) => ({ name, value }))} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alumni by City</CardTitle>
          </CardHeader>
          <CardContent>
            <PieBreakdown data={Object.entries(byCity).map(([name, value]) => ({ name, value }))} />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base tracking-normal">State Coverage Table</CardTitle>
          <p className="text-sm text-stone-400">This view shows where your strongest density and contactability exist today.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Alumni</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Email Coverage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {heat
                .sort((a, b) => b.alumni - a.alumni)
                .map((row) => (
                  <TableRow key={row.state}>
                    <TableCell>{row.state}</TableCell>
                    <TableCell>{row.alumni}</TableCell>
                    <TableCell>{row.companies}</TableCell>
                    <TableCell className={row.emailCoverage > 5 ? "bg-emerald-500/10 text-emerald-300" : row.emailCoverage > 0 ? "bg-[#de4949]/14 text-[#ffd6d6]" : "text-stone-400"}>
                      {row.emailCoverage}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
