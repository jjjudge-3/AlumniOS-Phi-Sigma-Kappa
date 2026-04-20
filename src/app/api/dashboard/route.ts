import { NextResponse } from "next/server";
import { breakdown, topCompanies } from "@/lib/metrics";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const alumni = await getAlumni();

  return NextResponse.json({
    totalAlumni: alumni.length,
    totalCompanies: new Set(alumni.map((row) => row.company_website ?? row.company_name).filter(Boolean)).size,
    withEmailCount: alumni.filter((row) => row.work_email).length,
    withLinkedinCount: alumni.filter((row) => row.linkedin_url).length,
    industryBreakdown: breakdown(alumni, "company_industry"),
    locationBreakdown: breakdown(alumni, "location_state"),
    topCompanies: topCompanies(alumni, 10),
  });
}
