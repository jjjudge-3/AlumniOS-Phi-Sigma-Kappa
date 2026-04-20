import { NextRequest, NextResponse } from "next/server";
import { applyAlumniFilters } from "@/lib/alumni";
import { getAlumni } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filters = {
    search: params.get("search") ?? undefined,
    industry: params.get("industry") ?? undefined,
    location: params.get("location") ?? undefined,
    company: params.get("company") ?? undefined,
    jobFunction: params.get("jobFunction") ?? undefined,
  };

  const allRows = await getAlumni();
  const alumni = applyAlumniFilters(allRows, filters);

  const unique = <T,>(values: T[]) => [...new Set(values)].sort();

  return NextResponse.json({
    alumni,
    options: {
      industries: unique(allRows.map((r) => r.company_industry).filter(Boolean)),
      locations: unique(allRows.map((r) => r.location_state).filter(Boolean)),
      companies: unique(allRows.map((r) => r.company_name).filter(Boolean)),
      jobFunctions: unique(allRows.map((r) => r.job_function).filter(Boolean)),
    },
  });
}
