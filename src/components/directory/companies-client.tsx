"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Building2, ChevronDown, ChevronUp, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CompanyRow = {
  company: string;
  companyDomain: string | null;
  companyLogoUrl: string | null;
  companyIndustry: string | null;
  alumniCount: number;
  locations: string;
  alumni: Array<{
    id: string;
    fullName: string;
    jobTitle: string | null;
    workEmail: string | null;
    linkedinUrl: string | null;
  }>;
};

export function CompaniesClient({ companies }: { companies: CompanyRow[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("all");
  const [location, setLocation] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialSearch && !search) {
      setSearch(initialSearch);
    }
  }, [initialSearch, search]);

  const industries = useMemo(
    () => [...new Set(companies.map((item) => item.companyIndustry).filter(Boolean) as string[])].sort(),
    [companies],
  );
  const locations = useMemo(
    () => [...new Set(companies.flatMap((item) => item.locations.split(", ").filter(Boolean)))].sort(),
    [companies],
  );

  const filtered = useMemo(
    () =>
      companies.filter((company) => {
        const matchesSearch =
          !search ||
          company.company.toLowerCase().includes(search.toLowerCase()) ||
          company.alumni.some((alumnus) => alumnus.fullName.toLowerCase().includes(search.toLowerCase()));
        const matchesIndustry = industry === "all" || company.companyIndustry === industry;
        const matchesLocation = location === "all" || company.locations.includes(location);
        return matchesSearch && matchesIndustry && matchesLocation;
      }),
    [companies, industry, location, search],
  );

  return (
    <div className="space-y-5">
      <Card className="app-toolbar">
        <CardHeader className="pb-4">
          <CardDescription>Company Search</CardDescription>
          <CardTitle className="text-base tracking-normal">Companies ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company or alumnus" />
          </div>
          <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="all">All Industries</option>
            {industries.map((item) => <option key={item}>{item}</option>)}
          </Select>
          <Select value={location} onChange={(e) => setLocation(e.target.value)}>
            <option value="all">All Locations</option>
            {locations.map((item) => <option key={item}>{item}</option>)}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Alumni</TableHead>
                <TableHead>People</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((company) => {
                const open = expanded[company.company] ?? false;
                return (
                  <Fragment key={company.company}>
                    <TableRow key={company.company}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {company.companyLogoUrl ? (
                            <Image
                              alt={company.company}
                              className="h-8 w-8 rounded-md border border-white/10 bg-white p-1"
                              height={32}
                              src={company.companyLogoUrl}
                              width={32}
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
                              <Building2 className="h-4 w-4 text-stone-400" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-100">{company.company}</div>
                            <div className="text-xs text-stone-400">{company.companyDomain ?? "No domain available"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{company.companyIndustry ?? "Other"}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{company.locations || "Unknown"}</TableCell>
                      <TableCell className="text-slate-100">{company.alumniCount}</TableCell>
                      <TableCell>
                        <button
                          className="inline-flex items-center gap-2 text-sm text-[#ffd6d6] hover:text-white"
                          onClick={() =>
                            setExpanded((current) => ({
                              ...current,
                              [company.company]: !open,
                            }))
                          }
                          type="button"
                        >
                          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          View alumni
                        </button>
                      </TableCell>
                    </TableRow>
                    {open ? (
                      <TableRow>
                        <TableCell className="bg-[#0b1420] px-4 py-4" colSpan={5}>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {company.alumni.map((alumnus) => (
                              <div key={alumnus.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                                <Link className="font-medium text-slate-100 hover:text-white" href={`/alumni/${alumnus.id}`}>
                                  {alumnus.fullName}
                                </Link>
                                <div className="mt-1 text-sm text-stone-300">{alumnus.jobTitle ?? "Unknown title"}</div>
                                <div className="mt-2 text-xs text-stone-400">
                                  {alumnus.workEmail ?? "No work email"}
                                </div>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
