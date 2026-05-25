import { NextRequest, NextResponse } from "next/server";
import { applyAlumniFilters } from "@/lib/alumni";
import { getAlumni } from "@/lib/supabase/queries";
import type { AlumniRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function toDirectoryRow(row: AlumniRow) {
  return {
    id: row.id,
    full_name: row.full_name,
    first_name: row.first_name,
    last_name: row.last_name,
    college: row.college,
    earliest_year: row.earliest_year,
    latest_year: row.latest_year,
    positions_held: row.positions_held,
    all_years_on_composite: row.all_years_on_composite,
    linkedin_url: row.linkedin_url,
    job_title: row.job_title,
    company_name: row.company_name,
    location: row.location,
    location_city: row.location_city,
    location_state: row.location_state,
    work_email: row.work_email,
    company_linkedin_url: row.company_linkedin_url,
    company_website: row.company_website,
    company_logo_url: row.company_logo_url,
    company_industry: row.company_industry,
    sub_industry: row.sub_industry,
    job_function: row.job_function,
    profile_summary: row.profile_summary,
    referral_power_score: row.referral_power_score ?? null,
    referral_power_reason: row.referral_power_reason ?? null,
    created_at: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const filters = {
    search: params.get("search") ?? undefined,
    industry: params.get("industry") ?? undefined,
    subIndustry: params.get("subIndustry") ?? undefined,
    jobFunction: params.get("jobFunction") ?? undefined,
    linkedinOnly: params.get("linkedinOnly") ?? undefined,
  };

  const allRows = await getAlumni();
  const alumni = applyAlumniFilters(allRows, filters);

  const unique = <T,>(values: T[]) => [...new Set(values)].sort();

  return NextResponse.json({
    alumni: alumni.map(toDirectoryRow),
    options: {
      industries: unique(allRows.map((r) => r.company_industry).filter(Boolean)),
      subIndustries: unique(allRows.map((r) => r.sub_industry).filter(Boolean)),
      jobFunctions: unique(allRows.map((r) => r.job_function).filter(Boolean)),
    },
  });
}
