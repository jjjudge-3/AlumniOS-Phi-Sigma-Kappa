"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpRight, Download, Mail, Search, Sparkles } from "lucide-react";
import { parseNaturalLanguage } from "@/lib/alumni";
import type { AlumniRow } from "@/lib/supabase/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const DEFAULT_FILTERS = {
  search: "",
  industry: "all",
  location: "all",
  company: "all",
  jobFunction: "all",
};

type Filters = typeof DEFAULT_FILTERS;

type AlumniResponse = {
  alumni: AlumniRow[];
  options: {
    industries: string[];
    locations: string[];
    companies: string[];
    jobFunctions: string[];
  };
};

export function DirectoryClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [nlQuery, setNlQuery] = useState("");
  const [data, setData] = useState<AlumniResponse | null>(null);

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

  const applyNlQuery = () => {
    const parsed = parseNaturalLanguage(nlQuery);
    setFilters((prev) => ({ ...prev, ...parsed }));
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
    <div className="space-y-5">
      <Card className="app-toolbar">
        <CardHeader className="pb-4">
          <CardDescription>Query Surface</CardDescription>
          <CardTitle className="text-base tracking-normal">Search Alumni</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-2 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                className="pl-9"
                value={nlQuery}
                onChange={(e) => setNlQuery(e.target.value)}
                placeholder='Example: "finance alumni in Massachusetts at Apple"'
              />
            </div>
            <Button onClick={applyNlQuery} className="gap-2">
              <Sparkles className="h-4 w-4" />
              Parse Query
            </Button>
            <a href={`/api/export${queryString ? `?${queryString}` : ""}`}>
              <Button variant="secondary" className="w-full gap-2 xl:w-auto">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>

          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            <Input
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
              placeholder="Search alumni, company, title, or email"
            />

            <Select value={filters.company} onChange={(e) => setFilters((p) => ({ ...p, company: e.target.value }))}>
              <option value="all">All Companies</option>
              {options?.companies.map((item) => <option key={item}>{item}</option>)}
            </Select>

            <Select value={filters.location} onChange={(e) => setFilters((p) => ({ ...p, location: e.target.value }))}>
              <option value="all">All Locations</option>
              {options?.locations.map((item) => <option key={item}>{item}</option>)}
            </Select>

            <Select value={filters.industry} onChange={(e) => setFilters((p) => ({ ...p, industry: e.target.value }))}>
              <option value="all">All Industries</option>
              {options?.industries.map((item) => <option key={item}>{item}</option>)}
            </Select>

            <div className="flex gap-2">
              <Select value={filters.jobFunction} onChange={(e) => setFilters((p) => ({ ...p, jobFunction: e.target.value }))}>
                <option value="all">All Functions</option>
                {options?.jobFunctions.map((item) => <option key={item}>{item}</option>)}
              </Select>
              <Button variant="outline" onClick={resetFilters}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-end justify-between space-y-0">
          <div>
            <CardDescription>Live Alumni Index</CardDescription>
            <CardTitle className="text-base tracking-normal">Alumni ({data?.alumni.length ?? 0})</CardTitle>
          </div>
          <div className="text-xs text-stone-400">Open any alumnus for full contact and company context.</div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Function</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.alumni.map((row) => (
                <TableRow key={row.id} className="cursor-pointer" onClick={() => router.push(`/alumni/${row.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.05] text-xs font-semibold text-slate-300">
                        {row.first_name?.[0] ?? row.full_name[0]}
                        {row.last_name?.[0] ?? ""}
                      </div>
                      <div>
                        <div className="font-medium text-slate-100">{row.full_name}</div>
                        <div className="text-xs text-stone-400">{row.college ?? "UMass Amherst"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-slate-200">{row.company_name ?? "Independent"}</div>
                    <div className="text-xs text-stone-400">{row.company_website ?? "No domain"}</div>
                  </TableCell>
                  <TableCell className="text-slate-300">{row.job_title ?? "Unknown title"}</TableCell>
                  <TableCell className="text-slate-300">
                    {[row.location_city, row.location_state].filter(Boolean).join(", ") || row.location || "Unknown"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="neutral">{row.company_industry ?? "Other"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="blue">{row.job_function ?? "General"}</Badge>
                  </TableCell>
                  <TableCell>
                    {row.work_email ? (
                      <div className="inline-flex items-center gap-2 text-emerald-300">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="text-xs">{row.work_email}</span>
                      </div>
                    ) : (
                      <span className="text-stone-400">Unavailable</span>
                    )}
                  </TableCell>
                  <TableCell className="w-10 text-right text-stone-400">
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
