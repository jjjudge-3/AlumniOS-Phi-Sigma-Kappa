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

function inferIndustry(companyName: string | null, jobTitle: string | null) {
  const value = `${companyName ?? ""} ${jobTitle ?? ""}`.toLowerCase();
  if (/salesforce|oracle|ping|software|identity|data|ai|cloud|tech/.test(value)) return "Technology";
  if (/law|counsel|attorney|legal/.test(value)) return "Legal";
  if (/health|healthcare|medical|pharma|biotech/.test(value)) return "Healthcare";
  if (/sales|account|business development/.test(value)) return "Sales";
  if (/operations|logistics|supply chain/.test(value)) return "Operations";
  if (/finance|investment|capital|bank|private equity/.test(value)) return "Finance";
  if (/consulting|advisor/.test(value)) return "Consulting";
  return "Other";
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
  const fullName = stringValue(row, "full_name", "Full Name") ?? "Unknown Alumni";
  const firstName = stringValue(row, "first_name", "First Name");
  const lastName = stringValue(row, "last_name", "Last Name");
  const locationRaw = stringValue(row, "location", "Location");
  const derivedLocation = parseLocation(locationRaw);
  const companyName = stringValue(row, "company_name", "Company Name");
  const jobTitle = stringValue(row, "job_title", "Job Title");
  const companyWebsite = stringValue(row, "company_website", "company website", "Company Website");

  return {
    id: String(row.id ?? crypto.randomUUID()),
    full_name: fullName,
    first_name: firstName,
    last_name: lastName,
    college: stringValue(row, "college", "College"),
    earliest_year: stringValue(row, "earliest_year", "Earliest Year"),
    latest_year: stringValue(row, "latest_year", "Latest Year"),
    positions_held: stringValue(row, "positions_held", "Positions Held"),
    all_years_on_composite: stringValue(row, "all_years_on_composite", "All Years on Composite"),
    linkedin_url: stringValue(row, "linkedin_url", "Contact Linkedin Url", "LinkedIn URL"),
    job_title: jobTitle,
    company_name: companyName,
    location: locationRaw,
    location_city: stringValue(row, "location_city", "Location City") ?? derivedLocation.city,
    location_state: stringValue(row, "location_state", "Location State") ?? derivedLocation.state,
    work_email: stringValue(row, "work_email", "Work Email"),
    company_linkedin_url: stringValue(row, "company_linkedin_url", "company linkedin URL", "Company Linkedin Url"),
    company_website: companyWebsite,
    company_logo_url:
      stringValue(row, "company_logo_url", "Company Logo URL") ??
      (companyWebsite ? `https://www.google.com/s2/favicons?sz=128&domain=${companyWebsite}` : null),
    company_industry:
      stringValue(row, "company_industry", "Company Industry") ?? inferIndustry(companyName, jobTitle),
    job_function: stringValue(row, "job_function", "Job Function") ?? inferFunction(jobTitle),
    enriched_person_json: objectValue(row, "enriched_person_json", "Enriched Person JSON"),
    created_at: String(row.created_at ?? new Date().toISOString()),
    raw_record: row,
  };
}

export function normalizeAlumniRows(rows: RawRow[]) {
  return rows
    .map(normalizeAlumniRow)
    .sort((a, b) => a.full_name.localeCompare(b.full_name));
}
