import { NextResponse } from "next/server";
import { getCompanies } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getCompanies());
}
