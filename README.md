# LearnGrid

LearnGrid is a white-label learning platform for Liberian schools. Each school gets its own subdomain and branding. Teachers publish lessons and assignments, students open them on a phone, and parents check upcoming work and grades. The app is meant to sit beside a school's existing administrative system, not replace it.

This repository is the foundation scaffold only: the Next.js app, tenant hostname resolution, Supabase client factories, and an empty folder map. Login, database tables, and persona screens are not built yet.

## Install

```bash
npm install
```

Copy `.env.example` to `.env.local` when you have a Supabase project. The placeholder home page runs without those values.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). A school subdomain such as [http://pilotschool.localhost:3000](http://pilotschool.localhost:3000) shows that tenant label.

## Test

```bash
npm run test
```

End-to-end tests (none yet): `npm run test:e2e`

## Project structure

- `app/` — App Router. `(auth)` and `(platform)` are empty route groups. `(tenant)` holds empty groups for school admin, teacher, student, and parent.
- `middleware.ts` — Reads the hostname, sets `x-tenant-subdomain`, and refreshes the Supabase session.
- `components/` — Empty folders for shared, student, teacher, and admin UI.
- `lib/supabase/` — Browser, server, and session-refresh client factories.
- `lib/tenant/` — Hostname to subdomain resolution.
- `lib/queries/` and `lib/stubs/` — Empty until data access exists.
- `design/` — Empty landing place for future HTML mockups and wireframes.
- `docs/` — Product docs and `teaching.md`.
- `supabase/migrations/` — Empty until the schema is written.
- `tests/unit`, `tests/e2e`, `tests/rls` — Unit tests now; e2e and RLS later.

## Local database (Supabase)

Needs Docker Desktop running and the Supabase CLI.

```
supabase start      # start local Supabase (first run downloads images)
supabase db reset   # rebuild the local database from supabase/migrations
```
Local API: http://127.0.0.1:54321 · Studio: http://127.0.0.1:54323

For the scripts, create `.env.local` with:
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=<"Secret" key printed by supabase start>
```
Seed test data: `npm run seed:dev`, then `npx tsx scripts/spike-second-tenant.ts`.

Rules:
- New migrations go in `supabase/migrations/` named `NNNN_name.sql` (digits, then `_`).



## Email

Every email the backend sends goes through one function, `sendEmail(to, template, data)` in `supabase/functions/_shared/mail.ts`. Resend is the provider today. To switch provider, write another `EmailProvider` (see `resendProvider` in `_shared/email.ts`) and change `getProvider()`. Nothing else changes.

```ts
import { sendEmail } from "../_shared/mail.ts";

await sendEmail("anna@example.org", "invite", {
  school: { id: tenantId, name: "Sint-Jan College", logoUrl, primaryColor },
  acceptUrl, roleLabel: "teacher", inviterName: "Mrs. Peeters",
});
```

Templates: `invite`, `password_reset`, `weekly_digest` (`_shared/email_templates.ts`). Each shows the school's name and logo. `logoUrl` must be a public https link an email client can load without signing in. A private storage path cannot be used and is skipped (the school's name is shown as text instead).

Supabase Auth's own emails (password reset, magic link) use the templates under *Authentication → Email Templates*, not these. They are sent through Resend but are not school-branded. A school-branded reset needs Auth's *Send Email Hook* pointed at an Edge Function that calls `sendEmail`.

### One-time setup

1. **Resend account and domain (NF-10.1).** Create the account at resend.com. *Domains → Add Domain*, use a sending subdomain such as `mail.<your domain>`, and add the DNS records Resend shows (SPF and DKIM; add DMARC too). Wait until the domain says *Verified*.
2. **API key as a secret (NF-10.2).** In Resend create an API key with *Sending access* only. Store it in Supabase, never in a file:
   ```
   supabase secrets set RESEND_API_KEY="<your key>" EMAIL_FROM_ADDRESS="no-reply@mail.<your domain>" APP_URL="https://<your app>"
   ```
   `tests/email_test.ts` fails if a key-shaped value or a `.env` file is found in the repo files.
3. **Auth emails through Resend (NF-10.5).** Supabase dashboard → *Authentication → Notifications → Email → SMTP Settings*: enable custom SMTP, sender email = the same `EMAIL_FROM_ADDRESS`, then
   `Host smtp.resend.com`, `Port 465`, `Username resend`, `Password` = the Resend API key. Save.
   (Local development: the same values go in `[auth.email.smtp]` in `supabase/config.toml`, with `pass = "env(RESEND_API_KEY)"`.)
4. **Deploy.** `supabase functions deploy email-test` (plus any function that calls `sendEmail`).

### Test it (NF-10.7)

Sign in as a school admin and use that user's access token:

```
# real send to yourself (default address = the signed-in user)
curl -X POST "$SUPABASE_URL/functions/v1/email-test" -H "Authorization: Bearer <school admin token>" \
  -H "apikey: $SUPABASE_ANON_KEY" -H "Content-Type: application/json" -d '{"template":"invite"}'

# bad address: refused (422) and logged
... -d '{"template":"invite","to":"not-an-address"}'

# address that bounces after sending (Resend test address)
... -d '{"template":"invite","to":"bounced@resend.dev"}'
```

Check: the email arrives with the school's name and logo; the bad address answers `sent:false, invalid_recipient`; the failure line shows in the function logs (below). `bounced@resend.dev` is accepted by Resend and bounces afterwards, so it shows in Resend's *Emails* list, not in our log. Do this for `password_reset` and `weekly_digest` too, then run `supabase functions delete email-test`.

### Failed sends (NF-10.6)

Every failed send writes one line to the function logs: *Supabase dashboard → Edge Functions → (function) → Logs*, search for `email_send_failed`. It holds `tenant_id` (school), `recipient`, `template`, `error` and `attempts`. These lines contain email addresses, so treat the logs as personal data.

Failures the team must act on (invalid key, unverified domain, quota, Resend down) are also reported to Sentry with the school and template, but never the recipient. A mistyped address is only logged.

Temporary failures (rate limit, Resend 5xx, network) are retried up to 3 times with the same idempotency key, so a retry cannot send the email twice.

### Checklist

- [ ] Domain shows *Verified* in Resend
- [ ] `RESEND_API_KEY` and `EMAIL_FROM_ADDRESS` set with `supabase secrets set`; nothing in the repo
- [ ] Supabase Auth SMTP points at Resend; a password reset arrives
- [ ] Invite, reset and digest test emails received with school name and logo
- [ ] Bad address refused and visible in the logs as `email_send_failed`
- [ ] `email-test` function deleted