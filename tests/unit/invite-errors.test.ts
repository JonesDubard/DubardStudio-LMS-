import { describe, expect, it } from "vitest";
import {
    INVITE_ERROR_CODES,
    inviteErrorCode,
    inviteErrorMessage,
    inviteRoleLabel,
} from "../../lib/auth/invite-errors";

describe("inviteErrorCode", () => {
    it("reads a bare code", () => {
        expect(inviteErrorCode("invite_used")).toBe("invite_used");
    });

    it("reads a code followed by details", () => {
        expect(
            inviteErrorCode("wrong_school: this account belongs to another school"),
        ).toBe("wrong_school");
        expect(inviteErrorCode("school_suspended")).toBe("school_suspended");
    });

    it("does not match a code inside another word", () => {
        expect(inviteErrorCode("invite_used_twice")).toBeNull();
    });

    it("returns null for other errors", () => {
        expect(
            inviteErrorCode("permission denied for function accept_invitation"),
        ).toBeNull();
        expect(inviteErrorCode("")).toBeNull();
        expect(inviteErrorCode(undefined)).toBeNull();
    });
});

describe("inviteErrorMessage", () => {
    it("has a message for every code", () => {
        for (const code of INVITE_ERROR_CODES) {
            expect(inviteErrorMessage(code).length).toBeGreaterThan(10);
        }
    });
});

describe("inviteRoleLabel", () => {
    it("names each role", () => {
        expect(inviteRoleLabel("school_admin")).toBe("School Admin");
        expect(inviteRoleLabel("teacher")).toBe("Teacher");
    });
});
