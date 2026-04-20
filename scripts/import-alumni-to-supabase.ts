import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

    if (char === '"') inQuotes = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
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
    .map((row) => Object.fromEntries(header.map((column, index) => [column, row[index] ?? ""])) as CsvRow);
}

function parseLocation(location: string | null) {
  if (!location) return { state: null, city: null };
  const parts = location.split(",").map((item) => item.trim()).filter(Boolean);
  return {
    city: parts[0] ?? null,
    state: parts.length > 1 ? parts[1] : null,
  };
}

function inferIndustry(companyName: string | null, title: string | null) {
  const value = `${companyName ?? ""} ${title ?? ""}`.toLowerCase();
  if (/salesforce|oracle|ping|software|identity|data|ai|cloud/.test(value)) return "Technology";
  if (/law|counsel|attorney|legal/.test(value)) return "Legal";
  if (/health|healthcare|medical|pharma/.test(value)) return "Healthcare";
  if (/sales|account|business development/.test(value)) return "Sales";
  if (/operations|logistics|supply chain/.test(value)) return "Operations";
  if (/finance|investment|capital|bank/.test(value)) return "Finance";
  return "Other";
}

function inferFunction(title: string | null) {
  const value = (title ?? "").toLowerCase();
  if (/sales|account/.test(value)) return "Sales";
  if (/engineer|developer/.test(value)) return "Engineering";
  if (/counsel|attorney|legal/.test(value)) return "Legal";
  if (/operations|logistics/.test(value)) return "Operations";
  if (/director|manager|president/.test(value)) return "Leadership";
  return "General";
}

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  const csvPath = join(process.cwd(), "supabase/data/alumni-example.csv");
  const csvText = readFileSync(csvPath, "utf8");
  const rows = toObjects(parseCsv(csvText));
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const payload = rows.map((row) => {
    const location = parseLocation(row["Location"] || null);
    const companyWebsite = row["company website"]?.trim() || null;
    return {
      full_name: row["Full Name"] || "",
      first_name: row["First Name"] || null,
      last_name: row["Last Name"] || null,
      college: row["College"] || null,
      earliest_year: row["Earliest Year"] || null,
      latest_year: row["Latest Year"] || null,
      positions_held: row["Positions Held"] || null,
      all_years_on_composite: row["All Years on Composite"] || null,
      linkedin_url: row["Contact Linkedin Url"] || null,
      job_title: row["Job Title"] || null,
      company_name: row["Company Name"] || null,
      location: row["Location"] || null,
      work_email: row["Work Email"] || null,
      company_linkedin_url: row["company linkedin URL"] || null,
      company_website: companyWebsite,
      company_logo_url: companyWebsite ? `https://www.google.com/s2/favicons?sz=128&domain=${companyWebsite}` : null,
      company_industry: inferIndustry(row["Company Name"] || null, row["Job Title"] || null),
      job_function: inferFunction(row["Job Title"] || null),
      enriched_person_json: row["Enriched Person JSON"] ? JSON.parse(row["Enriched Person JSON"]) : null,
      location_city: location.city,
      location_state: location.state,
    };
  });

  const { error: deleteError } = await supabase.from("alumni").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (deleteError) throw deleteError;

  const { error } = await supabase.from("alumni").insert(payload);
  if (error) throw error;

  console.log(`Imported ${payload.length} alumni rows to Supabase.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
