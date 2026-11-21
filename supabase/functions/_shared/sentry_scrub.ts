// What may leave for Sentry, and what may not. No imports from the Sentry SDK,
// so the privacy rules are unit-tested offline (tests/sentry_test.ts).
//
// Rules (NF-17.2):
//   - tags: school id (tenant_id) and role only. Never a name, email or user id.
//   - expected refusals (wrong type, too large, not allowed, ...) are not errors
//     and are not sent. Their messages contain file names, which can be names.
//   - no request data, no user, no breadcrumbs, no extra data in any event.
//   - anything that looks like an email address is blanked out of error text.

import { StorageError } from "./storage.ts";

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

/** Only real failures: anything unexpected, and server-side StorageErrors (5xx). */
export function shouldReport(e: unknown): boolean {
  if (e instanceof StorageError) return e.status >= 500;
  return true;
}

/**
 * The error that is actually sent. A StorageError is reduced to its code,
 * because its message can contain a file name.
 */
export function reportableError(e: unknown): Error {
  if (e instanceof StorageError) {
    const out = new Error(`StorageError: ${e.code}`);
    out.name = "StorageError";
    // Keep the original frames, but not the first line (it holds the message).
    const frames = (e.stack ?? "").split("\n").slice(1).join("\n");
    out.stack = `StorageError: ${e.code}\n${frames}`;
    return out;
  }
  if (e instanceof Error) return e;
  return new Error(typeof e === "string" ? e : "Unknown error");
}

export interface ErrorContext {
  /** Name of the Edge Function, e.g. "files-upload". */
  fn: string;
  tenantId?: string;
  roles?: string[];
}

/** The only tags an event gets. */
export function buildTags(ctx: ErrorContext): Record<string, string> {
  const tags: Record<string, string> = { function: ctx.fn };
  if (ctx.tenantId) tags.tenant_id = ctx.tenantId;
  if (ctx.roles && ctx.roles.length > 0) tags.role = ctx.roles.join(",");
  return tags;
}

export function redact(text: string): string {
  return text.replace(EMAIL, "[email]");
}

// deno-lint-ignore no-explicit-any
type LooseEvent = Record<string, any>;

/** Sentry beforeSend: strips everything that could identify a person. */
export function scrubEvent<T>(input: T): T {
  const event = input as LooseEvent;
  delete event.user;
  delete event.request;
  delete event.breadcrumbs;
  delete event.extra;
  if (typeof event.message === "string") event.message = redact(event.message);
  if (typeof event.logentry?.message === "string") {
    event.logentry.message = redact(event.logentry.message);
  }
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === "string") ex.value = redact(ex.value);
  }
  return input;
}