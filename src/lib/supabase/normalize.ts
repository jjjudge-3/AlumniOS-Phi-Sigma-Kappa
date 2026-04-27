import type { AlumniRow } from "@/lib/supabase/types";

type RawRow = Record<string, unknown>;

function stringValue(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function objectValue(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    if (typeof value === "string" && value.trim()) {
      try {
        return JSON.parse(value) as Record<string, unknown>;
      } catch {
        return { raw: value };
      }
    }
  }
  return null;
}

function arrayValue(row: RawRow, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        continue;
      }
    }
  }
  return null;
}

function parseLocation(location: string | null) {
  if (!location) return { city: null, state: null };
  const parts = location
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    city: parts[0] ?? null,
    state: parts[1] ?? null,
  };
}

function domainFromWebsite(value: string | null) {
  if (!value) return null;

  const normalized = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0] ?? null;
  }
}

function faviconFromWebsite(value: string | null) {
  const domain = domainFromWebsite(value);
  return domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
}

function firstObject(value: unknown) {
  return Array.isArray(value) && value.length && typeof value[0] === "object" && value[0] !== null
    ? (value[0] as Record<string, unknown>)
    : null;
}

function firstString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function rawProfile(row: RawRow) {
  return objectValue(row, "enriched_person_json", "Enriched Person JSON");
}

function rawCurrentExperience(profile: Record<string, unknown> | null) {
  if (!profile) return null;
  const current = arrayValue(profile, "current_experience");
  return firstObject(current) ?? objectValue(profile, "latest_experience");
}

function cityStateFromProfile(profile: Record<string, unknown> | null) {
  const locationName = firstString(profile?.location_name, profile?.locality, rawCurrentExperience(profile)?.locality);
  return parseLocation(locationName);
}

function inferSubIndustry(companyName: string | null, jobTitle: string | null) {
  const value = `${jobTitle ?? ""} ${companyName ?? ""}`.toLowerCase();

  if (/frontend|front-end|ui engineer|react|web engineer/.test(value)) return "Frontend Engineering";
  if (/backend|back-end|api engineer|platform engineer/.test(value)) return "Backend Engineering";
  if (/full stack|full-stack/.test(value)) return "Full-Stack Engineering";
  if (/machine learning|ml engineer|artificial intelligence|ai engineer/.test(value)) return "Machine Learning";
  if (/data engineer|analytics engineer|business intelligence/.test(value)) return "Data Engineering";
  if (/data scientist|quantitative analyst|research scientist/.test(value)) return "Data Science";
  if (/devops|site reliability|sre|infrastructure engineer|cloud engineer/.test(value)) return "Infrastructure & DevOps";
  if (/security engineer|security analyst|cyber/.test(value)) return "Cybersecurity";
  if (/product manager|product lead|group product/.test(value)) return "Product Management";
  if (/ux|ui designer|product designer|graphic designer/.test(value)) return "Design";
  if (/investment banking|m&a|mergers|acquisition|capital markets/.test(value)) return "Investment Banking";
  if (/private equity|growth equity|buyout/.test(value)) return "Private Equity";
  if (/venture capital|seed fund|series a|startup investor/.test(value)) return "Venture Capital";
  if (/wealth|asset management|financial advisor|advisor/.test(value)) return "Wealth Management";
  if (/fp&a|financial planning|controller|treasury|accounting|cpa/.test(value)) return "Corporate Finance & Accounting";
  if (/sales development|sdr|bdr/.test(value)) return "Sales Development";
  if (/account executive|account director|enterprise sales|sales manager/.test(value)) return "Account Executive Sales";
  if (/customer success|account manager|client success/.test(value)) return "Customer Success";
  if (/growth marketing|demand gen|performance marketing|seo|paid media/.test(value)) return "Growth Marketing";
  if (/brand marketing|communications|public relations|content marketing/.test(value)) return "Brand & Content Marketing";
  if (/management consulting|strategy consulting|advisory|deloitte|bain|mckinsey|bcg/.test(value)) return "Management Consulting";
  if (/operations consulting|implementation consultant/.test(value)) return "Operations Consulting";
  if (/supply chain|procurement|logistics|freight|transportation/.test(value)) return "Supply Chain & Logistics";
  if (/construction manager|project engineer|superintendent|estimator/.test(value)) return "Construction Management";
  if (/real estate|acquisitions|development manager|property manager/.test(value)) return "Real Estate";
  if (/lawyer|attorney|associate counsel|litigation|compliance counsel/.test(value)) return "Legal Practice";
  if (/recruiter|talent acquisition|people ops|human resources/.test(value)) return "Recruiting & People Operations";
  if (/physician|doctor|nurse|clinician|medical director/.test(value)) return "Clinical Care";
  if (/teacher|professor|academic advisor|education/.test(value)) return "Education";

  return null;
}

