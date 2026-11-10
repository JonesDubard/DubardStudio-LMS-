import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { DemoRequestForm } from "@/components/marketing/DemoRequestForm";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Book a Pilot | TerraLearn",
  description:
    "Tell TerraLearn about your school and request a conversation about a pilot.",
};

export default async function ContactPage() {
  const subdomain = (await headers()).get("x-tenant-subdomain");
  if (subdomain) notFound();

  return (
    <main className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
      <div className="lg:col-span-5">
        <p className="text-sm font-medium text-brand-primary">Book a pilot</p>
        <h1 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
          Let&apos;s explore what TerraLearn could do for your school.
        </h1>
        <p className="mt-4 text-base leading-7 text-ink-secondary">
          Tell us a little about your school, and our team will get in touch to
          discuss a possible pilot.
        </p>
      </div>
      <div className="lg:col-span-7">
        <div className={`${surfaceCard} p-5 sm:p-8`}>
          <DemoRequestForm />
        </div>
      </div>
    </main>
  );
}
