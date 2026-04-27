import type { AlumniRow } from "@/lib/supabase/types";

const STATE_MAP: Record<string, string> = {
  ma: "Massachusetts",
  massachusetts: "Massachusetts",
  ca: "California",
  california: "California",
  ny: "New York",
  "new york": "New York",
  tx: "Texas",
  texas: "Texas",
  fl: "Florida",
  florida: "Florida",
  il: "Illinois",
  illinois: "Illinois",
  va: "Virginia",
  virginia: "Virginia",
  wa: "Washington",
  washington: "Washington",
  dc: "District of Columbia",
  "district of columbia": "District of Columbia",
};

function normalizeStateValue(value: string) {
  const normalized = value.trim().toLowerCase();
  return STATE_MAP[normalized] ?? value.trim();
}

export function breakdown(
  items: AlumniRow[],
  key: keyof AlumniRow,
  options?: {
    normalizeState?: boolean;
  },
) {
  const counts = items.reduce<Record<string, number>>((acc, row) => {
    const value = row[key];
    if (typeof value !== "string" || !value) return acc;
    const normalizedValue = options?.normalizeState ? normalizeStateValue(value) : value;
    acc[normalizedValue] = (acc[normalizedValue] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

export function topCompanies(items: AlumniRow[], limit = 8) {
  const byCompany = items.reduce<Record<string, { company: string; count: number; industry: string | null }>>((acc, row) => {
    if (!row.company_name) return acc;
    if (!acc[row.company_name]) {
      acc[row.company_name] = {
        company: row.company_name,
        count: 0,
        industry: row.company_industry,
      };
    }
    acc[row.company_name].count += 1;
    return acc;
  }, {});

  return Object.values(byCompany)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
