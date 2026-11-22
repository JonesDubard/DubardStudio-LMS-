// Sends one email through Resend. Server only (needs RESEND_API_KEY).
// A failure is logged as one JSON line ("email_send_failed", NF-10.6) and returned,
// never thrown: the caller decides what a failed email means.
import { renderTemplate, type TemplateData, type TemplateName } from "./templates";

export type SendResult = { ok: true; id?: string } | { ok: false; error: string };

export type EmailSender = <T extends TemplateName>(
  to: string,
  template: T,
  data: TemplateData[T],
  idempotencyKey?: string,
) => Promise<SendResult>;

export const sendEmail: EmailSender = async (to, template, data, idempotencyKey) => {
  const tenantId = (data as { school: { id: string } }).school.id;
  const fail = (error: string): SendResult => {
    // No email body, no link. The recipient is needed to act on it, as in NF-10.6.
    console.error(JSON.stringify({ event: "email_send_failed", tenant_id: tenantId, recipient: to, template, error }));
    return { ok: false, error };
  };
  try {
    const key = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM_ADDRESS;
    if (!key || !from) return fail("email_not_configured");
    const mail = renderTemplate(template, data);
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, html: mail.html, text: mail.text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return fail(`resend_${res.status}`);
    const body = (await res.json().catch(() => ({}))) as { id?: string };
    return { ok: true, id: body.id };
  } catch (e) {
    return fail(e instanceof Error ? e.message.slice(0, 200) : "send_failed");
  }
};