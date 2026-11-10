import type { Metadata } from "next";
import Link from "next/link";
import { homePathFromAccessToken } from "@/lib/auth/home-path";
import { createClient } from "@/lib/supabase/server";
import { buttonSecondary, surfaceCard } from "@/lib/ui/styles";
import { ProfileForm } from "./ProfileForm";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ child?: string }>;
}) {
  const { child } = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const { data: sessionData } = await supabase.auth.getSession();
  const home = homePathFromAccessToken(sessionData.session?.access_token);
  const backHref =
    home.startsWith("/parent") && child ? `${home}?child=${encodeURIComponent(child)}` : home;

  const profileResult = userData.user
    ? await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", userData.user.id)
        .maybeSingle<{ full_name: string; email: string }>()
    : { data: null, error: null };

  if (profileResult.error) {
    throw new Error(`profiles: ${profileResult.error.message}`);
  }

  const profile = profileResult.data;
  const loginEmail = userData.user?.email ?? profile?.email ?? "";

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-muted">Account</p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-ink md:text-2xl">
              Settings
            </h1>
          </div>
          <Link href={backHref} className={buttonSecondary}>
            Back
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
        {profile ? (
          <ProfileForm fullName={profile.full_name} email={loginEmail} />
        ) : (
          <p className={`${surfaceCard} p-5 text-sm leading-6 text-ink-secondary`}>
            This account has no school profile.
          </p>
        )}
      </main>
    </div>
  );
}
