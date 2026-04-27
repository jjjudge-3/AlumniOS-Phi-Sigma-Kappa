import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeAlumniRow, normalizeAlumniRows } from "@/lib/supabase/normalize";

const ALUMNI_RELATION = "master alumni";

function faviconUrlFromWebsite(value: string | null) {
  if (!value) return null;

  const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    const hostname = new URL(normalized).hostname.replace(/^www\./, "");
    return hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` : null;
  } catch {
    const hostname = value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return hostname ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=128` : null;
  }
}

function normalizedCompanyDomain(value: string | null) {
  if (!value) return null;

  const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? null;
  }
}

async function fetchAlumniRows(relation: string) {
  // Alumni directory data is app-owned reference data, so use the admin client
  // for server-side reads instead of relying on per-session table policies.
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from(relation).select("*");

  if (error) {
    return { data: null, error };
  }

  return { data: (data ?? []) as Record<string, unknown>[], error: null };
}

export async function getAlumni() {
  const result = await fetchAlumniRows(ALUMNI_RELATION);

  if (result.error && result.error.code !== "PGRST205") {
    throw new Error(result.error.message);
  }

  return normalizeAlumniRows(result.data ?? []);
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

export async function getActiveBrothers() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("active_brother_profiles")
    .select(`
      *,
      profiles!inner (
        first_name,
        last_name
      )
    `)
    .order("graduation_year", { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Unnamed Active Brother";

    return {
      id: row.profile_id as string,
      fullName,
      linkedinUrl: row.linkedin_url as string | null,
      hometown: row.hometown as string | null,
      major: row.major as string | null,
      graduationYear: row.graduation_year as number | null,
      currentGrade: row.current_grade as string | null,
      resumeStoragePath: row.resume_storage_path as string | null,
      resumeFileName: row.resume_file_name as string | null,
      coverLetterStoragePath: row.cover_letter_storage_path as string | null,
      coverLetterFileName: row.cover_letter_file_name as string | null,
    };
  });
}

