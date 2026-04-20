import { CompaniesClient } from "@/components/directory/companies-client";
import { getCompanies } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  const companies = await getCompanies();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Companies</h1>
        <p className="page-subtitle">See where alumni work, how concentrated each company is, and who you can reach there.</p>
      </div>
      <CompaniesClient companies={companies} />
    </div>
  );
}
