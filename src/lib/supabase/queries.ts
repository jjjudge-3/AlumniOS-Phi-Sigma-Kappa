import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAlumniRow, normalizeAlumniRows } from "@/lib/supabase/normalize";
import type { AlumniRow } from "@/lib/supabase/types";

async function fetchAlumniRows(relation: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from(relation).select("*");

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? []) as Record<string, unknown>[], error: null };
}

export async function getAlumni() {
  const primary = await fetchAlumniRows("alumni");
  if (primary.error && primary.error.code !== "PGRST205") {
    throw new Error(primary.error.message);
  }

  if (primary.data && primary.data.length > 0) {
    return normalizeAlumniRows(primary.data);
  }

  const dotted = await fetchAlumniRows('"public.alumni"');
  if (dotted.error && dotted.error.code !== "PGRST205") {
    throw new Error(dotted.error.message);
  }

  return normalizeAlumniRows(dotted.data ?? []);
}

export async function getAlumniById(id: string) {
  const alumni = await getAlumni();
  const match = alumni.find((row) => row.id === id);

  if (!match) {
    throw new Error("Alumnus not found");
  }

  return normalizeAlumniRow(match.raw_record ?? match);
}

export async function getCurrentProfile(userId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) return null;
  return data;
}

export async function getCompanies() {
  const alumni = await getAlumni();

  const grouped = alumni.reduce<
    Record<
      string,
      {
        company: string;
        companyDomain: string | null;
        companyLogoUrl: string | null;
        companyIndustry: string | null;
        alumniCount: number;
        locations: Set<string>;
        alumni: Array<{
          id: string;
          fullName: string;
          jobTitle: string | null;
          workEmail: string | null;
          linkedinUrl: string | null;
        }>;
      }
    >
  >((acc, row) => {
    const company = row.company_name ?? "Independent";
    const key = row.company_website ?? company;

    if (!acc[key]) {
      acc[key] = {
        company,
        companyDomain: row.company_website,
        companyLogoUrl: row.company_logo_url,
        companyIndustry: row.company_industry,
        alumniCount: 0,
        locations: new Set(),
        alumni: [],
      };
    }

    acc[key].alumniCount += 1;
    if (row.location_state) acc[key].locations.add(row.location_state);
    acc[key].alumni.push({
      id: row.id,
      fullName: row.full_name,
      jobTitle: row.job_title,
      workEmail: row.work_email,
      linkedinUrl: row.linkedin_url,
    });

    return acc;
  }, {});

  return Object.values(grouped)
    .map((company) => ({
      ...company,
      locations: Array.from(company.locations).join(", "),
    }))
    .sort((a, b) => b.alumniCount - a.alumniCount || a.company.localeCompare(b.company));
}
