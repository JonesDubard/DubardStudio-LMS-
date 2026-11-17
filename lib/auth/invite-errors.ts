// US-001.3: what each invite error code means to the person holding the link.
// The codes come from check_invitation() and accept_invitation() (migration 0016),
// plus a few the accept-invite server action adds itself.

export const INVITE_ERROR_CODES = [
    "invite_unknown",
    "invite_used",
    "invite_revoked",
    "invite_expired",
    "invite_no_email",
    "school_suspended",
    "school_cancelled",
    "wrong_school",
    "wrong_address",
    "already_member",
    "account_not_active",
    "account_exists",
    "wrong_account",
    "invalid_name",
    "invalid_password",
] as const;

export type InviteErrorCode = (typeof INVITE_ERROR_CODES)[number];

const MESSAGES: Record<InviteErrorCode, string> = {
    invite_unknown:
        "This invitation link is not valid. Check that you copied the whole link.",
    invite_used:
        "This invitation has already been used. Sign in with your password instead.",
    invite_revoked:
        "This invitation was cancelled. Ask your school for a new one.",
    invite_expired: "This invitation has expired. Ask your school for a new one.",
    invite_no_email:
        "This invitation can't be accepted here. Ask your school for help.",
    school_suspended:
        "Your school's access is paused, so this invitation can't be accepted right now.",
    school_cancelled:
        "Your school's account is closed, so this invitation can't be accepted.",
    wrong_school:
        "Your account belongs to another school, so it can't accept this invitation.",
    wrong_address:
        "This invitation is for another school. Open the link from your email again.",
    already_member:
        "Your account already has this role at this school. Sign in instead.",
    account_not_active:
        "Your account at this school is not active. Ask your school for help.",
    account_exists:
        "You already have an account with this email. Sign in first, then open this link again.",
    wrong_account:
        "You're signed in with a different email. Sign out, then open this link again.",
    invalid_name: "Enter your full name (up to 200 characters).",
    invalid_password: "Choose a password of at least 8 characters.",
};

export function inviteErrorCode(
    message: string | null | undefined,
): InviteErrorCode | null {
    if (!message) return null;
    const found = INVITE_ERROR_CODES.find(
        (code) =>
            message === code ||
            message.startsWith(`${code}:`) ||
            message.startsWith(`${code} `),
    );
    return found ?? null;
}

export function inviteErrorMessage(code: InviteErrorCode): string {
    return MESSAGES[code];
}

const ROLE_LABEL: Record<string, string> = {
    school_admin: "School Admin",
    teacher: "Teacher",
    student: "Student",
    parent: "Parent",
};

export function inviteRoleLabel(role: string): string {
    return ROLE_LABEL[role] ?? role;
}
