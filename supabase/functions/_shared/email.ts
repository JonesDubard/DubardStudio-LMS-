// NF-10.3 / NF-10.6: the one way an Edge Function sends an email.
//
//   await sendEmail("anna@example.com", "invite", { school, acceptUrl, roleLabel });
//
// - The provider (Resend today) sits behind the small EmailProvider interface.
//   To swap it, write another provider and change the default in getProvider().
// - The API key is read from the RESEND_API_KEY secret, never from code.
// - Temporary failures (rate limit, 5xx, network) are retried with the SAME
//   idempotency key, so a retry can never send the email twice.
// - Every failed send is logged with school, recipient, template and error.
//
// Secrets (supabase secrets set ...):
//   RESEND_API_KEY       the Resend API key
//   EMAIL_FROM_ADDRESS   an address on the verified domain, e.g. no-reply@mail.example.org
//
// Edge Functions import `sendEmail` from ./mail.ts (same function, plus Sentry
// alerts). This file has no external imports so it is unit-tested offline.

import { renderTemplate, TemplateError } from "./email_templates.ts";
import type { TemplateData, TemplateName } from "./email_templates.ts";

// ---------------------------------------------------------------------------
// errors and types
// ---------------------------------------------------------------------------

export type EmailErrorCode =
  | "invalid_recipient"
  | "invalid_data"
  | "not_configured"
  | "provider_rejected"
  | "provider_unavailable";

export class EmailError extends Error {
  code: EmailErrorCode;
  status?: number;
  constructor(code: EmailErrorCode, message: string, status?: number) {
    super(message);
    this.name = "EmailError";
    this.code = code;
    this.status = status;
  }
}

export interface OutgoingEmail {
  from: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(msg: OutgoingEmail, opts: { idempotencyKey: string }): Promise<{ id: string }>;
}

/** Thrown by a provider. `retryable` says whether trying again can help. */
export class ProviderError extends Error {
  retryable: boolean;
  status?: number;
  constructor(message: string, retryable: boolean, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
    this.status = status;
  }
}

export interface FailureInfo {
  tenantId: string;
  recipient: string;
  template: string;
  error: string;
  code: EmailErrorCode;
  attempts: number;
  /** False for a mistyped address (not our problem), true for config, quota, outage. */
  alert: boolean;
}

export interface SendOptions {
  provider?: EmailProvider;
  fromAddress?: string;
  /** Default: one JSON line on console.error (shows in the Supabase function logs). */
  log?: (info: FailureInfo) => void;
  /** Extra hook after the log, for example Sentry. Must not include the recipient. */
  onFailure?: (info: FailureInfo) => void | Promise<void>;
  maxAttempts?: number;
  sleep?: (ms: number) => Promise<void>;
  idempotencyKey?: string;
}

// ---------------------------------------------------------------------------
// Resend
// ---------------------------------------------------------------------------

const RESEND_URL = "https://api.resend.com/emails";
const NOT_RETRYABLE_429 = new Set(["daily_quota_exceeded", "monthly_quota_exceeded"]);
const RETRYABLE_409 = new Set(["concurrent_idempotent_requests", "resource_locked"]);

export function resendProvider(
  apiKey: string,
  fetchFn: typeof fetch = fetch,
): EmailProvider {
  return {
    async send(msg, { idempotencyKey }) {
      let res: Response;
      try {
        res = await fetchFn(RESEND_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            from: msg.from,
            to: [msg.to],
            subject: msg.subject,
            html: msg.html,
            text: msg.text,
          }),
          signal: AbortSignal.timeout(10_000),
        });
      } catch (e) {
        // Network error or timeout: nothing reached us, retrying is safe.
        throw new ProviderError(`Could not reach Resend: ${scrub(String(e), apiKey)}`, true);
      }

      let body: { id?: string; name?: string; message?: string } = {};
      try {
        body = await res.json();
      } catch { /* empty or non-JSON body */ }

      if (res.ok && body.id) return { id: body.id };

      const name = body.name ?? "";
      const message = scrub(body.message ?? `Resend answered ${res.status}`, apiKey);
      const retryable = (res.status === 429 && !NOT_RETRYABLE_429.has(name)) ||
        res.status >= 500 ||
        (res.status === 409 && RETRYABLE_409.has(name));
      throw new ProviderError(`${name ? `${name}: ` : ""}${message}`, retryable, res.status);
    },
  };
}

