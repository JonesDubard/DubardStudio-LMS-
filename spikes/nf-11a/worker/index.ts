// NF-11a throwaway worker. LOCAL ONLY: copy it to supabase/functions/nf11a-worker/
// for the test, and delete that copy afterwards (STEPS.md says when).
//
// Each time pg_cron calls it, it takes batches of 50 rows from the queue, one at a
// time, for up to 20 seconds. For each row it asks the database to do the row.
// When a batch is finished it tells the database, which removes it from the queue.
// If it crashes in the middle, the batch is NOT removed, so it comes back after 30 s.
import { createClient } from "npm:@supabase/supabase-js@2";

const RUN_FOR_MS = 20_000; // stop taking new batches after 20 s (Edge Functions have a time limit)
const HIDE_BATCH_SECONDS = 30; // how long a taken batch stays hidden from other workers

const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
);

type Batch = {
    msg_id: number;
    read_ct: number; // 1 on the first try, 2 on the second, ...
    job_id: string;
    first_row: number;
    last_row: number;
    crash_at_row: number | null;
    poison_row: number | null;
};

Deno.serve(async () => {
    const started = Date.now();
    let batches = 0;

    while (Date.now() - started < RUN_FOR_MS) {
        const { data, error } = await db.rpc("nf11a_claim_batch", { p_vt_seconds: HIDE_BATCH_SECONDS });
        if (error) throw new Error(`claim failed: ${error.message}`);
        if (!data) break; // queue is empty
        const batch = data as Batch;

        for (let row = batch.first_row; row <= batch.last_row; row++) {
            // Test 1: crash once, halfway through the job, on the first try only.
            if (row === batch.crash_at_row && batch.read_ct === 1) {
                console.log(`Simulated crash at row ${row} (batch ${batch.first_row}-${batch.last_row})`);
                throw new Error("simulated crash");
            }
            // Test 2: a row that crashes the worker every time.
            if (row === batch.poison_row) {
                console.log(`Poison row ${row}, try ${batch.read_ct}`);
                throw new Error("poison row");
            }

            const { error: rowError } = await db.rpc("nf11a_do_row", { p_job_id: batch.job_id, p_row_no: row });
            if (rowError) throw new Error(`row ${row} failed: ${rowError.message}`);
        }

        const { error: finishError } = await db.rpc("nf11a_finish_batch", {
            p_msg_id: batch.msg_id,
            p_job_id: batch.job_id,
        });
        if (finishError) throw new Error(`finish failed: ${finishError.message}`);

        console.log(`Batch ${batch.first_row}-${batch.last_row} done (try ${batch.read_ct})`);
        batches++;
    }

    return Response.json({ batches });
});
