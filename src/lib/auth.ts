export function normalizeAuthRedirect(target: string | null | undefined, fallback = "/dashboard") {
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return fallback;
  }

  return target;
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

  return message;
}
