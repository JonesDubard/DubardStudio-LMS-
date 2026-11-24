-- NF-11a: throwaway test of background jobs (pgmq queue + pg_cron + Edge Function worker).
-- LOCAL ONLY. This is not a migration: it is never in supabase/migrations and never
-- runs on dev or prod. teardown.sql removes everything it creates.
--
-- What it builds:
--   nf11a.jobs       one row per job, with the "x of y" counters
--   nf11a.job_rows   one row per CSV row: pending, done or failed (with a reason)
--   nf11a.people     the "work": one row per good CSV row (stands in for sending an invite)
--   queue nf11a_batches   one message per batch of 50 rows
--   public.nf11a_*   small functions the worker calls (only the service role may call them)
--
-- Safe to run twice: it drops the old test first.
 
create extension if not exists pgmq;
 
-- Start clean
select pgmq.drop_queue('nf11a_batches')
where exists (select 1 from pgmq.list_queues() where queue_name = 'nf11a_batches');
drop schema if exists nf11a cascade;
drop function if exists public.nf11a_start_job(int, int, int, int);
drop function if exists public.nf11a_claim_batch(int);
drop function if exists public.nf11a_do_row(uuid, int);
drop function if exists public.nf11a_finish_batch(bigint, uuid);
drop function if exists public.nf11a_progress(uuid);
 
create schema nf11a;
 
create table nf11a.jobs (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'queued',   -- queued, processing, completed
  total_rows    int  not null,
  done_rows     int  not null default 0,
  failed_rows   int  not null default 0,
  batch_size    int  not null,
  crash_at_row  int,          -- the worker crashes here on its FIRST try only (test 1)
  poison_row    int,          -- the worker crashes here on EVERY try (test 2: give up after 3)
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);
 
create table nf11a.job_rows (
  job_id    uuid not null references nf11a.jobs (id) on delete cascade,
  row_no    int  not null,
  payload   jsonb not null,
  status    text not null default 'pending',     -- pending, done, failed
  error     text,                                -- the reason, when failed
  attempts  int  not null default 0,             -- how many times a worker looked at it
  done_at   timestamptz,
  primary key (job_id, row_no)
);
 
-- No unique key here on purpose: if a row were done twice, check.sql would see it.
create table nf11a.people (
  id         bigint generated always as identity primary key,
  job_id     uuid not null,
  row_no     int  not null,
  email      text not null,
  full_name  text,
  created_at timestamptz not null default now()
);
 
select pgmq.create('nf11a_batches');
 
