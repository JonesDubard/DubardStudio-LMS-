"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { lookupInvite } from "@/lib/auth/invite";
import {
    inviteErrorCode,
    inviteErrorMessage,
    type InviteErrorCode,
} from "@/lib/auth/invite-errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AcceptInviteResult =
    | { ok: true; email: string; signedIn: boolean }
    | { ok: false; code: InviteErrorCode | "error"; error: string };

function refuse(code: InviteErrorCode): AcceptInviteResult {
    return { ok: false, code, error: inviteErrorMessage(code) };
}

function failed(): AcceptInviteResult {
    return {
        ok: false,
        code: "error",
        error: "Something went wrong. Please try again.",
    };
}

const newAccountSchema = z.object({
    fullName: z.string().trim().min(1).max(200),
    password: z.string().min(8).max(72),
});

export async function acceptInvite(
    token: string,
    input: { fullName: string; password: string },
): Promise<AcceptInviteResult> {
    if (typeof token !== "string" || token.length < 20 || token.length > 200) {
        return refuse("invite_unknown");
    }

    let invite;
    try {
        invite = await lookupInvite(token);
    } catch (error) {
        console.error("acceptInvite: lookup failed", error);
        return failed();
    }
    if (!invite.ok) return refuse(invite.code);


    const subdomain = (await headers()).get("x-tenant-subdomain");
    if (subdomain && subdomain !== invite.schoolSubdomain)
        return refuse("wrong_address");

    const admin = createAdminClient();
    const supabase = await createClient();
    const { data: current } = await supabase.auth.getUser();
    const signedInUser = current.user;

    let userId: string;
    let createdUserId: string | null = null;

    if (signedInUser) {
        // Second role for someone who already has an account.
        if ((signedInUser.email ?? "").toLowerCase() !== invite.email)
            return refuse("wrong_account");
        userId = signedInUser.id;
    } else {
        const parsed = newAccountSchema.safeParse(input);
        if (!parsed.success) {
            const field = parsed.error.issues[0]?.path[0];
            return refuse(field === "password" ? "invalid_password" : "invalid_name");
        }

        const created = await admin.auth.admin.createUser({
            email: invite.email,
            password: parsed.data.password,
            email_confirm: true, // the invite link was sent to this address
            user_metadata: { full_name: parsed.data.fullName },
        });
        if (created.error || !created.data.user) {
            const code = created.error?.code;
            if (code === "email_exists" || code === "user_already_exists")
                return refuse("account_exists");
            if (code === "weak_password") return refuse("invalid_password");
            console.error("acceptInvite: createUser failed", created.error);
            return failed();
        }
        userId = created.data.user.id;
        createdUserId = userId;
    }

    const accepted = await admin.rpc("accept_invitation", {
        p_token: token,
        p_user_id: userId,
        p_full_name: signedInUser
            ? input.fullName.trim() ||
            String(signedInUser.user_metadata?.full_name ?? "").trim() ||
            invite.email
            : input.fullName,
    });

    if (accepted.error) {
        if (createdUserId) {
            const removed = await admin.auth.admin.deleteUser(createdUserId);
            if (removed.error) {
                console.error(
                    "acceptInvite: could not delete the new login",
                    createdUserId,
                    removed.error,
                );
            }
        }
        const code = inviteErrorCode(accepted.error.message);
        if (code) return refuse(code);
        console.error("acceptInvite: accept_invitation failed", accepted.error);
        return failed();
    }

    return { ok: true, email: invite.email, signedIn: Boolean(signedInUser) };
}
