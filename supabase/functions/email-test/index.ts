// POST /functions/v1/email-test   (NF-10.7)
//
// Sends ONE real email of the chosen template, with the caller's school name and
// logo, so the team can check delivery, the look, and the failure log.
// Only a school admin can call it. Undeploy it after the test:
//   supabase functions delete email-test
//
//   body (JSON): { "template": "invite" | "password_reset" | "weekly_digest",
//                  "to": "optional address; default = the caller's own email" }
//
//   Good address: omit "to" (or use delivered@resend.dev)
//   Bad address:  "to": "not-an-address"        -> refused here, logged
//                 "to": "bounced@resend.dev"    -> accepted by Resend, then bounces
//
// The address can only be the caller's own or a resend.dev test address, so this
// function can't be used to send mail under a school's name to other people.
//
// 200 -> { sent: true, id }        422/502 -> { sent: false, error: { code, message } }

import { StorageError } from "../_shared/storage.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";
import { authenticate } from "../_shared/auth.ts";
import { EmailError, sendEmail } from "../_shared/mail.ts";
import { TEMPLATE_NAMES } from "../_shared/email_templates.ts";
import type { School, TemplateData } from "../_shared/email_templates.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (req.method !== "POST") throw new StorageError("invalid_input", 405, "Use POST.");
    const caller = await authenticate(req);
    if (!caller.roles.includes("school_admin")) {
      throw new StorageError("not_allowed", 403, "Only a school admin can send a test email.");
    }

    const body = await req.json().catch(() => null) as { template?: string; to?: string } | null;
    const template = body?.template as (typeof TEMPLATE_NAMES)[number] | undefined;
    if (!template || !(TEMPLATE_NAMES as readonly string[]).includes(template)) {
      throw new StorageError("invalid_input", 400, `template must be one of: ${TEMPLATE_NAMES.join(", ")}.`);
    }
    const to = body?.to ?? caller.email;
    if (!to) throw new StorageError("invalid_input", 400, "No address to send to.");

    // Only the caller's own address or a Resend test address. A malformed address is
    // still let through, because sendEmail refuses it (that is the bad-address test).
    const looksValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to);
    const allowed = /@resend\.dev$/i.test(to) || to.toLowerCase() === caller.email?.toLowerCase();
    if (looksValid && !allowed) {
      throw new StorageError(
        "not_allowed",
        403,
        "A test email can only go to your own address or a resend.dev test address.",
      );
    }

    // The school's own name, logo and colour (RLS: the caller's own school row).
    const { data: row } = await caller.db.from("tenants").select("*").eq("id", caller.tenantId).maybeSingle();
    const school: School = {
      id: caller.tenantId,
      name: String(row?.name ?? row?.school_name ?? "Your school"),
      // Only a permanent public link is shown; signed or private links are left out.
      logoUrl: (row?.header_logo_url ?? row?.logo_url ?? null) as string | null,
      primaryColor: (row?.primary_color ?? null) as string | null,
    };

    const appUrl = Deno.env.get("APP_URL") ?? "https://example.org";
    const samples: { [K in typeof template]: TemplateData[K] } = {
      invite: { school, acceptUrl: `${appUrl}/accept-invite?token=test`, roleLabel: "teacher", inviterName: "A school admin" },
      password_reset: { school, resetUrl: `${appUrl}/reset-password?token=test`, expiresInMinutes: 60 },
      weekly_digest: {
        school, weekLabel: "this week", appUrl,
        items: [{ title: "Lesson published", detail: "Example lesson", url: appUrl }],
      },
    };

    try {
      // deno-lint-ignore no-explicit-any
      const { id } = await sendEmail(to, template, samples[template] as any);
      return json({ sent: true, id });
    } catch (e) {
      if (e instanceof EmailError) {
        return json({ sent: false, error: { code: e.code, message: e.message } },
          e.code === "invalid_recipient" || e.code === "invalid_data" ? 422 : 502);
      }
      throw e;
    }
  } catch (e) {
    return errorResponse(e);
  }
});