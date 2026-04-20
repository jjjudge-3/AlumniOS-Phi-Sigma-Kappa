import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type CsvRow = Record<string, string>;

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
}

function toObjects(rows: string[][]): CsvRow[] {
  const [header, ...data] = rows;

  return data
    .filter((row) => row.some((value) => value.trim().length > 0))
    .map((row) =>
      Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])) as CsvRow,
    );
}

function safeJsonParse(value: string) {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function pickString(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function splitLocation(locationRaw: string | null) {
  if (!locationRaw) {
    return {
      city: null,
      state: null,
      country: null,
    };
  }

  const parts = locationRaw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 1) {
    return { city: parts[0], state: null, country: null };
  }

  if (parts.length === 2) {
    return { city: parts[0], state: parts[1], country: null };
  }

  return {
    city: parts[0] ?? null,
    state: parts[1] ?? null,
    country: parts[parts.length - 1] ?? null,
  };
}

function normalizeDomain(domain: string | null) {
  if (!domain) return null;
  return domain.replace(/^https?:\/\//, "").replace(/\/$/, "").toLowerCase();
}

function deriveIndustry(companyName: string | null, domain: string | null, title: string | null) {
  const value = `${companyName ?? ""} ${domain ?? ""} ${title ?? ""}`.toLowerCase();

  const checks: Array<[string, string[]]> = [
    ["Finance", ["capital", "asset", "wealth", "invest", "financial", "bank", "fund", "equity", "securities"]],
    ["Technology", ["software", "tech", "apple", "google", "microsoft", "oracle", "systems", "cloud", "data", "digital"]],
    ["Consulting", ["consult", "advisory", "advisor", "deloitte", "accenture", "mckinsey", "bain", "ey", "pwc"]],
    ["Healthcare", ["health", "medical", "hospital", "pharma", "biotech", "clinic", "therapeutics", "genomics"]],
    ["Government/Defense", ["army", "navy", "air force", "defense", "federal", "gov", "government", "public sector"]],
    ["Media", ["media", "news", "daily", "press", "entertainment", "animation", "studio"]],
    ["Real Estate", ["real estate", "realty", "property", "development", "construction"]],
    ["Logistics", ["marine", "shipping", "logistics", "supply", "transport", "freight"]],
    ["Education", ["university", "college", "school", "education"]],
    ["Consumer", ["retail", "fitness", "hospitality", "restaurant", "consumer"]],
  ];

  for (const [industry, keywords] of checks) {
    if (keywords.some((keyword) => value.includes(keyword))) return industry;
  }

  return "Other";
}

function deriveFunction(title: string | null) {
  const value = (title ?? "").toLowerCase();

  const checks: Array<[string, string[]]> = [
    ["Engineering", ["engineer", "developer", "architect", "technical", "software"]],
    ["Finance", ["finance", "financial", "investment", "analyst", "portfolio", "client relationship"]],
    ["Operations", ["operations", "superintendent", "logistics", "program manager", "project manager"]],
    ["Sales", ["sales", "business development", "account executive", "relationship manager"]],
    ["Marketing", ["marketing", "brand", "communications", "content", "editor"]],
    ["Product", ["product", "innovation"]],
    ["Design", ["designer", "animation", "creative", "compositor"]],
    ["Legal", ["legal", "attorney", "counsel"]],
    ["People", ["recruit", "talent", "hr", "people"]],
    ["Leadership", ["director", "vice president", "manager", "chief", "founder", "owner", "president"]],
  ];

  for (const [label, keywords] of checks) {
    if (keywords.some((keyword) => value.includes(keyword))) return label;
  }

  return "General";
}

function deriveMajor(row: CsvRow, enriched: Record<string, unknown> | null) {
  const education = Array.isArray(enriched?.education) ? enriched?.education : [];
  const firstEducation = education[0] as Record<string, unknown> | undefined;

  return pickString(row["undergraduate major"], firstEducation?.field_of_study);
}

function deriveGraduateSchool(row: CsvRow, enriched: Record<string, unknown> | null) {
  if (row["graduate school"]) return row["graduate school"];

  const education = Array.isArray(enriched?.education) ? enriched.education : [];
  for (const item of education as Record<string, unknown>[]) {
    const schoolName = typeof item.school_name === "string" ? item.school_name : "";
    if (schoolName && !schoolName.toLowerCase().includes("massachusetts")) {
      return schoolName;
    }
  }

  return null;
}

function companyLogoUrl(domain: string | null) {
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?sz=128&domain=${domain}`;
}

async function main() {
  const csvPath = join(process.cwd(), "prisma/data/alumni.csv");
  const csvText = readFileSync(csvPath, "utf8");
  const rows = toObjects(parseCsv(csvText));

  await prisma.alumni.deleteMany();

  const normalizedRows = rows.map((row) => {
    const enriched = safeJsonParse(row["Enriched Person JSON"]);
    const latestExperience =
      typeof enriched?.latest_experience === "object" && enriched?.latest_experience !== null
        ? (enriched.latest_experience as Record<string, unknown>)
        : null;

    const fullName = pickString(row["Full Name"], row["Full Name (2)"]) ?? "Unknown Alumni";
    const firstName = pickString(row["First Name"]) ?? fullName.split(" ")[0] ?? "Unknown";
    const lastName =
      pickString(row["Last Name"]) ??
      fullName.split(" ").slice(1).join(" ") ??
      "Unknown";
    const linkedinUrl = pickString(
      row["Final Linkedin URL"],
      row["Linkedin URL Waterfall"],
      row["Linkedin Url (2)"],
      enriched?.url,
    );
    const companyName = pickString(row["Company Name"], latestExperience?.company);
    const companyDomain = normalizeDomain(
      pickString(row["Company Domain"], latestExperience?.company_domain),
    );
    const jobTitle = pickString(row["Job Title"], latestExperience?.title);
    const locationRaw = pickString(row["Location"], enriched?.location_name, latestExperience?.locality);
    const location = splitLocation(locationRaw);
    const industry = deriveIndustry(companyName, companyDomain, jobTitle);
    const functionName = deriveFunction(jobTitle);

    return {
      fullName,
      firstName,
      lastName,
      college: pickString(row["College"]),
      compositeYears: pickString(row["All Composite Years"]),
      linkedinValidation: pickString(row["LinkedIn UMass Validation"]),
      linkedinUrl,
      jobTitle,
      currentCompany: companyName,
      companyLinkedinUrl: pickString(row["company linkedin URL"], latestExperience?.url),
      companyDomain,
      workEmail: pickString(row["Work Email"]),
      locationRaw,
      locationCity: location.city,
      locationState: location.state,
      locationCountry: location.country,
      major: deriveMajor(row, enriched),
      graduateSchool: deriveGraduateSchool(row, enriched),
      graduateSchoolMajor: pickString(row["graduate school major"]),
      companyIndustry: industry,
      jobFunction: functionName,
      companyLogoUrl: companyLogoUrl(companyDomain),
    };
  });

  const companyCounts = normalizedRows.reduce<Record<string, number>>((acc, row) => {
    const key = row.companyDomain ?? row.currentCompany ?? row.fullName;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  for (const row of normalizedRows) {
    const key = row.companyDomain ?? row.currentCompany ?? row.fullName;

    await prisma.alumni.create({
      data: {
        ...row,
        alumniAtCompanyCount: companyCounts[key] ?? 1,
      },
    });
  }

  console.log(`Seeded ${normalizedRows.length} alumni records from CSV.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