-- 1. Make a fake job: p_total rows, split into batches, one queue message per batch.
--    Every 97th row has a bad email and every 250th has none, so the bad rows are known.
create function public.nf11a_start_job(
  p_total int default 1000,
  p_batch_size int default 50,
  p_crash_at_row int default 521,
  p_poison_row int default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  v_job uuid;
  v_from int;
begin
  insert into nf11a.jobs (total_rows, batch_size, crash_at_row, poison_row)
  values (p_total, p_batch_size, p_crash_at_row, p_poison_row)
  returning id into v_job;
 
  insert into nf11a.job_rows (job_id, row_no, payload)
  select v_job, n, jsonb_build_object(
           'full_name', 'Student ' || n,
           'email', case when n % 250 = 0 then null
                         when n % 97 = 0 then 'student' || n || '.example.com'
                         else 'student' || n || '@example.com' end)
  from generate_series(1, p_total) as n;
 
  for v_from in select generate_series(1, p_total, p_batch_size) loop
    perform pgmq.send('nf11a_batches', jsonb_build_object(
      'job_id', v_job,
      'first_row', v_from,
      'last_row', least(v_from + p_batch_size - 1, p_total)));
  end loop;
 
  return v_job;
end $$;
 
-- 2. The worker asks for the next batch. pgmq hides it for p_vt_seconds; if the
--    worker crashes and never deletes it, it comes back after that time.
--    A batch that has already been tried 3 times is given up: its rows that are still
--    pending are marked failed with a reason, and the message is archived.
create function public.nf11a_claim_batch(p_vt_seconds int default 30)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  m record;
  j nf11a.jobs;
  v_given_up int;
begin
  loop
    select * into m from pgmq.read('nf11a_batches', p_vt_seconds, 1);
    if not found then
      return null;                       -- queue is empty
    end if;
 
    select * into j from nf11a.jobs where id = (m.message->>'job_id')::uuid;
 
    if m.read_ct > 3 then
      update nf11a.job_rows
         set status = 'failed', error = 'batch failed 3 times, gave up'
       where job_id = j.id
         and row_no between (m.message->>'first_row')::int and (m.message->>'last_row')::int
         and status = 'pending';
      get diagnostics v_given_up = row_count;
      update nf11a.jobs set failed_rows = failed_rows + v_given_up where id = j.id;
      perform pgmq.archive('nf11a_batches', m.msg_id);
      perform public.nf11a_finish_batch(null, j.id);
      continue;                          -- try the next message
    end if;
 
    update nf11a.jobs set status = 'processing' where id = j.id and status = 'queued';
 
    return m.message || jsonb_build_object(
      'msg_id', m.msg_id,
      'read_ct', m.read_ct,
      'crash_at_row', j.crash_at_row,
      'poison_row', j.poison_row);
  end loop;
end $$;
 
-- 3. Do one row. Locks the row first, so two workers can't do it at the same time,
--    and skips it if it is already done or failed. That is what makes "done once" true
--    after a crash: the retried batch skips the rows finished before the crash.
create function public.nf11a_do_row(p_job_id uuid, p_row_no int)
returns text
language plpgsql security definer set search_path = '' as $$
declare
  r nf11a.job_rows;
  v_email text;
begin
  select * into r from nf11a.job_rows
   where job_id = p_job_id and row_no = p_row_no
   for update;
  if not found then
    return 'missing';
  end if;
 
  update nf11a.job_rows set attempts = attempts + 1
   where job_id = p_job_id and row_no = p_row_no;
 
  if r.status <> 'pending' then
    return 'already';
  end if;
 
  v_email := r.payload->>'email';
  if v_email is null or v_email = '' then
    update nf11a.job_rows set status = 'failed', error = 'email is missing', done_at = now()
     where job_id = p_job_id and row_no = p_row_no;
    update nf11a.jobs set failed_rows = failed_rows + 1 where id = p_job_id;
    return 'failed';
  elsif v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    update nf11a.job_rows set status = 'failed', error = 'email is not valid: ' || v_email, done_at = now()
     where job_id = p_job_id and row_no = p_row_no;
    update nf11a.jobs set failed_rows = failed_rows + 1 where id = p_job_id;
    return 'failed';
  end if;
 
  insert into nf11a.people (job_id, row_no, email, full_name)
  values (p_job_id, p_row_no, v_email, r.payload->>'full_name');
  update nf11a.job_rows set status = 'done', done_at = now()
   where job_id = p_job_id and row_no = p_row_no;
  update nf11a.jobs set done_rows = done_rows + 1 where id = p_job_id;
  return 'done';
end $$;
 
-- 4. The worker finished a batch: remove it from the queue, and close the job
--    when every row is done or failed.
create function public.nf11a_finish_batch(p_msg_id bigint, p_job_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_msg_id is not null then
    perform pgmq.delete('nf11a_batches', p_msg_id);
  end if;
  update nf11a.jobs
     set status = 'completed', completed_at = now()
   where id = p_job_id
     and status <> 'completed'
     and done_rows + failed_rows = total_rows;
end $$;
 
-- 5. Progress as "x of y". With no job id, shows the newest job.
create function public.nf11a_progress(p_job_id uuid default null)
returns text
language sql stable security definer set search_path = '' as $$
  select format('%s of %s rows processed (%s done, %s failed) - %s',
                done_rows + failed_rows, total_rows, done_rows, failed_rows, status)
  from nf11a.jobs
  where id = coalesce(p_job_id, (select id from nf11a.jobs order by created_at desc limit 1));
$$;
 
-- Only the service role (the worker) may call these. Nobody signed in can.
revoke all on function public.nf11a_start_job(int, int, int, int) from public, anon, authenticated;
revoke all on function public.nf11a_claim_batch(int)              from public, anon, authenticated;
revoke all on function public.nf11a_do_row(uuid, int)             from public, anon, authenticated;
revoke all on function public.nf11a_finish_batch(bigint, uuid)    from public, anon, authenticated;
revoke all on function public.nf11a_progress(uuid)                from public, anon, authenticated;
grant execute on function public.nf11a_claim_batch(int)           to service_role;
grant execute on function public.nf11a_do_row(uuid, int)          to service_role;
grant execute on function public.nf11a_finish_batch(bigint, uuid) to service_role;
grant execute on function public.nf11a_progress(uuid)             to service_role;
 
-- PostgREST must see the new functions
notify pgrst, 'reload schema';
 
select 'NF-11a test setup done' as result;
 