-- NF-11a: the check from the issue (NF-11a.3), on the newest job.
-- Each line says PASS or FAIL. Run it when progress says "completed".
with j as (
  select * from nf11a.jobs order by created_at desc limit 1
),
-- The rows we know are bad: setup.sql makes every 250th row with no email and
-- every 97th with a bad one. In test 2, the poison row and the rest of its batch
-- are given up after 3 tries.
expected_failed as (
  select r.row_no
  from nf11a.job_rows r, j
  where r.job_id = j.id
    and (r.row_no % 250 = 0 or r.row_no % 97 = 0
         or (j.poison_row is not null
             and r.row_no >= j.poison_row
             and r.row_no < ((j.poison_row - 1) / j.batch_size + 1) * j.batch_size + 1))
),
actual_failed as (
  select r.row_no from nf11a.job_rows r, j where r.job_id = j.id and r.status = 'failed'
),
people_per_row as (
  select p.row_no, count(*) as n from nf11a.people p, j where p.job_id = j.id group by p.row_no
),
crash_batch as (   -- the rows of the crashed batch that were done before the crash
  select r.* from nf11a.job_rows r, j
  where r.job_id = j.id and j.crash_at_row is not null
    and r.row_no >= ((j.crash_at_row - 1) / j.batch_size) * j.batch_size + 1
    and r.row_no < j.crash_at_row
)
select * from (
  select 1 as n, 'Every good row done once' as check,
    case when (select count(*) from people_per_row where n > 1) = 0
          and (select count(*) from people_per_row)
              = (select total_rows from j) - (select count(*) from expected_failed)
         then 'PASS' else 'FAIL' end as result,
    format('%s rows done, %s expected, %s done twice',
      (select count(*) from people_per_row),
      (select total_rows from j) - (select count(*) from expected_failed),
      (select count(*) from people_per_row where n > 1)) as detail
  union all
  select 2, 'Bad rows recorded with a reason',
    case when not exists (select row_no from expected_failed except select row_no from actual_failed)
          and not exists (select row_no from actual_failed except select row_no from expected_failed)
          and not exists (select 1 from nf11a.job_rows r, j
                          where r.job_id = j.id and r.status = 'failed' and coalesce(r.error, '') = '')
         then 'PASS' else 'FAIL' end,
    format('%s failed, %s expected', (select count(*) from actual_failed), (select count(*) from expected_failed))
  union all
  select 3, 'Job carried on after the crash',
    case when (select status from j) = 'completed'
          and ((select crash_at_row from j) is null
               or ((select count(*) from crash_batch) > 0
                   and not exists (select 1 from crash_batch where attempts < 2)))
         then 'PASS' else 'FAIL' end,
    case when (select crash_at_row from j) is null
         then format('job is %s (no crash set in this test)', (select status from j))
         else format('job is %s; %s rows done before the crash were skipped on the retry',
                (select status from j), (select count(*) from crash_batch where attempts >= 2)) end
  union all
  select 4, 'Progress readable as "x of y"',
    case when public.nf11a_progress() like '% of %' then 'PASS' else 'FAIL' end,
    public.nf11a_progress()
  union all
  select 5, 'Queue is empty',
    case when (select queue_length from pgmq.metrics('nf11a_batches')) = 0 then 'PASS' else 'FAIL' end,
    format('%s batches left', (select queue_length from pgmq.metrics('nf11a_batches')))
) checks order by n;
 
-- The failed rows and their reasons, for the decision page
select r.row_no, r.error
from nf11a.job_rows r
where r.job_id = (select id from nf11a.jobs order by created_at desc limit 1)
  and r.status = 'failed'
order by r.row_no;
 