function inferIndustry(companyName: string | null, jobTitle: string | null) {
  const value = `${jobTitle ?? ""} ${companyName ?? ""}`.toLowerCase();
  if (/software engineer|developer|programmer|engineer|frontend|backend|full stack|full-stack|sre|devops|platform engineer|qa engineer/.test(value)) return "Software Engineering";
  if (/data scientist|analytics engineer|data engineer|business intelligence|machine learning|ai engineer|research scientist/.test(value)) return "Data & AI";
  if (/product manager|product lead|product owner/.test(value)) return "Product";
  if (/designer|ux|ui|creative director/.test(value)) return "Design";
  if (/investment banking|private equity|venture capital|financial analyst|finance manager|controller|accounting|cpa|treasury|wealth/.test(value)) return "Finance";
  if (/sales|account executive|account director|business development|revenue|sdr|bdr/.test(value)) return "Sales";
  if (/marketing|growth|seo|communications|public relations|content/.test(value)) return "Marketing";
  if (/consultant|advisory|strategy manager|management consulting/.test(value)) return "Consulting";
  if (/operations|supply chain|procurement|logistics|fulfillment/.test(value)) return "Operations";
  if (/construction manager|project engineer|superintendent|estimator/.test(value)) return "Construction";
  if (/lawyer|attorney|counsel|legal|compliance/.test(value)) return "Legal";
  if (/recruiter|talent|people ops|human resources|hr/.test(value)) return "Human Resources";
  if (/doctor|physician|nurse|clinical|medical/.test(value)) return "Healthcare";
  if (/teacher|professor|education|academic/.test(value)) return "Education";
  if (/real estate|property manager|development manager|acquisitions/.test(value)) return "Real Estate";
  if (/government|public sector|policy|defense|military/.test(value)) return "Government";
  if (/journalist|writer|media|producer/.test(value)) return "Media";
  return "General Business";
}

function inferFunction(title: string | null) {
  const value = (title ?? "").toLowerCase();
  if (/sales|account/.test(value)) return "Sales";
  if (/engineer|developer/.test(value)) return "Engineering";
  if (/counsel|attorney|legal/.test(value)) return "Legal";
  if (/operations|logistics/.test(value)) return "Operations";
  if (/finance|invest/.test(value)) return "Finance";
  if (/product/.test(value)) return "Product";
  if (/consult/.test(value)) return "Consulting";
  if (/director|manager|president|partner|founder|vp|chief/.test(value)) return "Leadership";
  return "General";
}

