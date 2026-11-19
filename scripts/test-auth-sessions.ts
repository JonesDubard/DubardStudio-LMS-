/**
 * US-004.5: checks password reset and sign-out against the LOCAL Supabase.
 * CI's db job only starts Postgres, not Supabase Auth, so this runs by hand:
 *
 *   supabase start
 *   npx tsx scripts/test-auth-sessions.ts
 *
 * It makes two throwaway logins (@us004.test), uses Mailpit (local Supabase's
 * mail catcher, http://127.0.0.1:54324) to read the reset emails, and deletes the
 * logins at the end. Seed accounts are not touched. Refuses to run against
 * anything but a local Supabase.
 *
 * Checks:
 *   US-004.4  "this device" sign-out revokes that session's refresh token only
 *   US-004.4  "all devices" sign-out revokes every session's refresh token
 *   US-004.2  a reset link returns to the school address it was asked from
 *   US-004.2  a reset link never returns to an address that isn't allowed
 *   US-004.3  a second reset email to the same address within a minute is refused
 *   US-004.5  reset end to end: new password works, old one doesn't
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./load-env";

loadLocalEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
const mailpit = process.env.MAILPIT_URL?.trim() || "http://127.0.0.1:54324";
const schoolAddress = "http://pilot1.localhost:3000";

if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url)) {
    console.error(
        `Refusing to run: NEXT_PUBLIC_SUPABASE_URL is "${url}", not a local Supabase.`,
    );
    process.exit(1);
}
if (!anonKey || !serviceKey) {
    console.error(
        "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
    process.exit(1);
}

const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
});

/** A separate browser/device: its own session, nothing shared. */
function device(): SupabaseClient {
    return createClient(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            flowType: "implicit",
        },
    });
}

let failures = 0;
function check(label: string, ok: boolean, detail = ""): void {
    if (ok) console.log(`ok - ${label}`);
    else {
        failures += 1;
        console.log(`FAIL - ${label}${detail ? ` (${detail})` : ""}`);
    }
}

async function signIn(email: string, password: string) {
    const client = device();
    const { data, error } = await client.auth.signInWithPassword({
        email,
        password,
    });
    if (error || !data.session)
        throw new Error(`sign in as ${email} failed: ${error?.message}`);
    return { client, refreshToken: data.session.refresh_token };
}

/** Can this refresh token still get a new session? */
async function refreshWorks(refreshToken: string): Promise<boolean> {
    const { data, error } = await device().auth.refreshSession({
        refresh_token: refreshToken,
    });
    return !error && Boolean(data.session);
}

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

type MailpitSummary = {
    ID: string;
    Created: string;
    To: { Address: string }[];
};

