import { NextRequest, NextResponse } from "next/server";
import { applyAlumniFilters } from "@/lib/alumni";
import { getAlumni } from "@/lib/supabase/queries";
import { toCsv } from "@/lib/utils";

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

  const rows = applyAlumniFilters(await getAlumni(), filters);

  const csv = toCsv(
    rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      years: row.all_years_on_composite,
      company: row.company_name,
      jobTitle: row.job_title,
      industry: row.company_industry,
      function: row.job_function,
      location: [row.location_city, row.location_state].filter(Boolean).join(", ") || row.location,
      workEmail: row.work_email,
      linkedinUrl: row.linkedin_url,
      college: row.college,
      companyDomain: row.company_website,
    })),
  );

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="alumnios-export.csv"',
    },
  });
}
