export const RESET_COOLDOWN_SECONDS = 60;

export function resetWaitSeconds(
    error: { status?: number; code?: string; message?: string } | null | undefined,
): number | null {
    if (!error) return null;
    const tooSoon = error.code === "over_email_send_rate_limit" || error.status === 429;
    if (!tooSoon) return null;
    const seconds = Number(error.message?.match(/after (\d+) seconds?/)?.[1]);
    return Number.isFinite(seconds) && seconds > 0 ? seconds : RESET_COOLDOWN_SECONDS;
}

/** 42 -> "0:42", 60 -> "1:00" */
export function formatCountdown(seconds: number): string {
    const whole = Math.max(0, Math.ceil(seconds));
    return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
