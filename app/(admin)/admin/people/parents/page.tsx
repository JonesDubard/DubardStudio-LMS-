import type { Metadata } from "next";
import { ParentChildLinkPanel } from "@/components/admin/ParentChildLinkPanel";
import { PeopleSubNav } from "@/components/admin/PeopleSubNav";
import { getParents } from "@/lib/stubs/get-parents";

export const metadata: Metadata = {
  title: "Parent-Child Linking",
};

export default function AdminParentsPage() {
  const data = getParents();

  return (
    <main className="min-w-0 flex-1">
      <header className="border-b border-line bg-surface px-4 py-5 md:px-8 md:py-6">
        <p className="text-sm text-ink-secondary">{data.eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.title}</h1>
        <p className="mt-1 text-sm text-ink-secondary">{data.subtitle}</p>
      </header>

      <div className="space-y-6 p-4 md:p-8">
        <PeopleSubNav />

        <div className="grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-lg border border-line bg-surface shadow-card">
            <div className="border-b border-line p-5">
              <h2 className="font-semibold">{data.parentsListTitle}</h2>
              <p className="mt-1 text-sm text-ink-secondary">
                {data.parentsListDescription}
              </p>
            </div>

            <div className="divide-y divide-line">
              {data.parents.map((parent) => (
                <button
                  key={parent.id}
                  type="button"
                  className={
                    parent.selected
                      ? "w-full border-l-4 border-line-strong bg-surface-muted p-5 text-left"
                      : "w-full p-5 text-left"
                  }
                >
                  <p
                    className={
                      parent.selected ? "font-semibold" : "font-medium"
                    }
                  >
                    {parent.name}
                  </p>
                  <p className="mt-1 text-sm text-ink-secondary">{parent.email}</p>
                </button>
              ))}
            </div>
          </section>

          <ParentChildLinkPanel
            parentName={data.selectedParentName}
            parentEmail={data.selectedParentEmail}
            linkedChildren={data.linkedChildren}
            searchDefault={data.searchDefault}
            searchPlaceholder={data.searchPlaceholder}
            searchResult={data.searchResult}
            confirmLabel={data.confirmLabel}
            linkChildTitle={data.linkChildTitle}
            linkChildDescription={data.linkChildDescription}
          />
        </div>
      </div>
    </main>
  );
}
