// NF-13: cursor paging. Runs offline: a fake "database" applies the same rule the real one does.
// deno test --node-modules-dir=none --allow-read --allow-env supabase/functions/tests/paging_test.ts
import assert from "node:assert/strict";
import { keysetFilter, MAX_PAGE_SIZE, pageOf, parsePaging, type Paging } from "../_shared/paging.ts";

const assertEquals = (got: unknown, want: unknown, msg?: string) => assert.deepStrictEqual(got, want, msg);

interface Row { id: string; created_at: string }
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// 150 rows; every 3 rows share the same created_at, so the id tiebreak is exercised.
const ROWS: Row[] = Array.from({ length: 150 }, (_, i) => ({
  id: `30000000-0000-4000-8000-${String(i).padStart(12, "0")}`,
  created_at: `2026-01-01T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(Math.floor((i % 60) / 3) * 3).padStart(2, "0")}:00.000000+00:00`,
}));

// What the database does with the helper's range: sort, skip past the cursor, take fetchLimit.
function fetchFrom(rows: Row[], p: Paging): Row[] {
  const asc = p.direction === "oldest";
  const sorted = [...rows].sort((a, b) => (cmp(a.created_at, b.created_at) || cmp(a.id, b.id)) * (asc ? 1 : -1));
  const rest = p.after
    ? sorted.filter((r) => {
      const k = cmp(r.created_at, p.after!.createdAt) || cmp(r.id, p.after!.id);
      return asc ? k > 0 : k < 0;
    })
    : sorted;
  return rest.slice(0, p.fetchLimit);
}

function list(rows: Row[], body: Record<string, unknown>, direction: "newest" | "oldest" = "newest") {
  const p = parsePaging(body, direction);
  return pageOf(fetchFrom(rows, p), p);
}

function refusedWith(fn: () => unknown): string {
  try { fn(); } catch (e) { return (e as { code?: string }).code ?? "other"; }
  return "allowed";
}

Deno.test("150 rows: the first page is at most 100 and has a next cursor", () => {
  const r = list(ROWS, { page_size: 1000 });
  assertEquals(r.rows.length, 100);
  assert.ok(r.paging.next_cursor);
  assertEquals(r.paging.page_size, MAX_PAGE_SIZE);
});

Deno.test("150 rows: following the cursor returns the rest, no repeats, no gaps, in order", () => {
  const seen: Row[] = [];
  let cursor: string | null = null;
  let pages = 0;
  do {
    const r = list(ROWS, cursor ? { page_size: 100, cursor } : { page_size: 100 });
    seen.push(...r.rows);
    cursor = r.paging.next_cursor;
    pages++;
    assert.ok(pages <= 3, "should not loop");
  } while (cursor);
  assertEquals(pages, 2);
  assertEquals(seen.length, 150);
  assertEquals(new Set(seen.map((r) => r.id)).size, 150, "no repeats");
  const expected = [...ROWS].sort((a, b) => cmp(b.created_at, a.created_at) || cmp(b.id, a.id));
  assertEquals(seen.map((r) => r.id), expected.map((r) => r.id), "same order as one big sorted list");
});

Deno.test("the last page has no next cursor, and a list that fits in one page has none either", () => {
  assertEquals(list(ROWS.slice(0, 20), {}).paging.next_cursor, null);
  assertEquals(list([], {}).rows.length, 0);
});

Deno.test("rows that share created_at are never skipped or repeated at a page boundary", () => {
  // page size 4 with groups of 3 equal timestamps puts boundaries inside a group.
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const r = list(ROWS, cursor ? { page_size: 4, cursor } : { page_size: 4 });
    seen.push(...r.rows.map((x) => x.id));
    cursor = r.paging.next_cursor;
  } while (cursor);
  assertEquals(seen.length, 150);
  assertEquals(new Set(seen).size, 150);
});

Deno.test("oldest first walks the same rows in the opposite order", () => {
  const seen: string[] = [];
  let cursor: string | null = null;
  do {
    const r = list(ROWS, cursor ? { page_size: 40, cursor } : { page_size: 40 }, "oldest");
    seen.push(...r.rows.map((x) => x.id));
    cursor = r.paging.next_cursor;
  } while (cursor);
  const expected = [...ROWS].sort((a, b) => cmp(a.created_at, b.created_at) || cmp(a.id, b.id));
  assertEquals(seen, expected.map((r) => r.id));
});

Deno.test("default page size is 20; above 100 gives 100", () => {
  assertEquals(list(ROWS, {}).rows.length, 20);
  assertEquals(list(ROWS, { page_size: 101 }).rows.length, 100);
});

Deno.test("the helper never asks the database for more than 100 rows", () => {
  assertEquals(parsePaging({ page_size: 100 }).fetchLimit, 100);
  assertEquals(parsePaging({ page_size: 500 }).fetchLimit, 100);
  assertEquals(parsePaging({ page_size: 10 }).fetchLimit, 11);
});

Deno.test("refuses a page size that is not a whole number from 1", () => {
  for (const body of [{ page_size: 0 }, { page_size: -1 }, { page_size: 1.5 }, { page_size: "50" }]) {
    assertEquals(refusedWith(() => parsePaging(body)), "invalid_paging", JSON.stringify(body));
  }
});

Deno.test("refuses a cursor that is not one we issued", () => {
  const oldestCursor = list(ROWS, { page_size: 5 }, "oldest").paging.next_cursor!;
  const forged = (v: unknown) => btoa(JSON.stringify(v));
  const bad: unknown[] = [
    "!!!", "", 5, {}, "aGVsbG8", forged({ c: 1, i: 2, d: "newest" }),
    forged({ c: "2026-01-01T00:00:00Z", i: "not-a-uuid", d: "newest" }),
    forged({ c: '2026-01-01T00:00:00Z"),or(id.neq.0', i: ROWS[0].id, d: "newest" }),
    oldestCursor, // issued for the other sort direction
  ];
  for (const cursor of bad) {
    assertEquals(refusedWith(() => parsePaging({ cursor })), "invalid_cursor", JSON.stringify(cursor));
  }
});

Deno.test("keysetFilter: none on the first page, strictly after the cursor on the next", () => {
  assertEquals(keysetFilter(parsePaging({})), null);
  const c = list(ROWS, { page_size: 5 }).paging.next_cursor!;
  const f = keysetFilter(parsePaging({ cursor: c }))!;
  assert.ok(f.startsWith("created_at.lt."), f);
  assert.ok(f.includes("id.lt."), f);
  const oldest = list(ROWS, { page_size: 5 }, "oldest").paging.next_cursor!;
  assert.ok(keysetFilter(parsePaging({ cursor: oldest }, "oldest"))!.startsWith("created_at.gt."));
});