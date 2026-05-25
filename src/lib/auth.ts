export function normalizeAuthRedirect(target: string | null | undefined, fallback = "/dashboard") {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }

  return target;
}

export function normalizeAuthRedirectUrl(target: string | null | undefined, origin: string, fallback = "/dashboard") {
  if (!target) {
    return fallback;
  }

  try {
    const url = new URL(target, origin);
    if (url.origin !== origin) {
      return fallback;
    }

    return normalizeAuthRedirect(`${url.pathname}${url.search}${url.hash}`, fallback);
  } catch {
    return normalizeAuthRedirect(target, fallback);
  }
}

export function buildAuthConfirmPath(next: string) {
  return `/auth/confirm?next=${encodeURIComponent(next)}`;
}

export function buildAuthVerifyPath(next: string) {
  return `/auth/verify?next=${encodeURIComponent(next)}`;
}

export function buildLoginPath(options?: { next?: string | null; error?: string | null }) {
  const params = new URLSearchParams();
  const next = normalizeAuthRedirect(options?.next, "/dashboard");

  if (next !== "/dashboard") {
    params.set("next", next);
  }

  if (options?.error) {
    params.set("error", options.error);
  }

  const query = params.toString();
  return query ? `/login?${query}` : "/login";
}

export function normalizeAuthError(message: string) {
  const value = message.toLowerCase();

  if (value.includes("invalid login credentials")) {
    return "That email and password combination was not recognized.";
  }

  if (value.includes("user already registered")) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (value.includes("password should be at least")) {
    return "Choose a password with at least 6 characters.";
  }

  if (value.includes("email not confirmed")) {
    return "Confirm your email first, then sign in from the same browser.";
  }

  if (
    value.includes("expired") ||
    value.includes("otp_expired") ||
    value.includes("email link is invalid") ||
    value.includes("token has expired or is invalid")
  ) {
    return "That email confirmation link is no longer valid. Request a fresh confirmation email and open the newest link.";
  }

  return message;
}
