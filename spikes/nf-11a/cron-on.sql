-- NF-11a: wake the worker every 5 seconds, but only when the queue has work,
-- so an empty queue costs nothing. LOCAL ONLY.
-- The database runs inside Docker, so it calls the API gateway by its container name.
-- If your project_id in supabase/config.toml is not dubardstudio-lms, change the name below.
create extension if not exists pg_cron;
create extension if not exists pg_net;
 
select cron.unschedule('nf11a-worker')
where exists (select 1 from cron.job where jobname = 'nf11a-worker');
 
select cron.schedule(
  'nf11a-worker',
  '5 seconds',
  $$
  select net.http_post(
    url := 'http://supabase_kong_dubardstudio-lms:8000/functions/v1/nf11a-worker',
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  )
  where exists (select 1 from pgmq.metrics('nf11a_batches') where queue_length > 0);
  $$
);
 
select 'Worker timer is on (every 5 seconds)' as result;
 