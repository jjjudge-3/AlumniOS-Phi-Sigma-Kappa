import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { normalizeAuthRedirect } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = normalizeAuthRedirect(requestUrl.searchParams.get("next"), "/dashboard");

  if (errorDescription) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("error", errorDescription);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.redirect(new URL(next, request.url));
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: "", ...options });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("error", error.message);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}
