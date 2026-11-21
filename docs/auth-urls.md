# Auth redirect URLs (US-004.2)
 
Password-reset and invite emails link to Supabase Auth, which then sends the person back to
our app. Supabase only sends them to addresses on its allow list. If the address isn't on the
list, it uses the Site URL instead, so someone who asked for a reset on `pilot1.terralearn.space`
lands on the root site and the reset fails (the reset code is tied to the address it was asked
from).
 
Every school has its own subdomain, so the list uses wildcards: `*` matches one part of the host
name, `**` any path.
 
## Local (`supabase/config.toml`, already set)
 
```toml
site_url = "http://127.0.0.1:3000"
additional_redirect_urls = [
  "https://127.0.0.1:3000",
  "http://127.0.0.1:3000/**",
  "http://localhost:3000/**",
  "http://*.localhost:3000/**",
]
```
 
## Dev and prod (set by hand in the dashboard)
 
Authentication → URL Configuration:
 
| Setting       | Value                           |
| ------------- | ------------------------------- |
| Site URL      | `https://terralearn.space`      |
| Redirect URLs | `https://terralearn.space/**`   |
|               | `https://*.terralearn.space/**` |
 
Add the dev project's own address the same way if it differs. Then note the date below.
 
| Project       | Set on | By  |
| ------------- | ------ | --- |
| learngrid-dev |        |     |
| prod          |        |     |
 
## Who uses these redirects
 
- `/reset` → `/reset/confirm` (password reset, US-004)
- `createTenant()` first School Admin invite → `/set-password` (US-008b)
 