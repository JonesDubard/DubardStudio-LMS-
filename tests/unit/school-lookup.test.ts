import {
    beforeEach,
    describe,
    expect, it
} from "vitest";

import {
    clearSchoolLookupCache,
    lookupSchool, type RpcClient
} from "../../lib/tenant/lookup";

const PILOT1 = "10000000-0000-4000-8000-000000000001";

/** A fake client that answers get_branding from a list of schools and counts calls. */
function fakeDb(schools: Record<string, string>, fail = false) {
    const calls: string[] = [];
    const db: RpcClient = {
        rpc: async (_fn, args) => {
            calls.push(args.p_subdomain);
            if (fail) return { data: null, error: { message: "boom" } };
            const id = schools[args.p_subdomain];
            return { data: id ? [{ tenant_id: id, name: "x" }] : [], error: null };
        },
    };
    return { db, calls };
}

describe("lookupSchool (US-002.1)", () => {
    beforeEach(() => clearSchoolLookupCache());

    it("returns the school id for a known subdomain", async () => {
        const { db } = fakeDb({ pilot1: PILOT1 });
        expect(await lookupSchool(db, "pilot1")).toEqual({ kind: "ok", tenantId: PILOT1 });
    });

    it("trims and lowercases the subdomain", async () => {
        const { db, calls } = fakeDb({ pilot1: PILOT1 });
        expect(await lookupSchool(db, " Pilot1 ")).toEqual({ kind: "ok", tenantId: PILOT1 });
        expect(calls).toEqual(["pilot1"]);
    });

    it("returns not_found for an unknown subdomain", async () => {
        const { db } = fakeDb({ pilot1: PILOT1 });
        expect(await lookupSchool(db, "nope")).toEqual({ kind: "not_found" });
    });

    it("asks the database once per minute per subdomain", async () => {
        const { db, calls } = fakeDb({ pilot1: PILOT1 });
        await lookupSchool(db, "pilot1", 0);
        await lookupSchool(db, "pilot1", 59_000);
        expect(calls).toHaveLength(1);
        await lookupSchool(db, "pilot1", 61_000);
        expect(calls).toHaveLength(2);
    });

    it("throws on a database error and does not remember it", async () => {
        await expect(lookupSchool(fakeDb({}, true).db, "pilot1")).rejects.toThrow("get_branding failed");
        const { db } = fakeDb({ pilot1: PILOT1 });
        expect(await lookupSchool(db, "pilot1")).toEqual({ kind: "ok", tenantId: PILOT1 });
    });
});
