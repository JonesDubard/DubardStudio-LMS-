// What Edge Functions import:
//
//   import { sendEmail } from "../_shared/mail.ts";
//   await sendEmail(to, "invite", { school, acceptUrl, roleLabel });
//
// Same as email.ts, plus: a failure that the team must know about (bad key,
// unverified domain, quota, Resend down) is also
//   - reported to Sentry, tagged with the school and template, and
//   - written to audit_log as "email.send" / error (system action).
// Neither gets the recipient: Sentry is a third party, and audit_log is
// append-only, so an address written there could never be removed.
// The recipient is in the function log line (NF-10.6), which rotates.
// A mistyped address is only logged, not alerted and not audited.

import { sendEmail as send } from "./email.ts";
import type { FailureInfo, SendOptions } from "./email.ts";
import type { TemplateData, TemplateName } from "./email_templates.ts";
import { reportError } from "./sentry.ts";
import { serviceClient } from "./client.ts";
import { writeAudit } from "./audit.ts";

const UUID_FORMAT =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function toSentry(info: FailureInfo): Promise<void> {
  if (!info.alert) return;
  // The message holds the template and the error code only: no address, no name.
  await reportError(new Error(`EmailError: ${info.template}: ${info.code}`), {
    fn: "email",
    tenantId: info.tenantId === "unknown" ? undefined : info.tenantId,
  });
}

async function toAudit(info: FailureInfo): Promise<void> {
  if (!info.alert) return;
  await writeAudit(serviceClient(), {
    actorId: null,
    actorKind: "system",
    // audit_log.tenant_id has a foreign key: only pass an id that looks real.
    tenantId: UUID_FORMAT.test(info.tenantId) ? info.tenantId : null,
    action: "email.send",
    resourceType: "email",
    result: "error",
    reason: info.code,
    details: { template: info.template, attempts: info.attempts },
  });
}

// Independent hooks: one failing (Sentry down, audit insert refused) must not
// skip the other. sendEmail also guards the whole hook, so the real error is
// always the one the caller sees.
async function onFailure(info: FailureInfo): Promise<void> {
  await Promise.allSettled([toSentry(info), toAudit(info)]);
}

export function sendEmail<T extends TemplateName>(
  to: string,
  template: T,
  data: TemplateData[T],
  options: SendOptions = {},
): Promise<{ id: string }> {
  return send(to, template, data, { onFailure, ...options });
}

export type { TemplateData, TemplateName } from "./email_templates.ts";
export { EmailError } from "./email.ts";