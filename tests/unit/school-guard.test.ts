import { describe, expect, it } from "vitest";
import { checkSchoolMatch } from "../../lib/auth/school-guard";

const PILOT1 = "10000000-0000-4000-8000-000000000001";
const PILOT2 = "10000000-0000-4000-8000-000000000002";

describe("checkSchoolMatch (US-002.2)", () => {
    it("allows a user of this school", () => {
        expect(checkSchoolMatch({ kind: "ok", tenantId: PILOT1 }, PILOT1)).toBe("allow");
    });

    it("refuses an account from another school with wrong_school", () => {
        expect(checkSchoolMatch({ kind: "ok", tenantId: PILOT1 }, PILOT2)).toBe("wrong_school");
    });

    it("refuses a token with no school (Platform Admin or no active membership)", () => {
        expect(checkSchoolMatch({ kind: "ok", tenantId: PILOT1 }, null)).toBe("wrong_school");
    });

    it("gives not_found for an unknown subdomain, signed in or not", () => {
        expect(checkSchoolMatch({ kind: "not_found" }, PILOT1)).toBe("not_found");
        expect(checkSchoolMatch({ kind: "not_found" }, null)).toBe("not_found");
    });
});
