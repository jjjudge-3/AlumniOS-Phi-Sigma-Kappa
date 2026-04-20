import { Suspense } from "react";
import { DirectoryClient } from "@/components/directory/directory-client";

export const dynamic = "force-dynamic";

export default function DirectoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Alumni</h1>
        <p className="page-subtitle">Search alumni, current roles, company placement, and available work emails.</p>
      </div>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading directory...</div>}>
        <DirectoryClient />
      </Suspense>
    </div>
  );
}
