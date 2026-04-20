import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      return NextResponse.json({ error: listError.message }, { status: 500 });
    }

    const hasBucket = buckets?.some((bucket) => bucket.name === "resumes");

    if (!hasBucket) {
      const { error: createError } = await supabase.storage.createBucket("resumes", {
        public: false,
        fileSizeLimit: 10485760,
      });

      if (createError) {
        return NextResponse.json(
          {
            error:
              createError.message === "Invalid API key"
                ? "Resume storage is not fully configured yet. Update the Supabase service role key or create the `resumes` bucket in Supabase Storage."
                : createError.message,
          },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected storage setup failure." },
      { status: 500 },
    );
  }
}
