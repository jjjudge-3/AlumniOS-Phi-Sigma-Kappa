import Link from "next/link";
import { ExternalLink, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getActiveBrotherCoverLetters, getActiveBrothers } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function ActivesPage() {
  const authSupabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const actives = await getActiveBrothers();
  const supabase = createSupabaseAdminClient();
  const coverLetters = await getActiveBrotherCoverLetters(actives.map((active) => active.id));
  const coverLettersByProfile = coverLetters.reduce<Record<string, typeof coverLetters>>((acc, letter) => {
    const profileId = String(letter.profile_id);
    acc[profileId] ??= [];
    acc[profileId].push(letter);
    return acc;
  }, {});

  const rows = await Promise.all(
    actives.map(async (active) => {
      const activeCoverLetters = coverLettersByProfile[active.id] ?? [];
      const [resumeSigned, coverLetterSigned] = await Promise.all([
        active.resumeStoragePath
          ? supabase.storage.from("resumes").createSignedUrl(active.resumeStoragePath, 60 * 10)
          : Promise.resolve({ data: null }),
        Promise.all(
          activeCoverLetters.map(async (letter) => {
            const signed = await supabase.storage.from("resumes").createSignedUrl(String(letter.storage_path), 60 * 10);
            return {
              id: String(letter.id),
              fileName: String(letter.file_name),
              url: signed.data?.signedUrl ?? null,
            };
          }),
        ),
      ]);

      return {
        ...active,
        resumeUrl: resumeSigned.data?.signedUrl ?? null,
        coverLetters: coverLetterSigned.filter((letter) => letter.url),
      };
    }),
  );
  const orderedRows = [...rows].sort((a, b) => {
    if (user?.id && a.id === user.id && b.id !== user.id) return -1;
    if (user?.id && b.id === user.id && a.id !== user.id) return 1;
    return a.fullName.localeCompare(b.fullName);
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="page-title">Actives Dashboard</h1>
        <p className="page-subtitle">Track signed-up active brothers, their academic details, and the career materials they share with the chapter.</p>
      </div>

      <Card>
        <CardHeader>
          <CardDescription>Current Members</CardDescription>
          <CardTitle className="text-base tracking-normal">Actives ({rows.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>LinkedIn</TableHead>
                <TableHead>Hometown</TableHead>
                <TableHead>Major</TableHead>
                <TableHead>Graduation Year</TableHead>
                <TableHead>Current Grade</TableHead>
                <TableHead>Resume</TableHead>
                <TableHead>Cover Letter</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedRows.map((active) => (
                <TableRow key={active.id}>
                  <TableCell className="font-medium text-slate-950">
                    <div className="flex items-center gap-2">
                      <span>{active.fullName}</span>
                      {user?.id === active.id ? (
                        <span className="rounded-full border border-[rgba(221,45,74,0.18)] bg-[rgba(221,45,74,0.08)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-primary)]">
                          You
                        </span>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell>
                    {active.linkedinUrl ? (
                      <Link
                        className="brand-link inline-flex items-center gap-2 text-sm"
                        href={active.linkedinUrl}
                        target="_blank"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View LinkedIn
                      </Link>
                    ) : (
                      <span className="text-slate-400">Not provided</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-600">{active.hometown ?? "Not provided"}</TableCell>
                  <TableCell className="text-slate-600">{active.major ?? "Not provided"}</TableCell>
                  <TableCell className="text-slate-600">{active.graduationYear ?? "Unknown"}</TableCell>
                  <TableCell className="text-slate-600">{active.currentGrade ?? "Not provided"}</TableCell>
                  <TableCell>
                    {active.resumeUrl ? (
                      <Link
                        className="brand-link inline-flex items-center gap-2 text-sm"
                        href={active.resumeUrl}
                        target="_blank"
                      >
                        <FileText className="h-4 w-4" />
                        {active.resumeFileName ?? "View resume"}
                      </Link>
                    ) : (
                      <span className="text-slate-400">No resume uploaded</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {active.coverLetters.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        {active.coverLetters.map((letter) => (
                          <Link
                            key={letter.id}
                            className="brand-link inline-flex items-center gap-2 text-sm"
                            href={letter.url!}
                            target="_blank"
                          >
                            <FileText className="h-4 w-4" />
                            {letter.fileName}
                          </Link>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-400">Not uploaded yet</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