export function normalizeAlumniRow(row: RawRow): AlumniRow {
  const profile = rawProfile(row);
  const currentExperience = rawCurrentExperience(profile);
  const fullName =
    stringValue(row, "full_name", "Full Name") ??
    firstString(profile?.name, profile?.full_name, `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim()) ??
    "Unknown Alumni";
  const firstName = stringValue(row, "first_name", "First Name") ?? firstString(profile?.first_name);
  const lastName = stringValue(row, "last_name", "Last Name") ?? firstString(profile?.last_name);
  const locationRaw =
    stringValue(row, "location", "Location") ??
    firstString(profile?.location_name, currentExperience?.locality);
  const derivedLocation = parseLocation(locationRaw);
  const profileLocation = cityStateFromProfile(profile);
  const companyName =
    stringValue(row, "company_name", "Company Name") ??
    firstString(profile?.current_company, profile?.org, currentExperience?.company);
  const jobTitle =
    stringValue(row, "job_title", "Job Title") ??
    firstString(profile?.current_title, profile?.title, currentExperience?.title, profile?.headline);
  const companyWebsite =
    stringValue(row, "company_website", "company website", "Company Website", "Company Domain") ??
    firstString(currentExperience?.company_domain);
  const companyDomain = domainFromWebsite(companyWebsite);
  const companyLinkedinUrl =
    stringValue(row, "company_linkedin_url", "company linkedin URL", "Company Linkedin Url") ??
    firstString(currentExperience?.url);
  const broadIndustry =
    stringValue(row, "company_industry", "Company Industry", "industry") ??
    firstString(profile?.broad_industry, profile?.industry) ??
    inferIndustry(companyName, jobTitle);
  const subIndustry =
    stringValue(row, "sub_industry", "Sub Industry", "sub industry") ??
    firstString(profile?.sub_industry, profile?.niche_industry) ??
    inferSubIndustry(companyName, jobTitle);

  return {
    id: String(row.id ?? crypto.randomUUID()),
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    college: stringValue(row, "college", "College"),
    earliest_year: stringValue(row, "earliest_year", "Earliest Year"),
    latest_year: stringValue(row, "latest_year", "Latest Year"),
    positions_held: stringValue(row, "positions_held", "Positions Held"),
    all_years_on_composite: stringValue(row, "all_years_on_composite", "All Years on Composite", "All Composite Years"),
    linkedin_url: stringValue(
      row,
      "linkedin_url",
      "Final LinkedIn URL",
      "Final Linkedin URL",
      "Contact Linkedin Url",
      "LinkedIn URL",
      "Linkedin Url (2)",
    ) ?? firstString(profile?.url),
    job_title: jobTitle,
    company_name: companyName,
    location: locationRaw,
    location_city:
      stringValue(row, "location_city", "Location City") ?? derivedLocation.city ?? profileLocation.city,
    location_state:
      stringValue(row, "location_state", "Location State") ?? derivedLocation.state ?? profileLocation.state,
    work_email: stringValue(row, "work_email", "Work Email") ?? firstString(profile?.work_email),
    company_linkedin_url: companyLinkedinUrl,
    company_website: companyWebsite,
    company_logo_url:
      faviconFromWebsite(companyWebsite) ??
      (companyDomain ? `https://www.google.com/s2/favicons?domain=${companyDomain}&sz=128` : null) ??
      stringValue(row, "company_logo_url", "Company Logo URL"),
    company_industry: broadIndustry,
    sub_industry: subIndustry,
    job_function:
      stringValue(row, "job_function", "Job Function") ?? firstString(profile?.job_function, profile?.career_track) ?? inferFunction(jobTitle),
    enriched_person_json: profile,
    profile_summary: stringValue(row, "profile_summary", "Profile Summary"),
    referral_power_score:
      typeof row.referral_power_score === "number"
        ? row.referral_power_score
        : typeof row.referral_power_score === "string" && row.referral_power_score.trim()
          ? Number(row.referral_power_score)
          : null,
    referral_power_reason: stringValue(row, "referral_power_reason", "Referral Power Reason"),
    created_at: String(row.created_at ?? new Date().toISOString()),
    raw_record: row,
  };
}

export function normalizeAlumniRows(rows: RawRow[]) {
  return rows
    .map(normalizeAlumniRow)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}
