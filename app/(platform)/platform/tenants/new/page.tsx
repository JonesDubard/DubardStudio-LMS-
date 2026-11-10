"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createTenant } from "@/app/(platform)/platform/actions";
import { FormField } from "@/components/shared/FormField";
import { alertError, buttonPrimary, buttonSecondary, fieldControl, fieldLabel } from "@/lib/ui/styles";

export default function CreateTenantPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const result = await createTenant({ name, subdomain, contactName, contactEmail });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/platform/tenants");
    router.refresh();
  }

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1100px] p-4 lg:p-8">
        <header className="mb-8">
          <p className="text-xs font-medium text-ink-muted">Tenants</p>
          <h1 className="mt-1 break-words text-xl font-semibold tracking-tight md:text-2xl">
            Create Tenant
          </h1>
          <p className="mt-2 text-sm text-ink-secondary">
            Provision a new school on the LMS platform.
          </p>
        </header>

        <form onSubmit={(event) => void onSubmit(event)}>
          <section className="rounded-lg border border-line bg-surface shadow-card">
            <div className="border-b border-line-subtle px-6 py-5">
              <h2 className="font-semibold">Tenant Information</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <FormField id="school-name" label="School Name">
                <input
                  id="school-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={fieldControl}
                  required
                />
              </FormField>

              <FormField id="contact-person" label="Contact Person">
                <input
                  id="contact-person"
                  type="text"
                  value={contactName}
                  onChange={(event) => setContactName(event.target.value)}
                  className={fieldControl}
                  required
                />
              </FormField>

              <FormField id="contact-email" label="Contact Email">
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(event) => setContactEmail(event.target.value)}
                  className={fieldControl}
                  required
                />
              </FormField>

              <div>
                <label
                  htmlFor="subdomain"
                  className={fieldLabel}
                >
                  Subdomain
                </label>
                <input
                  id="subdomain"
                  type="text"
                  value={subdomain}
                  onChange={(event) => setSubdomain(event.target.value)}
                  className={fieldControl}
                />
                <div className="mt-2 text-xs text-ink-secondary">
                  Preview:{" "}
                  <span className="font-medium text-ink">
                    {subdomain || "school"}.{process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "localhost"}
                  </span>
                </div>
              </div>

              <FormField id="subscription-status" label="Subscription Status">
                <select
                  id="subscription-status"
                  defaultValue="Trial"
                  disabled
                  className={fieldControl}
                >
                  <option>Trial</option>
                </select>
                <p className="mt-2 text-xs text-ink-secondary">
                  New schools start on a trial. Change the status after the school is created.
                </p>
              </FormField>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-line bg-surface-muted p-6">
            <h2 className="font-semibold">What happens on creation?</h2>
            <p className="mt-2 text-sm text-ink-secondary">
              On creation, the system will automatically:
            </p>

            <ul className="mt-4 space-y-3 text-sm">
              <li>Create the tenant record</li>
              <li>Set the default colours, a trial subscription, and provisioning status</li>
            </ul>
            {error ? (
              <p role="alert" className={`${alertError} mt-4`}>
                {error}
              </p>
            ) : null}
          </section>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link
              href="/platform/tenants"
              className={buttonSecondary}
            >
              Cancel
            </Link>
            <button type="submit" disabled={pending} className={buttonPrimary}>
              {pending ? "Creating..." : "Create Tenant"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
