// NF-13: every list comes back in pages of at most 100 rows, using a cursor.
//   page_size   default 20; asking for more than 100 gives 100
//   cursor      the next_cursor from the previous answer (leave out for the first page)
// Lists are sorted by created_at, then id, so rows with the same created_at keep a fixed order.
import { HttpError } from "./admin.ts";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export type Direction = "newest" | "oldest";

export interface Paging {
  pageSize: number;
  direction: Direction;
  /** The last row of the previous page, or null for the first page. */
  after: { createdAt: string; id: string } | null;
  /**
   * Rows to ask the database for: one more than the page size, so we can tell if there is a
   * next page. Never more than 100 (the API's Max Rows), so at page size 100 there is no extra row.
   */
  fetchLimit: number;
}

const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}(:?\d{2})?)$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const invalidCursor = () => new HttpError(400, "invalid_cursor", "cursor is not valid.");

function encodeCursor(createdAt: string, id: string, direction: Direction): string {
  return btoa(JSON.stringify({ c: createdAt, i: id, d: direction }))
    .replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeCursor(cursor: string, direction: Direction): { createdAt: string; id: string } {
  try {
    const raw = atob(cursor.replaceAll("-", "+").replaceAll("_", "/"));
    const v = JSON.parse(raw);
    if (typeof v.c !== "string" || typeof v.i !== "string" || v.d !== direction) throw 0;
    if (!TIMESTAMP.test(v.c) || !UUID.test(v.i)) throw 0;
    return { createdAt: v.c, id: v.i };
  } catch {
    throw invalidCursor();
  }
}

export function parsePaging(body: Record<string, unknown>, direction: Direction = "newest"): Paging {
  const asked = body.page_size;
  let pageSize = DEFAULT_PAGE_SIZE;
  if (asked !== undefined && asked !== null) {
    if (typeof asked !== "number" || !Number.isInteger(asked) || asked < 1) {
      throw new HttpError(400, "invalid_paging", `page_size must be a whole number from 1 to ${MAX_PAGE_SIZE}.`);
    }
    pageSize = Math.min(asked, MAX_PAGE_SIZE); // above the maximum is not an error
  }
  const c = body.cursor;
  if (c !== undefined && c !== null && typeof c !== "string") throw invalidCursor();
  const after = typeof c === "string" ? decodeCursor(c, direction) : null;
  return { pageSize, direction, after, fetchLimit: Math.min(pageSize + 1, MAX_PAGE_SIZE) };
}

/** The PostgREST filter for "rows after the cursor", or null on the first page. */
export function keysetFilter(p: Paging): string | null {
  if (!p.after) return null;
  const op = p.direction === "newest" ? "lt" : "gt";
  const { createdAt: c, id: i } = p.after; // checked by decodeCursor, so safe to put in a filter
  return `created_at.${op}."${c}",and(created_at.eq."${c}",id.${op}."${i}")`;
}

/** Pass the rows fetched with p.fetchLimit; returns one page and the next cursor (or null). */
export function pageOf<T extends { created_at: string; id: string }>(rows: T[], p: Paging) {
  const page = rows.slice(0, p.pageSize);
  const last = page[page.length - 1];
  // A full fetch means there may be more. At page size 100 we can't fetch an extra row
  // (Max Rows is 100), so a list of exactly 100 gives one empty last page. That is expected.
  const next = rows.length >= p.fetchLimit && last ? encodeCursor(last.created_at, last.id, p.direction) : null;
  return { rows: page, paging: { page_size: p.pageSize, next_cursor: next } };
}