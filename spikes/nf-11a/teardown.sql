-- NF-11a: remove everything setup.sql and cron-on.sql created. LOCAL ONLY.
select cron.unschedule('nf11a-worker')
where exists (select 1 from cron.job where jobname = 'nf11a-worker');
select pgmq.drop_queue('nf11a_batches')
where exists (select 1 from pgmq.list_queues() where queue_name = 'nf11a_batches');
drop function if exists public.nf11a_start_job(int, int, int, int);
drop function if exists public.nf11a_claim_batch(int);
drop function if exists public.nf11a_do_row(uuid, int);
drop function if exists public.nf11a_finish_batch(bigint, uuid);
drop function if exists public.nf11a_progress(uuid);
drop schema if exists nf11a cascade;
notify pgrst, 'reload schema';
select 'NF-11a test removed' as result;
 