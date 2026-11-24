-# How background jobs run (NF-11a decision)
 
Status: proposed, waiting for review. Issue #33. Source: PRD NFR-6.6.2; Tech Review sections 8 and 12 ("Background jobs: spike needed").
 
## The decision
 
Big jobs (CSV imports and bulk invites first, later course carry-forward and the weekly parent digest) run like this:
 
1. The request that starts the job only checks the input, saves a job row, and puts the work on a **Supabase Queue (pgmq)** as batches of **50 rows**. It answers right away.
2. **pg_cron** checks every 10 seconds whether the queue has work. Only if it does, it calls a **worker Edge Function**.
3. The worker takes one batch at a time. A taken batch is hidden for 60 seconds. When the batch is finished, the worker deletes it from the queue. If the worker crashes, the batch is not deleted, so it comes back by itself and another worker picks it up.
4. Each row is marked done or failed (with a reason) in its own small transaction, and a retried batch skips rows that are already done. That is how a row is never done twice.
5. A batch that has failed **3 times** is given up. Its remaining rows are marked failed with "batch failed 3 times", and the job carries on with the next batch.
We do **not** need the fallback (a plain Edge Function plus a jobs table and no queue), because pgmq passed the test.
 
**Why this and not something else**
- It all runs inside Supabase, which we already use. No new service, nothing to pay for, and nothing runs on Vercel, so the Hobby plan's limits don't matter.
- The queue gives us "come back after a crash" for free. Without it we would have to write our own locking and timeouts.
- Each worker call does only a few batches and then stops, so it stays under the Edge Function limits even for very big files (see "CPU limit" below).
- pg_cron only calls the worker when there is work, so an empty queue costs no Edge Function calls.
## Test results
 
Prototype: `spikes/nf-11a/` (throwaway, local only; see the comments in each file).
 
| Test | Result |
|---|---|
| 1,000 rows, 14 bad, simulated crash at row 521 | PASS (all 5 checks), 38 seconds from start to completed. The crashed batch 501-550 came back by itself 30 s later ("try 2"), and the 20 rows done before the crash were skipped. |
| Same, worker really killed (Ctrl+C) in the middle | Not run. Test 1's crash already covers it: an unfinished batch comes back the same way, however the worker stops. |
| A row that crashes the worker every time (row 733) | Checked on plain Postgres with a simulated worker while writing the prototype: the batch was given up after 3 tries, and 31 rows failed with a reason (14 bad plus rows 733 to 750), all checks PASS. Not re-run on the local Supabase stack. |
| Every good row done once | PASS: 986 done, 0 done twice |
| Bad rows recorded with a reason | PASS: 14 failed, each with a reason ("email is missing" or "email is not valid: ...") |
| Progress readable as "x of y" | PASS: readable while running ("970 of 1000 rows processed (956 done, 14 failed) - processing") and at the end |
 
## Job table design (for NF-11b)
 
- **`import_jobs` (already in MIG-0008)** holds one row per job and the progress: `status`, `total_rows`, `success_rows`, `failed_rows`. Progress "x of y" is `success_rows + failed_rows` of `total_rows`. The worker adds to the counters as it goes.
- **New `import_job_rows`** holds one row per CSV row: `tenant_id`, `import_job_id`, `row_no`, `payload` (the checked row), `status` (pending, done or failed), `error` (the reason), `attempts`. It needs `tenant_id` and RLS like every other table (NF-05). This table is what lets a retried batch skip rows that are already done.
- **`import_jobs.error_report`** is filled once at the end from the failed rows, for the final report in US-032b.
- **The queue message** only holds the job id and the row range (for example rows 501 to 550), never names or emails.
## Numbers
 
| Setting | Value | Why |
|---|---|---|
| Batch size | 50 rows | Small enough to finish well inside one worker call, big enough that 1,000 rows is only 20 batches. |
| Retries | 3 tries per batch, then give up with a reason | A bad batch must not block the job forever. |
| Batch hidden for | 60 seconds | Must be longer than one batch takes. Check this again in NF-11b once real emails are sent. |
| Timer | every 10 seconds, only when the queue has work | Fast enough for an admin watching progress, free when idle. |
| Worker run time | at most 5 batches per call (250 rows), then stop | Stays under the CPU limit (see below). The next timer tick carries on. |
 
The prototype used a 5-second timer and 30 seconds hidden, only so the test finishes faster.
 
**CPU limit.** In the test, one worker call did 10 batches in about 2.5 seconds, and the local runtime logged "CPU time soft limit reached" and then "early termination". That is not an error: the call finished its batch, and the runtime then retired that worker and started a fresh one for the next call. But hosted Edge Functions also have a hard CPU limit per call. A worker killed by that limit would be handled like any crash (the batch comes back), but it wastes a try. So NF-11b caps a call at 5 batches instead of 20 seconds.
 
## Things NF-11b must handle (the test didn't)
 
- **Emails are outside the database.** If the worker crashes right after sending an invite but before marking the row done, the retry could send it again. Use the existing "one pending invite per email" rule (MIG-0008), and send each email with an idempotency key based on the row, so a retry never sends twice.
- **The timer needs a secret on dev and prod.** pg_cron must call the worker with a key kept in Supabase Vault, not written in the SQL. The worker must refuse calls without it.
- **School safety:** the worker uses the service role, so every query in it must filter by the job's `tenant_id`.
- **Who may start a job:** only a School Admin of that school, the same rule as the `import_jobs` read policy in MIG-0008. The worker itself never trusts anything from the caller, only the job row.
- **Starting faster (optional):** the request that queues the job can also call the worker once right away, so the admin doesn't wait for the next timer tick. The timer is still the safety net.
- **Open question for the team:** do we need `import_job_rows`, or is it enough to re-read the CSV from storage for each batch, rely on the invitations "one pending invite per email" rule so a retry can't invite twice, and keep failures only in `error_report`? That has one table fewer, but no per-row status to check against.
- **Open question for the team:** carry-forward (US-053a) and the digest (US-080a) can use the same queue. Do they get their own job table, or do we make `import_jobs` a general `jobs` table now?
 