import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonSecondary } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "School Login | LearnGrid",
  description:
    "LearnGrid is opened from your school's own web address. Ask your school administrator for the link.",
};

export default async function SchoolAccessPage() {
  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain) notFound();

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().replace(/:\d+$/, "");

  return (
    <main className="mx-auto max-w-xl px-4 py-16 md:py-24">
      <p className="text-sm font-medium text-brand-primary">School login</p>
      <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
        Use your school&apos;s own address.
      </h1>
      <p className="mt-5 text-base leading-7 text-ink-secondary">
        LearnGrid is accessed through your school&apos;s unique web address. Please
        use the link provided by your school administrator.
      </p>
      <p className="mt-4 text-sm leading-6 text-ink-secondary">
        That link opens your school&apos;s sign-in page. This site does not ask for
        a password.
      </p>
      {root ? (
        <p className="mt-4 text-sm leading-6 text-ink-secondary">
          The address looks similar to{" "}
          <span className="whitespace-nowrap font-medium text-ink">yourschool.{root}</span>.
        </p>
      ) : null}
      <Link href="/" className={`${buttonSecondary} mt-8`}>
        Back to LearnGrid
      </Link>
    </main>
  );
}
