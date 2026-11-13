

# Rate limits (NF-07a)

Two layers:

1. **Supabase Auth** limits login, sign-up, token refresh and auth emails, per IP. These are
   set in `supabase/config.toml` for local, and in the dashboard for dev and prod
   (Authentication → Rate Limits). The hosted values can also be set with Supabase's
   Management API, but for the pilot we set them by hand. Keep this table and both
   dashboards the same.
2. **Our Edge Functions** limit upload, invite and import with `_shared/rate_limit.ts`,
   counting in `public.rate_limit_counters` (migration 0014), per user, admin or school.
   Over the limit: HTTP 429 with a `Retry-After: N` header and
   `{"error":"rate_limited","message":"Too many requests. Try again in N seconds."}`.

## Supabase Auth

| Setting | Supabase default | Ours | Why |
|---|---|---|---|
| `sign_in_sign_ups` | 30 per 5 min per IP | **100** per 5 min per IP | A school's whole network often shares one IP. A class of 40 signing in at the start of a lesson, with typos and retries, would hit 30. Not higher: every extra allowed attempt is also an extra password guess from that IP. CAPTCHA on the login page is the follow-up that lets us raise it safely. This limit also covers password-recovery and resend requests. |
| `token_refresh` | 150 per 5 min per IP | **600** per 5 min per IP | Every signed-in user refreshes about once an hour (1-hour tokens). A few hundred users behind one school IP would hit 150. This limit covers the whole token endpoint, password logins included. |
| `token_verifications` | 30 per 5 min per IP | **100** per 5 min per IP | Invite links and password-reset links are verified here. A school's staff opening their invites from one IP on the same morning could hit 30. |
| `email_sent` | 2 per hour | 2 for now → **100 per hour** once NF-10 is live | With Supabase's built-in email, 2 per hour is fixed for the whole project. Invites and password resets stop after 2 an hour until Resend (NF-10) is set as the email sender. Raise it then. |
| `sms_sent`, `anonymous_users`, `web3` | defaults | unchanged | Not used. |


These are starting values for the pilot. Tune them once there's real traffic.

**Bursts:** Supabase Auth counts with a token bucket. The numbers above set how fast it refills,
but a burst of requests at the same moment can still be limited sooner. So raising the numbers
doesn't guarantee that 40 students can sign in in the same second. Before the pilot, try it on
dev with a class-sized group signing in at once, and note the result here.

**Dashboard checklist (dev, then prod):** Authentication → Rate Limits → set the values above → note the date here.

| Project | Set on | By |
|---|---|---|
| learngrid-dev | | |
| prod | | |

## Edge Functions

| Bucket | Limit | Counted per | Used by |
|---|---|---|---|
| `upload` | 30 per minute | user | `files-upload` (wire up when NF-03 is merged) |
| `invite` | 50 per hour | admin | invite functions (US-030, US-033, US-036, US-001.4) |
| `import` | 5 per hour | school | CSV import (US-032a) |

Not counted per IP: a classroom shares one IP, `x-forwarded-for` can be faked, and all three
functions need a signed-in caller anyway. If the counter can't be reached, the request is
refused with a 500 (fails closed).

Fixed windows: a caller can use the whole limit at the end of one window and again at the start
of the next. That's expected.

Use it after you know who the caller is, before doing any work:

```ts
await enforceRateLimit(db, "upload", caller.userId);
```
