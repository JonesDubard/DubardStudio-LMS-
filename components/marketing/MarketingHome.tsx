import { BookOpen, Palette, Users, Wifi, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { ProductComposition } from "@/components/marketing/ProductComposition";
import { buttonProduct, buttonSecondary, surfaceCard } from "@/lib/ui/styles";

const features: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Wifi,
    title: "Low-bandwidth first",
    body: "Lessons and assignments stay usable where the connection is limited. The student experience is built for phones.",
  },
  {
    icon: Palette,
    title: "True white-label",
    body: "Each school keeps its own name, colours, logo, and web address.",
  },
  {
    icon: Zap,
    title: "Simple lesson and assignment delivery",
    body: "Teachers publish lessons and assignments. Students open them. The paths stay short.",
  },
  {
    icon: BookOpen,
    title: "Academic organization",
    body: "Years, terms, classes, and subjects stay in one structure for the people and the work.",
  },
  {
    icon: Users,
    title: "Parent visibility",
    body: "Parents can check upcoming assignments and grades for the children linked to them.",
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
    body: "TerraLearn carries the academic work. It does not replace the messages, calls, or SMS your school already relies on.",
  },
];

export function MarketingHome() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-10 md:pb-24 md:pt-16 lg:grid-cols-2 lg:gap-16">
        <div className="motion-rise max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-product-blue">
            Academic delivery for Liberian schools
          </p>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-tight text-ink sm:text-5xl sm:leading-[1.08]">
            Your school&apos;s academic work. Finally, in one place.
          </h1>
          <p className="mt-5 text-base leading-7 text-ink-secondary sm:text-lg">
            Give teachers a simpler way to share lessons and assignments, students an
            easier way to learn, and school leaders a clearer view of academic work.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/contact" className={`${buttonProduct} w-full sm:w-auto`}>
              Book a Pilot
            </Link>
            <a href="#features" className={`${buttonSecondary} w-full sm:w-auto`}>
              Explore Features
            </a>
          </div>
        </div>
        <div className="motion-rise-delayed">
          <ProductComposition />
        </div>
      </section>

      <section id="features" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-product-blue">
            Features
          </p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            Academic delivery that fits the school you already run.
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <li
                key={feature.title}
                className={`${surfaceCard} p-5 hover:-translate-y-0.5 hover:shadow-lift`}
              >
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-product-soft text-product-blue">
                  <feature.icon aria-hidden size={20} strokeWidth={1.75} />
                </span>
                <h3 className="mt-4 text-lg font-semibold tracking-tight text-ink">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-ink-secondary">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="roles" className="scroll-mt-20 border-t border-line">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-product-blue">
            How it is used
          </p>
          <h2 className="mt-3 max-w-xl text-balance text-3xl font-semibold tracking-tight text-ink">
            The same academic work, for each role that already has it.
          </h2>
          <ul className="mt-10 grid gap-4 md:grid-cols-3">
            <li className={`${surfaceCard} p-5`}>
              <h3 className="text-base font-semibold text-ink">School leadership</h3>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Set the year, the people, and the school&apos;s own name and colours.
              </p>
            </li>
            <li className={`${surfaceCard} p-5`}>
              <h3 className="text-base font-semibold text-ink">Teachers</h3>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Publish lessons and assignments, then open submissions to grade them.
              </p>
            </li>
            <li className={`${surfaceCard} p-5`}>
              <h3 className="text-base font-semibold text-ink">Students</h3>
              <p className="mt-2 text-sm leading-6 text-ink-secondary">
                Open lessons and hand in assignments from a phone, then check released grades.
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section id="why" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-12 md:gap-16 md:py-24">
          <div className="md:col-span-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-product-blue">
              Why TerraLearn
            </p>
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
                <p className="text-xs font-semibold tabular-nums text-product-blue">
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

      <section className="bg-product-navy text-white" aria-labelledby="pilot-heading">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="max-w-2xl">
            <h2
              id="pilot-heading"
              className="text-balance text-3xl font-semibold tracking-tight md:text-5xl md:leading-[1.1]"
            >
              Bring your school into a better way of delivering academic work.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/80 md:text-lg">
              TerraLearn is welcoming a limited number of pilot schools. Let&apos;s explore
              how it could work for your school.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-product-navy transition-colors duration-200 hover:bg-product-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-product-navy"
            >
              Apply for a Pilot
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-16 md:flex-row md:items-end md:justify-between md:py-24">
          <div className="max-w-xl">
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              Let&apos;s explore what TerraLearn could do for your school.
            </h2>
            <p className="mt-4 text-base leading-7 text-ink-secondary">
              Tell us a little about your school, and our team will get in touch to
              discuss a possible pilot.
            </p>
          </div>
          <Link href="/contact" className={`${buttonProduct} w-full shrink-0 sm:w-auto`}>
            Book a Pilot
          </Link>
        </div>
      </section>
    </main>
  );
}
