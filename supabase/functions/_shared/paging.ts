// NF-13: every list comes back in pages of at most 100 rows.
// parsePaging() reads "page" and "page_size" from the request body and returns the row
// range for the database; pageOf() builds the paging part of the answer.
//   page        1, 2, 3 ... (default 1)
//   page_size   default 25; asking for more than 100 gives 100
import { HttpError } from "./admin.ts";

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;
const MAX_PAGE = 1_000_000;

export interface Paging {
  page: number;
  pageSize: number;
  /** First row, counting from 0, for supabase .range(from, to). */
  from: number;
  /** Last row (inclusive). */
  to: number;
}

function whole(value: unknown, name: string, fallback: number, max: number): number {
  if (value === undefined || value === null) return fallback;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > max) {
    throw new HttpError(400, "invalid_paging", `${name} must be a whole number from 1 to ${max}.`);
  }
  return value;
}

export function parsePaging(body: Record<string, unknown>): Paging {
  const page = whole(body.page, "page", 1, MAX_PAGE);
  // A page size above the maximum is not an error: the caller gets the largest page allowed.
  const asked = body.page_size;
  const pageSize = typeof asked === "number" && Number.isInteger(asked) && asked > MAX_PAGE_SIZE
    ? MAX_PAGE_SIZE
    : whole(asked, "page_size", DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const from = (page - 1) * pageSize;
  return { page, pageSize, from, to: from + pageSize - 1 };
}

export function pageOf(total: number, p: Paging) {
  return {
    page: p.page,
    page_size: p.pageSize,
    total,
    total_pages: Math.max(1, Math.ceil(total / p.pageSize)),
  };
}