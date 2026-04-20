import type { AlumniRow } from "@/lib/supabase/types";

export type AlumniFilters = {
  search?: string;
  industry?: string;
  location?: string;
  company?: string;
  jobFunction?: string;
};

export function applyAlumniFilters(rows: AlumniRow[], filters: AlumniFilters) {
  return rows.filter((row) => {
    const matchesSearch =
      !filters.search ||
      [
        row.full_name,
        row.company_name,
        row.job_title,
        row.work_email,
        row.location,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(filters.search!.toLowerCase()));

    const matchesIndustry =
      !filters.industry || filters.industry === "all" || row.company_industry === filters.industry;
    const matchesLocation =
      !filters.location || filters.location === "all" || row.location_state === filters.location;
    const matchesCompany =
      !filters.company || filters.company === "all" || row.company_name === filters.company;
    const matchesFunction =
      !filters.jobFunction || filters.jobFunction === "all" || row.job_function === filters.jobFunction;

    return matchesSearch && matchesIndustry && matchesLocation && matchesCompany && matchesFunction;
  });
}

export function parseNaturalLanguage(input: string): Partial<AlumniFilters> {
  const text = input.toLowerCase();
  const parsed: Partial<AlumniFilters> = {};

  const industries = [
    "finance",
    "technology",
    "consulting",
    "healthcare",
    "government",
    "defense",
    "media",
    "real estate",
    "logistics",
    "education",
    "legal",
    "sales",
    "operations",
  ];
  const functions = [
    "engineering",
    "finance",
    "operations",
    "sales",
    "marketing",
    "product",
    "design",
    "legal",
    "leadership",
    "general",
  ];

  for (const industry of industries) {
    if (text.includes(industry)) {
      parsed.industry = industry === "defense" ? "Government/Defense" : titleize(industry);
      break;
    }
  }

  for (const fn of functions) {
    if (text.includes(fn)) {
      parsed.jobFunction = titleize(fn);
      break;
    }
  }

  const stateMatches: Record<string, string> = {
    california: "California",
    massachusetts: "Massachusetts",
    florida: "Florida",
    texas: "Texas",
    "new york": "New York",
    illinois: "Illinois",
    virginia: "Virginia",
    washington: "Washington",
    seattle: "Washington",
    boston: "Massachusetts",
    chicago: "Illinois",
    austin: "Texas",
    "washington dc": "District of Columbia",
    dc: "District of Columbia",
    "los angeles": "California",
    la: "California",
    sf: "California",
    "san francisco": "California",
  };

  for (const [needle, value] of Object.entries(stateMatches)) {
    if (text.includes(needle)) {
      parsed.location = value;
      break;
    }
  }

  return parsed;
}

function titleize(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function companyValueSummary(data: {
  companyName: string | null;
  companyIndustry: string | null;
  alumniAtCompanyCount: number;
  locationState: string | null;
  workEmail: string | null;
  jobFunction: string | null;
}) {
  const parts: string[] = [];

  if (data.companyIndustry && data.companyName) {
    parts.push(`${data.companyName} gives the chapter direct visibility into ${data.companyIndustry.toLowerCase()} career paths.`);
  } else if (data.companyName) {
    parts.push(`${data.companyName} is already represented inside the alumni network.`);
  }

  parts.push(`${data.alumniAtCompanyCount} alumni are tied to this company, which improves the odds of warm intros and practical referrals.`);

  if (data.locationState) {
    parts.push(`The company extends the chapter's network footprint in ${data.locationState}.`);
  }

  if (data.jobFunction) {
    parts.push(`Current roles skew toward ${data.jobFunction.toLowerCase()}, which helps active brothers understand where the firm can open doors.`);
  }

  if (data.workEmail) {
    parts.push("At least one work email is available, which makes direct outreach materially easier.");
  }

  return parts.join(" ");
}

export function normalizeUrl(value: string | null | undefined) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `https://${value}`;
}

export function summarizeEnrichedPerson(data: Record<string, unknown> | null) {
  if (!data) return null;

  const prioritizedKeys = [
    "summary",
    "about",
    "headline",
    "bio",
    "description",
    "current_role",
    "current_company",
    "industry",
    "location",
    "education",
    "skills",
  ];

  const extracted = prioritizedKeys
    .map((key) => {
      const value = data[key];
      if (!value) return null;
      if (typeof value === "string") return `${labelize(key)}: ${value}`;
      if (Array.isArray(value)) return `${labelize(key)}: ${value.filter(Boolean).join(", ")}`;
      if (typeof value === "object") return `${labelize(key)}: ${JSON.stringify(value)}`;
      return `${labelize(key)}: ${String(value)}`;
    })
    .filter(Boolean) as string[];

  if (extracted.length) {
    return extracted.slice(0, 5).join(" ");
  }

  const fallback = Object.entries(data)
    .filter(([, value]) => typeof value === "string" || Array.isArray(value))
    .slice(0, 5)
    .map(([key, value]) =>
      Array.isArray(value)
        ? `${labelize(key)}: ${value.filter(Boolean).join(", ")}`
        : `${labelize(key)}: ${String(value)}`,
    );

  return fallback.length ? fallback.join(" ") : null;
}

function labelize(value: string) {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