function scrub(text: string, secret: string): string {
  return secret ? text.split(secret).join("[key]") : text;
}

// ---------------------------------------------------------------------------
// config
// ---------------------------------------------------------------------------

function env(name: string): string | undefined {
  return (globalThis as { Deno?: { env: { get(k: string): string | undefined } } })
    .Deno?.env.get(name);
}

function getProvider(options: SendOptions): EmailProvider {
  if (options.provider) return options.provider;
  const key = env("RESEND_API_KEY");
  if (!key) {
    throw new EmailError(
      "not_configured",
      "RESEND_API_KEY is not set. Run: supabase secrets set RESEND_API_KEY=...",
    );
  }
  return resendProvider(key);
}

const DISPLAY_NAME_UNSAFE = new RegExp('[\\u0000-\\u001f\\u007f\\u2028\\u2029"<>\\\\]', "g");
const ADDRESS = /^[^\s@<>",;]+@[^\s@<>",;]+\.[^\s@<>",;]{2,}$/;

function getFromAddress(options: SendOptions): string {
  const a = options.fromAddress ?? env("EMAIL_FROM_ADDRESS");
  if (!a || !ADDRESS.test(a)) {
    throw new EmailError(
      "not_configured",
      "EMAIL_FROM_ADDRESS is not set or is not an email address on the verified domain.",
    );
  }
  return a;
}

// ---------------------------------------------------------------------------
// logging
// ---------------------------------------------------------------------------

function defaultLog(info: FailureInfo): void {
  console.error(JSON.stringify({
    event: "email_send_failed",
    tenant_id: info.tenantId,
    recipient: info.recipient,
    template: info.template,
    error: info.error,
    attempts: info.attempts,
  }));
}

// ---------------------------------------------------------------------------
// sendEmail
// ---------------------------------------------------------------------------

const BACKOFF_MS = [500, 1500];

export async function sendEmail<T extends TemplateName>(
  to: string,
  template: T,
  data: TemplateData[T],
  options: SendOptions = {},
): Promise<{ id: string }> {
  const tenantId = String((data as { school?: { id?: unknown } } | undefined)?.school?.id ?? "unknown");
  const maxAttempts = Math.max(1, options.maxAttempts ?? 3);
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let attempts = 0;

  try {
    if (typeof to !== "string" || to.length > 254 || !ADDRESS.test(to)) {
      throw new EmailError("invalid_recipient", "That is not a valid email address.");
    }

    let rendered;
    try {
      rendered = renderTemplate(template, data);
    } catch (e) {
      if (e instanceof TemplateError) throw new EmailError("invalid_data", e.message);
      throw e;
    }

    const provider = getProvider(options);
    const schoolName = (data as { school: { name: string } }).school.name
      .replace(DISPLAY_NAME_UNSAFE, "").trim().slice(0, 80);
    const msg: OutgoingEmail = {
      from: `"${schoolName}" <${getFromAddress(options)}>`,
      to,
      ...rendered,
    };

    const idempotencyKey = options.idempotencyKey ?? crypto.randomUUID();
    for (;;) {
      attempts++;
      try {
        return await provider.send(msg, { idempotencyKey });
      } catch (e) {
        if (!(e instanceof ProviderError)) throw e;
        if (e.retryable && attempts < maxAttempts) {
          await sleep(BACKOFF_MS[Math.min(attempts - 1, BACKOFF_MS.length - 1)]);
          continue;
        }
        throw new EmailError(
          e.retryable ? "provider_unavailable" : "provider_rejected",
          e.message,
          e.status,
        );
      }
    }
  } catch (e) {
    const err = e instanceof EmailError
      ? e
      : new EmailError("provider_unavailable", e instanceof Error ? e.message : String(e));
    const info: FailureInfo = {
      tenantId,
      recipient: typeof to === "string" ? to : "invalid",
      template,
      error: err.message,
      code: err.code,
      attempts,
      alert: !(err.code === "invalid_recipient" ||
        (err.code === "provider_rejected" && (err.status === 400 || err.status === 422))),
    };
    (options.log ?? defaultLog)(info);
    try {
      await options.onFailure?.(info);
    } catch { /* reporting must never hide the real error */ }
    throw err;
  }
}