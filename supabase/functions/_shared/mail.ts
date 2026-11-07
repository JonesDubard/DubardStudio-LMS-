// What Edge Functions import:
//
//   import { sendEmail } from "../_shared/mail.ts";
//   await sendEmail(to, "invite", { school, acceptUrl, roleLabel });
//
// Same as email.ts, plus: a failure that the team must know about (bad key,
// unverified domain, quota, Resend down) is also reported to Sentry, tagged with
// the school and template. The recipient is never sent to Sentry.
// A mistyped address is only logged, not alerted.

import { sendEmail as send } from "./email.ts";
import type { FailureInfo, SendOptions } from "./email.ts";
import type { TemplateData, TemplateName } from "./email_templates.ts";
import { reportError } from "./sentry.ts";

async function toSentry(info: FailureInfo): Promise<void> {
  if (!info.alert) return;
  // The message holds the template and the error code only: no address, no name.
  await reportError(new Error(`EmailError: ${info.template}: ${info.code}`), {
    fn: "email",
    tenantId: info.tenantId === "unknown" ? undefined : info.tenantId,
  });
}

export function sendEmail<T extends TemplateName>(
  to: string,
  template: T,
  data: TemplateData[T],
  options: SendOptions = {},
): Promise<{ id: string }> {
  return send(to, template, data, { onFailure: toSentry, ...options });
}

export type { TemplateData, TemplateName } from "./email_templates.ts";
export { EmailError } from "./email.ts";