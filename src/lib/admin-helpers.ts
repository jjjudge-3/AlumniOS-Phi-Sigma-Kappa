export const ADMIN_EMAIL = "jjjudge@umass.edu";

export function isAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase() === ADMIN_EMAIL;
}
