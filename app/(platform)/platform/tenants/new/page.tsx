"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { createTenant } from "@/app/(platform)/platform/actions";
import { FormField } from "@/components/shared/FormField";
import { ResendInviteButton } from "@/components/platform/ResendInviteButton";
import { alertError, buttonPrimary, buttonSecondary, fieldControl, fieldLabel } from "@/lib/ui/styles";
import { CheckCircle2 } from "lucide-react";

export default function CreateTenantPage() {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  
  // US-007.3: how many terms the school year has. 3 is the default.
  const [termCount, setTermCount] = useState("3");

  // Set once the school exists (US-008b: the invite is emailed, not shown)
  const [created, setCreated] = useState<{
    id: string;
    inviteSent: boolean;
    warning: string | null;
    email: string;
    subdomain: string;
  } | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    
    const result = await createTenant({
      name,
      subdomain,
      contactName,
      contactEmail,
      termCount: Number(termCount),
    });
    setPending(false);
    
    if (!result.ok) {
      setError(result.error);
      return;
    }

    // The school exists. The invite email is sent by the server; if it failed, the
    // warning says so and the Resend button below sends it again.
    setCreated({
      id: result.id ?? "",
      inviteSent: result.inviteSent === true,
      warning: result.inviteWarning ?? null,
      email: contactEmail.trim(),
      subdomain: subdomain.trim().toLowerCase(),
    });
  }

  // --- SUCCESS SCREEN ---
  if (created) {
    const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "terralearn.space";
    return (
      <main className="min-w-0 flex-1">
        <div className="mx-auto max-w-[600px] p-4 lg:p-8 mt-10">
          <div className="rounded-lg border border-green-200 bg-green-50 p-6 shadow-sm">
            <div className="flex items-center gap-3 text-green-800 mb-4">
              <CheckCircle2 className="h-8 w-8" />
              <h1 className="text-xl font-bold">School Provisioned Successfully</h1>
            </div>

            {created.inviteSent ? (
              <p className="text-sm text-green-700 mb-6">
                <strong>{name}</strong> has been created. An invitation was emailed to{" "}
                <strong>{created.email}</strong>.
              </p>
            ) : (
              <p role="alert" className={`${alertError} mb-6`}>
                {created.warning ??
                  "The school was created, but the invite email did not go out."}
              </p>
            )}

            <div className="mb-6">
              <p className="text-xs font-semibold text-green-800 uppercase mb-1">School Login URL</p>
              <code className="block p-3 bg-white rounded border text-sm text-slate-700">
                https://{created.subdomain}.{root}/login
              </code>
            </div>

            <div className="flex flex-wrap items-start gap-3">
              {!created.inviteSent && created.id ? (
                <ResendInviteButton tenantId={created.id} className={buttonPrimary} />
              ) : null}
              <Link href="/platform/tenants" className={buttonSecondary}>
                Done
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- FORM SCREEN ---
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
                <label htmlFor="subdomain" className={fieldLabel}>
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

              <div>
                <label htmlFor="term-count" className={fieldLabel}>
                  Terms per school year
                </label>
                <select
                  id="term-count"
                  value={termCount}
                  onChange={(event) => setTermCount(event.target.value)}
                  className={fieldControl}
                >
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n}
                      {n === 3 ? " (default)" : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-ink-secondary">
                  The School Admin can change the term dates later.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6 rounded-lg border border-line bg-surface-muted p-6">
            <h2 className="font-semibold">What happens on creation?</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-secondary">
              <li>1. Creates the tenant record</li>
              <li>2. Creates the current school year with its terms</li>
              <li>3. Emails an invitation to the School Admin (you can resend it if it fails)</li>
            </ul>
            {error ? (
              <p role="alert" className={`${alertError} mt-4`}>
                {error}
              </p>
            ) : null}
          </section>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Link href="/platform/tenants" className={buttonSecondary}>
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