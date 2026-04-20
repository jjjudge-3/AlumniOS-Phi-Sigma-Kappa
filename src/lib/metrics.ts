import type { AlumniRow } from "@/lib/supabase/types";

export function breakdown(items: AlumniRow[], key: keyof AlumniRow) {
  const counts = items.reduce<Record<string, number>>((acc, row) => {
    const value = row[key];
    if (typeof value !== "string" || !value) return acc;
    acc[value] = (acc[value] ?? 0) + 1;
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
