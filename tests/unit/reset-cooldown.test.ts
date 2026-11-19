import { describe, expect, it } from "vitest";
import {
    RESET_COOLDOWN_SECONDS,
    formatCountdown,
    resetWaitSeconds,
} from "../../lib/auth/reset-cooldown";

describe("resetWaitSeconds", () => {
    it("reads the seconds from Supabase's message", () => {
        expect(
            resetWaitSeconds({
                status: 429,
                code: "over_email_send_rate_limit",
                message: "For security purposes, you can only request this after 42 seconds.",
            }),
        ).toBe(42);
    });

    it("falls back to a full minute when the message has no number", () => {
        expect(resetWaitSeconds({ status: 429, message: "Too many requests" })).toBe(
            RESET_COOLDOWN_SECONDS,
        );
    });

    it("ignores other errors", () => {
        expect(resetWaitSeconds({ status: 400, message: "Invalid email" })).toBeNull();
        expect(resetWaitSeconds(null)).toBeNull();
    });
});

describe("formatCountdown", () => {
    it("shows minutes and seconds", () => {
        expect(formatCountdown(60)).toBe("1:00");
        expect(formatCountdown(42)).toBe("0:42");
        expect(formatCountdown(5)).toBe("0:05");
        expect(formatCountdown(0)).toBe("0:00");
        expect(formatCountdown(-3)).toBe("0:00");
    });
});
