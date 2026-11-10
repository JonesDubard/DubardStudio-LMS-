import { Palette, Wifi, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ProductComposition } from "@/components/marketing/ProductComposition";
import { buttonPrimary, buttonSecondary } from "@/lib/ui/styles";

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Wifi,
    title: "Low-bandwidth first",
    body: "Designed with connectivity constraints in mind, so a school can offer lessons and assignments where internet access may be limited. The student experience is built for phones.",
  },
  {
    icon: Palette,
    title: "True white-label",
    body: "Give your school a learning space that carries its own name, colours, logo, and web address.",
  },
  {
    icon: Zap,
    title: "Simple to use",
    body: "Teachers publish lessons and assignments. Students open them. Parents can check upcoming work and grades. The paths are short on purpose.",
  },
];

const reasons: { title: string; body: string }[] = [
  {
    title: "A front door that looks like your school",
    body: "Each school is reached at its own address and shown with its name, colours, and logo.",
  },
  {
    title: "The academic year, in one place",
    body: "Administrators set up years, terms, classes, and subjects, then keep people and work against that structure.",
  },
  {
    title: "Work students can open",
    body: "Teachers publish lessons and assignments. Students open them on a phone, from a feed rather than a stack of separate tools.",
  },
  {
    title: "A view for parents",
    body: "Parents can check upcoming assignments and grades for their children.",
  },
  {
    title: "Beside the tools you already use",
    body: "LearnGrid carries the academic work. It does not replace the messages, calls, or SMS your school already relies on.",
  },
];

export function MarketingHome() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-2 lg:gap-16">
        <div className="marketing-rise max-w-xl">
          <p className="text-sm font-medium text-brand-primary">For school leaders</p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">
            The simplest, fastest academic delivery platform for your school.
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-secondary sm:text-lg">
            Students open lessons and assignments on a phone. Each school has its
            own address, name, colours, and logo. LearnGrid sits beside the
            communication tools your school already uses.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className={`${buttonPrimary} w-full sm:w-auto`}>
              Book a Pilot
            </Link>
            <a href="#features" className={`${buttonSecondary} w-full sm:w-auto`}>
              Explore Features
            </a>
          </div>
        </div>
        <ProductComposition />
      </section>

      <section id="features" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-sm font-medium text-brand-primary">Features</p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Academic delivery that fits the school you already run.
          </h2>
          <ul className="mt-12 border-t border-line">
            {features.map((feature, index) => (
              <li
                key={feature.title}
                className="grid gap-4 border-b border-line py-8 md:grid-cols-12 md:items-start md:gap-8 md:py-12"
              >
                <div className="md:col-span-5">
                  <span
                    className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${
                      index === 1
                        ? "bg-brand-primary text-white"
                        : index === 2
                          ? "border border-brand-border bg-surface text-brand-primary"
                          : "bg-brand-subtle text-brand-primary"
                    }`}
                  >
                    <feature.icon aria-hidden size={20} strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                    {feature.title}
                  </h3>
                </div>
                <p className="max-w-prose text-base leading-7 text-ink-secondary md:col-span-7 md:pt-1">
                  {feature.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="why" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-12 md:gap-16 md:py-24">
          <div className="md:col-span-4">
            <p className="text-sm font-medium text-brand-primary">Why LearnGrid</p>
            <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              One place for the academic work.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-secondary">
              Built for owners, principals, and academic leads who need a school-branded
              way to publish lessons and keep track of the work.
            </p>
          </div>
          <ol className="md:col-span-7 md:col-start-6">
            {reasons.map((reason, index) => (
              <li
                key={reason.title}
                className="border-t border-line py-6 first:border-t-0 first:pt-0 last:pb-0"
              >
                <p className="text-xs font-medium tabular-nums text-ink-muted">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">
                  {reason.title}
                </h3>
                <p className="mt-2 max-w-prose text-sm leading-6 text-ink-secondary">
                  {reason.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-brand-primary text-white" aria-labelledby="pilot-heading">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2
              id="pilot-heading"
              className="text-balance text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]"
            >
              Bring your school into the future of academic delivery.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white md:text-lg">
              LearnGrid is accepting a limited number of pilot schools.
            </p>
            <Link href="/contact" className={`${buttonSecondary} mt-8`}>
              Apply for a Pilot
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:items-end md:justify-between md:py-24">
          <div className="max-w-xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Let&apos;s explore what LearnGrid could do for your school.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-secondary">
              Tell us a little about your school, and our team will get in touch to
              discuss a possible pilot.
            </p>
          </div>
          <Link href="/contact" className={`${buttonPrimary} w-full shrink-0 sm:w-auto`}>
            Book a Pilot
          </Link>
        </div>
      </section>
    </main>
  );
}
