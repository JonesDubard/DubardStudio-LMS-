import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/platform/ContactForm";
import { InviteSchoolAdminForm } from "@/components/platform/InviteSchoolAdminForm";
import { ResendSchoolAdminInviteButton } from "@/components/platform/ResendSchoolAdminInviteButton";
import { TenantStatusPill } from "@/components/platform/TenantStatusPill";
import { BackLink } from "@/components/shared/BackLink";
import { ElevatedAccessBanner } from "@/components/shared/ElevatedAccessBanner";
import { DataTable } from "@/components/shared/DataTable";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { TabBar } from "@/components/shared/TabBar";
import {
  assertPlatformAdmin,
  getSchool,
  listPendingSchoolAdminInvites,
  subscriptionLabel,
} from "@/lib/platform/schools";
import { surfaceCard } from "@/lib/ui/styles";

export const metadata: Metadata = {
  title: "Platform Admin — Tenant Detail",
};

type TenantDetailPageProps = {
  params: Promise<{ tenantId: string }>;
};

function formatCreated(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function inviteLabel(invite: { sent_at: string | null; expires_at: string }, now: number): string {
  if (Date.parse(invite.expires_at) <= now) return "EXPIRED";
  return invite.sent_at ? "SENT" : "NOT SENT";
}

export default async function TenantDetailPage({ params }: TenantDetailPageProps) {
  const { tenantId } = await params;
  await assertPlatformAdmin();
  const school = await getSchool(tenantId);
  if (!school) notFound();
  const pendingAdmins = await listPendingSchoolAdminInvites(school.id);
  const now = Date.now();
  const status = subscriptionLabel(school.subscription_status);
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim() || "localhost";

  return (
    <main className="min-w-0 flex-1">
      <div className="mx-auto max-w-[1440px] p-4 lg:p-8">
        <BackLink href="/platform/tenants">Back to Tenants</BackLink>
        <ElevatedAccessBanner tenantName={school.name} />

        <header className="mb-6">
          <p className="text-xs font-medium text-ink-muted">Tenants / {school.name}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="break-words text-xl font-semibold tracking-tight md:text-2xl">
              {school.name}
            </h1>
            <TenantStatusPill status={status} />
          </div>
          <p className="mt-2 text-sm text-ink-secondary">
            {school.subdomain}.{root}
          </p>
        </header>

        <TabBar
          tabs={[
            { label: "Profile", href: `/platform/tenants/${school.id}`, active: true },
            {
              label: "Subscription",
              href: `/platform/tenants/${school.id}/subscription`,
              active: false,
            },
          ]}
        />

        <section className={surfaceCard}>
          <div className="border-b border-line-subtle px-4 py-5 sm:px-6">
            <h2 className="font-semibold">School Information</h2>
            <p className="mt-1 text-sm text-ink-secondary">Core information for this tenant.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">School Name</div>
              <div className="mt-2 text-sm font-medium">{school.name}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Subdomain</div>
              <div className="mt-2 text-sm">
                {school.subdomain}.{root}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Created</div>
              <div className="mt-2 text-sm">{formatCreated(school.created_at)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Onboarding</div>
              <div className="mt-2 text-sm capitalize">
                {school.onboarding_status.replaceAll("_", " ")}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-ink-muted">Subscription</div>
              <div className="mt-2">
                <TenantStatusPill status={status} />
              </div>
            </div>
          </div>
        </section>

        <section className={`${surfaceCard} mt-6`}>
          <div className="border-b border-line-subtle px-4 py-5 sm:px-6">
            <h2 className="font-semibold">School Contact</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              The person we contact about this school. Saving creates an audit event.
            </p>
          </div>
          <div className="p-6">
            <ContactForm
              tenantId={school.id}
              currentName={school.contact_name ?? ""}
              currentEmail={school.contact_email ?? ""}
            />
          </div>
        </section>

        <section className={`${surfaceCard} mt-6`}>
          <div className="border-b border-line-subtle px-4 py-5 sm:px-6">
            <h2 className="font-semibold">School Admins</h2>
            <p className="mt-1 text-sm text-ink-secondary">
              Invite another School Admin for this school. The link is emailed and works for 7
              days, for this school only. Each invite creates an audit event.
            </p>
          </div>
          <div className="space-y-6 p-6">
            <InviteSchoolAdminForm tenantId={school.id} />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold tracking-tight text-ink">
                Pending School Admin invites
              </h3>
              {pendingAdmins.length === 0 ? (
                <p className="text-sm text-ink-secondary">No pending invites.</p>
              ) : (
                <DataTable
                  columns={[
                    { key: "email", header: "Email" },
                    { key: "status", header: "Status" },
                    { key: "actions", header: "Actions" },
                  ]}
                  rows={pendingAdmins.map((invite) => ({
                    id: invite.id,
                    cells: [
                      invite.email ?? "No email",
                      <StatusBadge key="status" label={inviteLabel(invite, now)} />,
                      <ResendSchoolAdminInviteButton
                        key="resend"
                        tenantId={school.id}
                        invitationId={invite.id}
                      />,
                    ],
                  }))}
                />
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
