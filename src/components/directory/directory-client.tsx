"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, ArrowUpDown, Download, Mail, Search } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import type { AlumniRow } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DEFAULT_FILTERS = {
  search: "",
  industry: "all",
  subIndustry: "all",
  jobFunction: "all",
  linkedinOnly: "all",
};

type Filters = typeof DEFAULT_FILTERS;

type AlumniResponse = {
  alumni: AlumniRow[];
  options: {
    industries: string[];
    subIndustries: string[];
    jobFunctions: string[];
  };
};

type YearsSort = "none" | "asc" | "desc";

function compositeYearValue(row: AlumniRow) {
  const raw =
    row.all_years_on_composite ||
    (row.earliest_year && row.latest_year
      ? `${row.earliest_year}-${row.latest_year}`
      : row.earliest_year || row.latest_year || "");

  const match = raw.match(/\d{4}/);
  return match ? Number(match[0]) : null;
}

export function DirectoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [data, setData] = useState<AlumniResponse | null>(null);
  const [yearsSort, setYearsSort] = useState<YearsSort>("none");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    return params.toString();
  }, [filters]);

  useEffect(() => {
    const fromParams = { ...DEFAULT_FILTERS };
    for (const key of Object.keys(DEFAULT_FILTERS) as Array<keyof Filters>) {
      const value = searchParams.get(key);
      if (value) fromParams[key] = value;
    }

    if (Object.values(fromParams).some(Boolean)) {
      setFilters(fromParams);
      return;
    }

    const saved = localStorage.getItem("alumnios-alumni-filters");
    if (saved) {
      const parsed = JSON.parse(saved) as Filters;
      setFilters({ ...DEFAULT_FILTERS, ...parsed });
    }
  }, [searchParams]);

  useEffect(() => {
    localStorage.setItem("alumnios-alumni-filters", JSON.stringify(filters));
    router.replace(`/directory${queryString ? `?${queryString}` : ""}`);

    const load = async () => {
      const response = await fetch(`/api/alumni${queryString ? `?${queryString}` : ""}`);
      const payload = (await response.json()) as AlumniResponse;
      setData(payload);
    };

    void load();
  }, [filters, queryString, router]);

  const options = data?.options;

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const yearsOnComposite = (row: AlumniRow) =>
    row.all_years_on_composite ||
    (row.earliest_year && row.latest_year
      ? `${row.earliest_year}-${row.latest_year}`
      : row.earliest_year || row.latest_year || null);

  const displayedAlumni = useMemo(() => {
    const rows = [...(data?.alumni ?? [])];

    if (yearsSort === "none") {
      return rows;
    }

    return rows.sort((a, b) => {
      const aYear = compositeYearValue(a);
      const bYear = compositeYearValue(b);

      if (aYear === null && bYear === null) return a.full_name.localeCompare(b.full_name);
      if (aYear === null) return 1;
      if (bYear === null) return -1;

      return yearsSort === "asc" ? aYear - bYear : bYear - aYear;
    });
  }, [data?.alumni, yearsSort]);

  return (
    <div className="space-y-5">
      <Card className="app-toolbar">
        <CardHeader className="pb-4">
          <CardDescription>Query Surface</CardDescription>
          <CardTitle className="text-base tracking-normal">Filter Alumni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 xl:flex-row xl:justify-end">
            <a href={`/api/export${queryString ? `?${queryString}` : ""}`}>
              <Button variant="secondary" className="w-full gap-2 xl:w-auto">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>

          <div className="grid gap-2 xl:grid-cols-[minmax(280px,360px)_minmax(280px,420px)_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="flex h-9 w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Search alumni by name"
                value={filters.search}
                onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              />
            </div>

            <div className="flex items-center gap-3">
              <Select value={filters.linkedinOnly} onChange={(e) => setFilters((p) => ({ ...p, linkedinOnly: e.target.value }))}>
                <option value="all">All Alumni</option>
                <option value="yes">LinkedIn On</option>
              </Select>
              <div className="text-sm text-slate-600 whitespace-nowrap">Select LinkedIn On to view enriched alumni</div>
            </div>

            <div className="flex justify-start xl:justify-end">
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            <Select value={filters.industry} onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value }))}>
              <option value="all">All Industries</option>
              {options?.industries.map((item) => <option key={item}>{item}</option>)}
            </Select>

            <Select value={filters.subIndustry} onChange={(e) => setFilters((p) => ({ ...p, subIndustry: e.target.value }))}>
              <option value="all">All Sub-Industries</option>
              {options?.subIndustries.map((item) => <option key={item}>{item}</option>)}
            </Select>

            <div className="flex gap-2">
              <Select value={filters.jobFunction} onChange={(e) => setFilters((p) => ({ ...p, jobFunction: e.target.value }))}>
                <option value="all">All Functions</option>
                {options?.jobFunctions.map((item) => <option key={item}>{item}</option>)}
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b border-slate-200">
          <div>
            <CardDescription>Live Alumni Index</CardDescription>
            <CardTitle className="text-base tracking-normal">Alumni ({data?.alumni.length ?? 0})</CardTitle>
          </div>
          <div className="text-xs text-slate-500">Spreadsheet view of current alumni records and enrichment fields.</div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>
                  <button
                    className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-slate-500 transition-colors hover:text-slate-700"
                    onClick={() =>
                      setYearsSort((current) =>
                        current === "none" ? "desc" : current === "desc" ? "asc" : "desc",
                      )
                    }
                    type="button"
                  >
                    College Years
                    <ArrowUpDown className="h-3.5 w-3.5" />
                  </button>
                </TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Sub-Industry</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Referral Power</TableHead>
                <TableHead>Email</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedAlumni.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/alumni/${row.id}`)}>
                  <TableCell className="min-w-[200px]">
                    <div className="font-medium text-slate-950">{row.full_name}</div>
                    <div className="text-xs text-slate-500">{row.college ?? "UMass Amherst"}</div>
                  </TableCell>
                  <TableCell className="min-w-[220px]">
                    <div className="flex items-center gap-3">
                      <CompanyLogo
                        className="h-8 w-8 rounded-md"
                        name={row.company_name ?? "Independent"}
                        src={row.company_logo_url}
                      />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-950">{row.company_name ?? "Independent"}</div>
                        <div className="truncate text-xs text-slate-500">{row.company_website ?? "No domain available"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[220px] text-slate-700">{row.job_title ?? "Unknown title"}</TableCell>
                  <TableCell className="min-w-[140px] text-slate-600">
                    {yearsOnComposite(row) ?? "Unknown"}
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <span className="font-medium text-slate-700">{row.company_industry ?? "Other"}</span>
                  </TableCell>
                  <TableCell className="min-w-[170px] text-slate-600">{row.sub_industry ?? "Unknown"}</TableCell>
                  <TableCell className="min-w-[130px] text-slate-600">
                    <span className="font-medium text-slate-700">{row.job_function ?? "General"}</span>
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    {typeof row.referral_power_score === "number" ? (
                      <div>
                        <div className="font-medium text-slate-950">{row.referral_power_score}/10</div>
                        <div className="line-clamp-2 text-xs text-slate-500">{row.referral_power_reason ?? "AI-scored"}</div>
                      </div>
                    ) : (
                      <span className="text-slate-400">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[180px]">
                    {row.work_email ? (
                      <div className="inline-flex items-center gap-2 text-emerald-700">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="text-xs">{row.work_email}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Unavailable</span>
                    )}
                  </TableCell>
                  <TableCell className="w-8 text-right text-slate-400">
                    <ArrowUpRight className="ml-auto h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
