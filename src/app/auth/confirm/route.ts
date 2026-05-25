import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { buildLoginPath, normalizeAuthRedirect, normalizeAuthRedirectUrl } from "@/lib/auth";

function redirectToLogin(request: NextRequest, message: string, next?: string) {
  const loginUrl = new URL(buildLoginPath({ error: message, next }), request.url);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type") as EmailOtpType | null;
  const redirectToParam = requestUrl.searchParams.get("redirect_to");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const next = redirectToParam
    ? normalizeAuthRedirectUrl(redirectToParam, requestUrl.origin, "/dashboard")
    : normalizeAuthRedirect(requestUrl.searchParams.get("next"), "/dashboard");

  if (errorDescription) {
    return redirectToLogin(request, errorDescription, next);
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

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (error) {
      return redirectToLogin(request, error.message, next);
    }

    return response;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return redirectToLogin(request, error.message, next);
    }

    return response;
  }

  return redirectToLogin(request, "Missing email confirmation token.", next);
}
