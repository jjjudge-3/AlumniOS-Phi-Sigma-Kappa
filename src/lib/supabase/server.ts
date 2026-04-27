import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Components can read cookies during render but cannot always
            // mutate them. Supabase only needs these writes in actions/handlers.
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Ignore cookie mutation attempts during read-only render paths.
          }
        },
      },
    },
  );
}
