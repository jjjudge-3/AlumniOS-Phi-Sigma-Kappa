import { NextResponse } from "next/server";
import { breakdown, topCompanies } from "@/lib/metrics";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const alumni = await getAlumni();
  const linkedinValidated = alumni.filter((row) => row.linkedin_url);

  return NextResponse.json({
    totalAlumni: alumni.length,
    totalCompanies: new Set(alumni.map((row) => row.company_website ?? row.company_name).filter(Boolean)).size,
    withEmailCount: alumni.filter((row) => row.work_email).length,
    withLinkedinCount: linkedinValidated.length,
    withLinkedinPercent: alumni.length ? Math.round((linkedinValidated.length / alumni.length) * 100) : 0,
    industryBreakdown: breakdown(linkedinValidated, "company_industry"),
    locationBreakdown: breakdown(alumni, "location_state", { normalizeState: true }),
    topCompanies: topCompanies(alumni, 10),
  });
}
