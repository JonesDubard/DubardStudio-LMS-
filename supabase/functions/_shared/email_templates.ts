// NF-10.4: the three emails, each showing the school's name and logo.
// Pure functions (no imports, no network) so they are unit-tested offline.
//
// Everything that comes from data is escaped. Links must be https (http is only
// accepted for localhost, for development). A logo URL that is not a usable
// link (for example a private storage path, or a signed link that expires) is
// left out and the school's name is shown as text instead.

export interface School {
  /** tenants.id. Used for the failure log, never shown in the email. */
  id: string;
  name: string;
  /** A permanent link an email client can load without signing in. Optional.
   * Signed or private storage links are ignored (they expire or need a login). */
  logoUrl?: string | null;
  /** Hex colour such as #1f4fd8 (tenants.primary_color). Optional. */
  primaryColor?: string | null;
}

export interface DigestItem {
  title: string;
  detail?: string;
  url?: string;
}

export interface TemplateData {
  invite: {
    school: School;
    acceptUrl: string;
    /** For example "teacher" or "parent". */
    roleLabel: string;
    inviterName?: string;
    inviteeName?: string;
  };
  password_reset: {
    school: School;
    resetUrl: string;
    expiresInMinutes?: number;
    recipientName?: string;
  };
  weekly_digest: {
    school: School;
    /** For example "3 to 9 November". */
    weekLabel: string;
    items: DigestItem[];
    appUrl: string;
    recipientName?: string;
  };
}

export type TemplateName = keyof TemplateData;
export const TEMPLATE_NAMES = ["invite", "password_reset", "weekly_digest"] as const;

export interface Rendered {
  subject: string;
  html: string;
  text: string;
}

export class TemplateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TemplateError";
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** One line, no control characters (stops header injection through names). */
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001f\\u007f\\u2028\\u2029]+", "g");
export function oneLine(s: string, max = 120): string {
  return s.replace(CONTROL_CHARS, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

/** The URL if it is safe to put in an email, otherwise null. */
export function safeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
    if (u.protocol === "https:" || (u.protocol === "http:" && local)) return u.toString();
  } catch { /* not a URL */ }
  return null;
}

/**
 * A logo link an email client can load later, without signing in. Signed and
 * private storage links expire within minutes or need a login, so they would
 * show as a broken image. They are treated as "no logo".
 */
export function logoLink(url: string | null | undefined): string | null {
  const u = safeUrl(url);
  if (!u) return null;
  if (/\/storage\/v1\/object\/(sign|authenticated)\//.test(u) || /[?&]token=/.test(u)) {
    return null;
  }
  return u;
}

function requireUrl(url: string, what: string): string {
  const ok = safeUrl(url);
  if (!ok) throw new TemplateError(`${what} must be an https link.`);
  return ok;
}

function color(c: string | null | undefined): string {
  return c && /^#[0-9a-f]{6}$/i.test(c) ? c : "#1f4fd8";
}

function schoolName(school: School): string {
  const n = oneLine(school?.name ?? "");
  if (!n) throw new TemplateError("school.name is required.");
  return n;
}

function greeting(name?: string): { html: string; text: string } {
  const n = name ? oneLine(name, 80) : "";
  return n ? { html: `Hello ${esc(n)},`, text: `Hello ${n},` } : { html: "Hello,", text: "Hello," };
}

function layout(school: School, name: string, bodyHtml: string): string {
  const logo = logoLink(school.logoUrl);
  const brand = logo
    ? `<img src="${esc(logo)}" alt="${esc(name)}" height="48" style="display:block;border:0;height:48px;max-width:240px;">`
    : `<span style="font-size:20px;font-weight:700;color:#111827;">${esc(name)}</span>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(name)}</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:8px;">
<tr><td style="padding:24px 28px;border-bottom:3px solid ${color(school.primaryColor)};">${brand}</td></tr>
<tr><td style="padding:28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111827;">
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;">You are receiving this email because of your account at ${esc(name)}.</td></tr>
</table></td></tr></table></body></html>`;
}

