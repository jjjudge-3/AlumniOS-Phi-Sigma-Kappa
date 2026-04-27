"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type CompanyRow = {
  id: string;
  company: string;
  companyDomain: string | null;
  companyWebsite?: string | null;
  companyLinkedinUrl?: string | null;
  companyLogoUrl: string | null;
  companyIndustry: string | null;
  companySummary?: string | null;
  alumniCount: number;
  alumni: Array<{
    id: string;
    fullName: string;
    jobTitle: string | null;
    yearsOnComposite: string | null;
    workEmail: string | null;
    linkedinUrl: string | null;
  }>;
};

export function CompaniesClient({ companies }: { companies: CompanyRow[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams.get("search")?.trim() ?? "";
  const [search, setSearch] = useState(initialSearch);
  const [industry, setIndustry] = useState("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const normalizedSearch = search.trim().toLowerCase();

  const industries = useMemo(
    () => [...new Set(companies.map((item) => item.companyIndustry).filter(Boolean) as string[])].sort(),
    [companies],
  );
  const filtered = useMemo(
    () =>
      companies.filter((company) => {
        const matchesSearch =
          !normalizedSearch ||
          company.company.toLowerCase().includes(normalizedSearch) ||
          (company.companyDomain ?? "").toLowerCase().includes(normalizedSearch);
        const matchesIndustry = industry === "all" || company.companyIndustry === industry;
        return matchesSearch && matchesIndustry;
      }),
    [companies, industry, normalizedSearch],
  );

  return (
    <div className="space-y-5">
      <Card className="app-toolbar">
        <CardHeader className="pb-4">
          <CardDescription>Company Search</CardDescription>
          <CardTitle className="text-base tracking-normal">Companies ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 md:grid-cols-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company name or domain"
            />
          </div>
          <Select value={industry} onChange={(e) => setIndustry(e.target.value)}>
            <option value="all">All Industries</option>
            {industries.map((item) => <option key={item}>{item}</option>)}
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
                <TableHead>Alumni</TableHead>
                <TableHead>People</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody key={`${normalizedSearch}:${industry}:${filtered.length}`}>
              {filtered.map((company) => {
                const open = expanded[company.company] ?? false;
                const companyKey = company.companyDomain ?? company.company;
                return (
                  <Fragment key={companyKey}>
                    <TableRow>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {company.companyLogoUrl ? (
                            <CompanyLogo className="h-8 w-8 rounded-md" name={company.company} src={company.companyLogoUrl} />
                          ) : (
                            <CompanyLogo className="h-8 w-8 rounded-md" name={company.company} src={null} />
                          )}
                          <div>
                            <Link className="font-medium text-slate-950 hover:text-[var(--brand-primary)]" href={`/companies/${company.id}`}>
                              {company.company}
                            </Link>
                            <div className="text-xs text-slate-500">{company.companyDomain ?? "No domain available"}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="neutral">{company.companyIndustry ?? "Other"}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-950">{company.alumniCount}</TableCell>
                      <TableCell>
                        <button
                          className="brand-link inline-flex items-center gap-2 text-sm"
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
                        <TableCell className="bg-slate-50 px-4 py-4" colSpan={4}>
                          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                            {company.alumni.map((alumnus) => (
                              <div key={alumnus.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                <Link className="font-medium text-slate-950 hover:text-[var(--brand-primary)]" href={`/alumni/${alumnus.id}`}>
                                  {alumnus.fullName}
                                </Link>
                                <div className="mt-1 text-sm text-slate-600">{alumnus.jobTitle ?? "Unknown title"}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {alumnus.yearsOnComposite ?? "Composite years unavailable"}
                                </div>
                                <div className="mt-2 text-xs text-slate-500">
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