export async function getCurrentActiveBrotherProfile(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("active_brother_profiles")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCurrentAlumniUserProfile(userId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("alumni_user_profiles")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getActiveBrotherCoverLetters(profileIds?: string[]) {
  const supabase = createSupabaseAdminClient();
  let query = supabase
    .from("active_brother_cover_letters")
    .select("*")
    .order("created_at", { ascending: false });

  if (profileIds && profileIds.length > 0) {
    query = query.in("profile_id", profileIds);
  }

  const { data, error } = await query;

  if (error) {
    // Keep the UI resilient until the new table is migrated in every environment.
    if (error.code === "PGRST205" || error.message.includes("does not exist")) {
      return [];
    }
    throw new Error(error.message);
  }

  return data ?? [];
}

type CompanyAlumnus = {
  id: string;
  fullName: string;
  jobTitle: string | null;
  jobFunction: string | null;
  yearsOnComposite: string | null;
  workEmail: string | null;
  linkedinUrl: string | null;
};

type CompanyRecord = {
  id: string;
  company: string;
  companyDomain: string | null;
  companyWebsite: string | null;
  companyLinkedinUrl: string | null;
  companyLogoUrl: string | null;
  companyIndustry: string | null;
  companySummary: string | null;
  rawCompanyJson: Record<string, unknown> | null;
  alumniCount: number;
  alumni: CompanyAlumnus[];
  recruitingAnalysis?: {
    internshipProgramExists: string | null;
    entryLevelHiringExists: string | null;
    likelyRecruitingWindow: string | null;
    recruitingCycleConfidence: string | null;
    recruitingCycleReason: string | null;
    bestTimeToApply: string | null;
    hiringIntensity: string | null;
    entryLevelFriendliness: string | null;
    commonRolesHired: string[];
    popularInternshipPositions: string[];
    likelyInternshipLocations: string[];
    jobAlertLink: string | null;
    jobAlertNote: string | null;
    recommendedAlumniContacts: string[];
    jobMarketSignal: string | null;
    analysisSummary: string | null;
    citedSources: unknown;
  } | null;
  activeJobCount?: number;
  activeInternshipCount?: number;
};

function yearsOnComposite(row: Awaited<ReturnType<typeof getAlumni>>[number]) {
  return (
    row.all_years_on_composite ??
    (row.earliest_year && row.latest_year
      ? `${row.earliest_year}-${row.latest_year}`
      : row.earliest_year ?? row.latest_year ?? null)
  );
}

function fallbackCompanyAlumni(
  alumni: Awaited<ReturnType<typeof getAlumni>>,
  companyName: string | null,
  companyDomain: string | null,
) {
  return alumni.filter((row) => {
    const rowDomain = normalizedCompanyDomain(row.company_website);
    if (companyDomain && rowDomain && rowDomain === companyDomain) return true;
    if (companyName && row.company_name && row.company_name.toLowerCase() === companyName.toLowerCase()) return true;
    return false;
  });
}

function parsedRecruitingAnalysis(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const record = raw as Record<string, unknown>;
  const parsed = record.parsed;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  return record;
}

export async function getCompanies() {
  const supabase = createSupabaseAdminClient();
  const [alumni, companiesResult, linksResult] = await Promise.all([
    getAlumni(),
    supabase
      .from("companies")
      .select("id, company_name, company_domain, company_website, company_linkedin_url, company_logo_url, company_industry, company_summary, raw_company_json, alumni_count")
      .order("alumni_count", { ascending: false })
      .order("company_name", { ascending: true }),
    supabase.from("company_alumni_links").select("company_id, alumni_id"),
  ]);

  if (companiesResult.error) {
    throw new Error(companiesResult.error.message);
  }

  if (linksResult.error) {
    throw new Error(linksResult.error.message);
  }

  const alumniById = new Map(alumni.map((row) => [row.id, row]));
  const linkedIdsByCompany = new Map<string, string[]>();

  for (const link of linksResult.data ?? []) {
    const companyId = String(link.company_id);
    const alumniId = String(link.alumni_id);
    linkedIdsByCompany.set(companyId, [...(linkedIdsByCompany.get(companyId) ?? []), alumniId]);
  }

  const rows: CompanyRecord[] = ((companiesResult.data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const companyId = String(row.id);
    const companyName = (row.company_name as string | null) ?? "Independent";
    const companyDomain = normalizedCompanyDomain((row.company_domain as string | null) ?? (row.company_website as string | null));
    const linkedRows =
      (linkedIdsByCompany.get(companyId) ?? [])
        .map((id) => alumniById.get(id))
        .filter(Boolean) as Awaited<ReturnType<typeof getAlumni>>;
    const fallbackRows = linkedRows.length ? linkedRows : fallbackCompanyAlumni(alumni, companyName, companyDomain);

    return {
      id: companyId,
      company: companyName,
      companyDomain,
      companyWebsite: (row.company_website as string | null) ?? null,
      companyLinkedinUrl: (row.company_linkedin_url as string | null) ?? null,
      companyLogoUrl:
        faviconUrlFromWebsite((row.company_website as string | null) ?? (row.company_domain as string | null)) ??
        (row.company_logo_url as string | null) ??
        null,
      companyIndustry: (row.company_industry as string | null) ?? null,
      companySummary: (row.company_summary as string | null) ?? null,
      rawCompanyJson:
        row.raw_company_json && typeof row.raw_company_json === "object" && !Array.isArray(row.raw_company_json)
          ? (row.raw_company_json as Record<string, unknown>)
          : null,
      alumniCount: fallbackRows.length || Number(row.alumni_count ?? 0),
      alumni: fallbackRows.map((alumnus) => ({
        id: alumnus.id,
        fullName: alumnus.full_name,
        jobTitle: alumnus.job_title,
        jobFunction: alumnus.job_function,
        yearsOnComposite: yearsOnComposite(alumnus),
        workEmail: alumnus.work_email,
        linkedinUrl: alumnus.linkedin_url,
      })),
    };
  });

  return rows.sort((a, b) => b.alumniCount - a.alumniCount || a.company.localeCompare(b.company));
}

export async function getCompanyById(id: string) {
  const supabase = createSupabaseAdminClient();
  const companies = await getCompanies();
  const company = companies.find((row) => row.id === id);

  if (!company) {
    throw new Error("Company not found");
  }

  const [{ data: analysis }, { count: activeJobCount }, { count: activeInternshipCount }] = await Promise.all([
    supabase
      .from("company_recruiting_analysis")
      .select("*")
      .eq("company_id", id)
      .maybeSingle(),
    supabase
      .from("company_job_postings")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id)
      .eq("status", "active"),
    supabase
      .from("company_job_postings")
      .select("*", { count: "exact", head: true })
      .eq("company_id", id)
      .eq("status", "active")
      .eq("is_internship", true),
  ]);

  return {
    ...company,
    activeJobCount: activeJobCount ?? 0,
    activeInternshipCount: activeInternshipCount ?? 0,
    recruitingAnalysis: analysis
      ? {
          internshipProgramExists: (analysis.internship_program_exists as string | null) ?? null,
          entryLevelHiringExists: (analysis.entry_level_hiring_exists as string | null) ?? null,
          likelyRecruitingWindow: (analysis.likely_recruiting_window as string | null) ?? null,
          recruitingCycleConfidence: (analysis.recruiting_cycle_confidence as string | null) ?? null,
          recruitingCycleReason: (analysis.recruiting_cycle_reason as string | null) ?? null,
          bestTimeToApply: (analysis.best_time_to_apply as string | null) ?? null,
          hiringIntensity: (analysis.hiring_intensity as string | null) ?? null,
          entryLevelFriendliness: (analysis.entry_level_friendliness as string | null) ?? null,
          commonRolesHired: Array.isArray(analysis.common_roles_hired) ? (analysis.common_roles_hired as string[]) : [],
          popularInternshipPositions: Array.isArray(parsedRecruitingAnalysis(analysis.raw_analysis_json)?.popular_internship_positions)
            ? ((parsedRecruitingAnalysis(analysis.raw_analysis_json)?.popular_internship_positions as string[]))
            : [],
          likelyInternshipLocations: Array.isArray(parsedRecruitingAnalysis(analysis.raw_analysis_json)?.likely_internship_locations)
            ? ((parsedRecruitingAnalysis(analysis.raw_analysis_json)?.likely_internship_locations as string[]))
            : [],
          jobAlertLink:
            (parsedRecruitingAnalysis(analysis.raw_analysis_json)?.job_alert_link as string | null) ?? null,
          jobAlertNote:
            (parsedRecruitingAnalysis(analysis.raw_analysis_json)?.job_alert_note as string | null) ?? null,
          recommendedAlumniContacts: Array.isArray(analysis.recommended_alumni_contacts)
            ? (analysis.recommended_alumni_contacts as string[])
            : [],
          jobMarketSignal: (analysis.job_market_signal as string | null) ?? null,
          analysisSummary: (analysis.analysis_summary as string | null) ?? null,
          citedSources: analysis.cited_sources ?? null,
        }
      : null,
  };
}
