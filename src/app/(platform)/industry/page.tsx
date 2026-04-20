import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarBreakdown } from "@/components/charts/bar-breakdown";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function IndustryPage() {
  const alumni = await getAlumni();

  const byIndustry = alumni.reduce<
    Record<string, { industry: string; count: number; companies: Set<string>; emailCount: number; topTitles: string[] }>
  >((acc, row) => {
    const industry = row.company_industry ?? "Other";
    if (!acc[industry]) {
      acc[industry] = {
        industry,
        count: 0,
        companies: new Set(),
        emailCount: 0,
        topTitles: [],
      };
    }
    const item = acc[industry];
    item.count += 1;
    if (row.company_name) item.companies.add(row.company_name);
    if (row.work_email) item.emailCount += 1;
    if (row.job_title && item.topTitles.length < 3 && !item.topTitles.includes(row.job_title)) item.topTitles.push(row.job_title);
    return acc;
  }, {});

  const rows = Object.values(byIndustry).sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Industry Breakdown</h1>
        <p className="page-subtitle">See where alumni cluster by industry, how many companies are represented, and how much direct contact data is available.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Industry Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <BarBreakdown data={rows.map((row) => ({ name: row.industry, value: row.count }))} color="#0ea5e9" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Industry Intelligence</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Industry</TableHead>
                <TableHead>Alumni</TableHead>
                <TableHead>Companies</TableHead>
                <TableHead>Work Emails</TableHead>
                <TableHead>Representative Titles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.industry}>
                  <TableCell>{row.industry}</TableCell>
                  <TableCell>{row.count}</TableCell>
                  <TableCell>{row.companies.size}</TableCell>
                  <TableCell>{row.emailCount}</TableCell>
                  <TableCell>{row.topTitles.join(", ") || "No titles"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