/** Waits for the newest email to `to` sent after `since`, returns the reset link in it. */
async function resetLinkFor(to: string, since: Date): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
        const res = await fetch(
            `${mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${to}"`)}`,
        );
        if (!res.ok) throw new Error(`Mailpit search failed: ${res.status}`);
        const body = (await res.json()) as { messages?: MailpitSummary[] };
        const fresh = (body.messages ?? []).find(
            (m) => new Date(m.Created) >= since,
        );
        if (fresh) {
            const msg = (await (
                await fetch(`${mailpit}/api/v1/message/${fresh.ID}`)
            ).json()) as {
                HTML?: string;
                Text?: string;
            };
            const text = `${msg.HTML ?? ""}\n${msg.Text ?? ""}`.replaceAll(
                "&amp;",
                "&",
            );
            const link = text.match(
                /https?:\/\/[^\s"'<>]*\/auth\/v1\/verify\?[^\s"'<>]*/,
            )?.[0];
            if (!link)
                throw new Error("The reset email has no /auth/v1/verify link.");
            return link;
        }
        await sleep(500);
    }
    throw new Error(`No reset email reached ${to} in Mailpit (${mailpit}).`);
}

/** Opens the email link like a browser would, without following the redirect. */
async function whereLinkGoes(link: string): Promise<URL> {
    const res = await fetch(link, { redirect: "manual" });
    const location = res.headers.get("location");
    if (!location)
        throw new Error(`The reset link did not redirect (HTTP ${res.status}).`);
    return new URL(location);
}

async function makeUser(email: string, password: string): Promise<string> {
    const { data, error } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
    });
    if (error || !data.user)
        throw new Error(`could not create ${email}: ${error?.message}`);
    return data.user.id;
}

async function main(): Promise<void> {
    const stamp = Date.now();
    const emailA = `reset-a-${stamp}@us004.test`;
    const emailB = `reset-b-${stamp}@us004.test`;
    const oldPassword = "Old-Password-1";
    const newPassword = "New-Password-2";
    const made: string[] = [];

    try {
        made.push(await makeUser(emailA, oldPassword));
        made.push(await makeUser(emailB, oldPassword));

        // --- US-004.4: sign out on this device only ------------------------------
        const laptop = await signIn(emailA, oldPassword);
        const phone = await signIn(emailA, oldPassword);
        await laptop.client.auth.signOut({ scope: "local" });
        check(
            "this-device sign-out: that device's refresh token is refused",
            !(await refreshWorks(laptop.refreshToken)),
        );
        check(
            "this-device sign-out: the other device stays signed in",
            await refreshWorks(phone.refreshToken),
        );

        // --- US-004.4: sign out everywhere ---------------------------------------
        const desk = await signIn(emailA, oldPassword);
        const tablet = await signIn(emailA, oldPassword);
        await desk.client.auth.signOut({ scope: "global" });
        check(
            "all-devices sign-out: this device's refresh token is refused",
            !(await refreshWorks(desk.refreshToken)),
        );
        check(
            "all-devices sign-out: the other device's refresh token is refused too",
            !(await refreshWorks(tablet.refreshToken)),
        );

        // --- US-004.2 / .3 / .5: reset from a school address -----------------------
        const sinceA = new Date(Date.now() - 1000);
        const asked = await device().auth.resetPasswordForEmail(emailA, {
            redirectTo: `${schoolAddress}/reset/confirm`,
        });
        check("reset request is accepted", !asked.error, asked.error?.message);

        const again = await device().auth.resetPasswordForEmail(emailA, {
            redirectTo: `${schoolAddress}/reset/confirm`,
        });
        check(
            "a second reset email to the same address within a minute is refused",
            Boolean(again.error),
            "max_frequency in supabase/config.toml should be 60s",
        );

        const landing = await whereLinkGoes(await resetLinkFor(emailA, sinceA));
        check(
            "the reset link returns to the school's address",
            `${landing.origin}${landing.pathname}` ===
            `${schoolAddress}/reset/confirm`,
            `went to ${landing.origin}${landing.pathname}; add the school address to additional_redirect_urls`,
        );

        const fragment = new URLSearchParams(landing.hash.replace(/^#/, ""));
        const accessToken = fragment.get("access_token");
        const refreshToken = fragment.get("refresh_token");
        check(
            "the reset link signs the person in for the reset",
            Boolean(accessToken && refreshToken),
            landing.hash || "no tokens",
        );

        if (accessToken && refreshToken) {
            const resetting = device();
            await resetting.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
            });
            const changed = await resetting.auth.updateUser({
                password: newPassword,
            });
            check(
                "the new password is saved",
                !changed.error,
                changed.error?.message,
            );

            const withOld = await device().auth.signInWithPassword({
                email: emailA,
                password: oldPassword,
            });
            check("the old password no longer works", Boolean(withOld.error));
            const withNew = await device().auth.signInWithPassword({
                email: emailA,
                password: newPassword,
            });
            check(
                "the new password works",
                !withNew.error && Boolean(withNew.data.session),
                withNew.error?.message,
            );
        }

        // --- US-004.2: a link never goes to an address that isn't allowed ----------
        const sinceB = new Date(Date.now() - 1000);
        await device().auth.resetPasswordForEmail(emailB, {
            redirectTo: "http://evil.example.com/reset/confirm",
        });
        const elsewhere = await whereLinkGoes(await resetLinkFor(emailB, sinceB));
        check(
            "a reset link never goes to an address that isn't allowed",
            elsewhere.hostname !== "evil.example.com",
            `went to ${elsewhere.origin}`,
        );
    } finally {
        for (const id of made) {
            const { error } = await admin.auth.admin.deleteUser(id);
            if (error)
                console.error(`could not delete test login ${id}: ${error.message}`);
        }
    }

    if (failures > 0) {
        console.log(`\n${failures} check(s) failed.`);
        process.exit(1);
    }
    console.log("\nAll checks passed.");
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