function button(school: School, url: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${esc(url)}" style="display:inline-block;background:${color(school.primaryColor)};color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:6px;">${esc(label)}</a></p>
<p style="font-size:13px;color:#6b7280;margin:0;">If the button does not work, copy this link into your browser:<br><a href="${esc(url)}" style="color:#6b7280;word-break:break-all;">${esc(url)}</a></p>`;
}

// ---------------------------------------------------------------------------
// templates
// ---------------------------------------------------------------------------

function invite(d: TemplateData["invite"]): Rendered {
  const name = schoolName(d.school);
  const url = requireUrl(d.acceptUrl, "acceptUrl");
  const role = oneLine(d.roleLabel, 40) || "member";
  const g = greeting(d.inviteeName);
  const who = d.inviterName ? `${oneLine(d.inviterName, 80)} has invited you` : "You have been invited";
  const lineText = `${who} to join ${name} as ${role}.`;
  const lineHtml = `${esc(who)} to join <strong>${esc(name)}</strong> as ${esc(role)}.`;
  return {
    subject: oneLine(`You're invited to join ${name}`, 150),
    html: layout(d.school, name, `<p style="margin:0 0 12px;">${g.html}</p><p style="margin:0;">${lineHtml}</p>${button(d.school, url, "Accept the invitation")}`),
    text: `${g.text}\n\n${lineText}\n\nAccept the invitation: ${url}\n`,
  };
}

function passwordReset(d: TemplateData["password_reset"]): Rendered {
  const name = schoolName(d.school);
  const url = requireUrl(d.resetUrl, "resetUrl");
  const minutes = Number.isInteger(d.expiresInMinutes) && d.expiresInMinutes! > 0 ? d.expiresInMinutes! : 60;
  const g = greeting(d.recipientName);
  const line = `We received a request to reset your password for ${name}. The link works for ${minutes} minutes.`;
  const ignore = "If you did not ask for this, you can ignore this email. Your password stays the same.";
  return {
    subject: oneLine(`Reset your ${name} password`, 150),
    html: layout(d.school, name, `<p style="margin:0 0 12px;">${g.html}</p><p style="margin:0 0 12px;">We received a request to reset your password for <strong>${esc(name)}</strong>. The link works for ${minutes} minutes.</p>${button(d.school, url, "Choose a new password")}<p style="margin:24px 0 0;font-size:14px;color:#374151;">${esc(ignore)}</p>`),
    text: `${g.text}\n\n${line}\n\nChoose a new password: ${url}\n\n${ignore}\n`,
  };
}

const MAX_DIGEST_ITEMS = 25;

function weeklyDigest(d: TemplateData["weekly_digest"]): Rendered {
  const name = schoolName(d.school);
  const appUrl = requireUrl(d.appUrl, "appUrl");
  const week = oneLine(d.weekLabel, 60);
  const g = greeting(d.recipientName);
  const items = (d.items ?? []).slice(0, MAX_DIGEST_ITEMS);
  const more = Math.max(0, (d.items ?? []).length - items.length);

  const htmlItems = items.length === 0
    ? `<p style="margin:0;">Nothing new this week.</p>`
    : `<ul style="padding-left:20px;margin:0;">${items.map((i) => {
      const link = safeUrl(i.url);
      const title = link
        ? `<a href="${esc(link)}" style="color:#111827;font-weight:700;">${esc(oneLine(i.title, 150))}</a>`
        : `<strong>${esc(oneLine(i.title, 150))}</strong>`;
      const detail = i.detail ? `<br><span style="color:#4b5563;">${esc(oneLine(i.detail, 300))}</span>` : "";
      return `<li style="margin:0 0 10px;">${title}${detail}</li>`;
    }).join("")}</ul>${more ? `<p style="margin:8px 0 0;color:#4b5563;">and ${more} more in the app.</p>` : ""}`;

  const textItems = items.length === 0
    ? "Nothing new this week."
    : items.map((i) => {
      const link = safeUrl(i.url);
      return `- ${oneLine(i.title, 150)}${i.detail ? `: ${oneLine(i.detail, 300)}` : ""}${link ? `\n  ${link}` : ""}`;
    }).join("\n") + (more ? `\nand ${more} more in the app.` : "");

  return {
    subject: oneLine(`${name}: your weekly digest (${week})`, 150),
    html: layout(d.school, name, `<p style="margin:0 0 12px;">${g.html}</p><p style="margin:0 0 12px;">Here is what happened at <strong>${esc(name)}</strong> in ${esc(week)}.</p>${htmlItems}${button(d.school, appUrl, `Open ${name}`)}`),
    text: `${g.text}\n\nHere is what happened at ${name} in ${week}.\n\n${textItems}\n\nOpen ${name}: ${appUrl}\n`,
  };
}

export function renderTemplate<T extends TemplateName>(
  template: T,
  data: TemplateData[T],
): Rendered {
  switch (template) {
    case "invite":
      return invite(data as TemplateData["invite"]);
    case "password_reset":
      return passwordReset(data as TemplateData["password_reset"]);
    case "weekly_digest":
      return weeklyDigest(data as TemplateData["weekly_digest"]);
    default:
      throw new TemplateError(`Unknown template "${String(template)}".`);
  }
}