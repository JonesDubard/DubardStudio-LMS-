-- NF-11a: stop the timer.
select cron.unschedule('nf11a-worker')
where exists (select 1 from cron.job where jobname = 'nf11a-worker');
select 'Worker timer is off' as result;
 