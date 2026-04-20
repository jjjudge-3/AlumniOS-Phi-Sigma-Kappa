import { NextResponse } from "next/server";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const alumni = await getAlumni();

  const byIndustry = alumni.reduce<
    Record<string, { industry: string; alumniCount: number; emailCount: number; companies: Set<string> }>
  >((acc, row) => {
    const industry = row.company_industry ?? "Other";
    if (!acc[industry]) {
      acc[industry] = {
        industry,
        alumniCount: 0,
        emailCount: 0,
        companies: new Set(),
      };
    }
    acc[industry].alumniCount += 1;
    if (row.work_email) acc[industry].emailCount += 1;
    if (row.company_name) acc[industry].companies.add(row.company_name);
    return acc;
  }, {});

  return NextResponse.json(
    Object.values(byIndustry)
      .map((item) => ({
        industry: item.industry,
        alumniCount: item.alumniCount,
        companies: item.companies.size,
        emailCoverage: item.emailCount,
      }))
      .sort((a, b) => b.alumniCount - a.alumniCount),
  );
}
