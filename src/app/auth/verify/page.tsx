import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildAuthConfirmPath, normalizeAuthRedirect } from "@/lib/auth";

type VerifyPageProps = {
  searchParams: {
    next?: string;
    redirect_to?: string;
    token_hash?: string;
    type?: string;
    error_description?: string;
  };
};

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  let next = normalizeAuthRedirect(searchParams.next, "/dashboard");

  if (searchParams.redirect_to) {
    try {
      const redirectUrl = new URL(searchParams.redirect_to);
      next = normalizeAuthRedirect(`${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`, "/dashboard");
    } catch {
      next = normalizeAuthRedirect(searchParams.next, "/dashboard");
    }
  }

  const tokenHash = searchParams.token_hash;
  const type = searchParams.type;
  const error = searchParams.error_description;
  const hasToken = Boolean(tokenHash && type);
  const confirmHref = hasToken ? `${buildAuthConfirmPath(next)}&token_hash=${encodeURIComponent(tokenHash!)}&type=${encodeURIComponent(type!)}` : "/login";

  return (
    <div className="auth-shell flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardDescription>Email verification</CardDescription>
          <CardTitle className="text-2xl tracking-tight text-slate-950">Confirm your email</CardTitle>
          <p className="text-sm text-slate-600">
            Finish signup by clicking the button below. This extra step helps avoid expired links caused by email security scanners.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-slate-600">
          {error ? <p className="text-red-300">{error}</p> : null}
          {!hasToken ? <p>The confirmation details were missing. Request a fresh confirmation email and open the newest link.</p> : null}
          <div className="flex items-center gap-3">
            <Link className="brand-link" href={confirmHref}>
              Confirm email
            </Link>
            <Link className="brand-link" href="/signup">
              Back to signup
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
