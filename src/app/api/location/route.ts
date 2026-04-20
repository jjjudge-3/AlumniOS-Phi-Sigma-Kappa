import { NextResponse } from "next/server";
import { breakdown } from "@/lib/metrics";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const alumni = await getAlumni();
  const byState = breakdown(alumni, "location_state");
  const byCity = breakdown(alumni, "location_city");

  const stateCoverage = byState.map((state) => ({
    state: state.name,
    alumni: state.value,
    companies: new Set(
      alumni
        .filter((row) => row.location_state === state.name)
        .map((row) => row.company_name)
        .filter(Boolean),
    ).size,
    emailCoverage: alumni.filter((row) => row.location_state === state.name && row.work_email).length,
  }));

  return NextResponse.json({
    byState,
    byCity,
    stateCoverage,
  });
}
