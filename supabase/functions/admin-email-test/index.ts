// NF-10.7: send one real email through sendEmail(), as a Platform Admin, to check
// the Resend setup (key, verified domain, templates) and the failure log.
//
//   POST { "tenant_id": "<school uuid>", "to": "you@example.org",
//          "template": "invite" | "password_reset" | "weekly_digest",   (default "invite")
//          "logo_url": "https://..." }                                    (optional)
//
// Built with adminHandler(), so only an active Platform Admin gets through and every
// call (success, refusal, error) is written to audit_log. The recipient is NOT put in
// the audit row. The email shows the school's real name and colour; the links in it
// are placeholders.
import { adminHandler, HttpError } from "../_shared/admin.ts";
import { EmailError, sendEmail } from "../_shared/mail.ts";

const TEMPLATES = ["invite", "password_reset", "weekly_digest"] as const;
type TemplateChoice = (typeof TEMPLATES)[number];

const PLACEHOLDER_LINK = "https://example.org/email-test";

Deno.serve(
  adminHandler(
    { scope: "one_school", action: "email.test", resourceType: "email" },
    async ({ body, school }) => {
      const to = typeof body.to === "string" ? body.to.trim() : "";
      const template = String(body.template ?? "invite");
      if (!(TEMPLATES as readonly string[]).includes(template)) {
        throw new HttpError(
          400,
          "bad_template",
          `template must be one of: ${TEMPLATES.join(", ")}`,
        );
      }

      const { data, error } = await school
        .select("tenants", "id,name,primary_color")
        .maybeSingle();
      if (error) throw new Error(`tenants lookup failed: ${error.message}`);
      if (!data) throw new HttpError(404, "school_not_found");

      const s = {
        id: String(data.id),
        name: String(data.name),
        primaryColor: (data.primary_color as string | null) ?? null,
        // Must be a permanent public link; signed or private links are ignored.
        logoUrl: typeof body.logo_url === "string" ? body.logo_url : null,
      };

      let result: { id: string };
      try {
        switch (template as TemplateChoice) {
          case "invite":
            result = await sendEmail(to, "invite", {
              school: s,
              acceptUrl: PLACEHOLDER_LINK,
              roleLabel: "teacher",
              inviterName: "Email test",
            });
            break;
          case "password_reset":
            result = await sendEmail(to, "password_reset", {
              school: s,
              resetUrl: PLACEHOLDER_LINK,
            });
            break;
          case "weekly_digest":
            result = await sendEmail(to, "weekly_digest", {
              school: s,
              weekLabel: "this week",
              appUrl: PLACEHOLDER_LINK,
              items: [
                { title: "A lesson was published", detail: "Test item", url: PLACEHOLDER_LINK },
                { title: "An assignment is due" },
              ],
            });
            break;
        }
      } catch (e) {
        if (e instanceof EmailError) {
          // The failure is already logged (and sent to Sentry if it needs the team).
          if (e.code === "invalid_recipient" || e.code === "invalid_data") {
            throw new HttpError(400, e.code, e.message);
          }
          throw new HttpError(502, e.code); // details are in the function logs
        }
        throw e;
      }

      return {
        body: { sent: true, id: result.id, template },
        resourceId: s.id,
        details: { template },
      };
    },
  ),
);