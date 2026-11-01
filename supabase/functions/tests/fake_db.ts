// A small stand-in for the Supabase client, for unit tests of the admin path.
// It records every query, so tests can check which school each one was limited to.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface Query {
  table: string;
  op: "select" | "insert" | "update" | "delete";
  columns?: string;
  rows?: unknown;
  values?: Record<string, unknown>;
  filters: [string, unknown][];
}

type Result = {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
};

export class FakeDb {
  queries: Query[] = [];
  rpcCalls: { name: string; args: Record<string, unknown> }[] = [];
  /** token -> user id */
  users: Record<string, string> = {};
  /** user id -> is_active */
  admins: Record<string, boolean> = {};
  tenants: Record<string, Record<string, unknown>> = {};
  failAuditInsert = false;
  rpcResult: Result = { data: null, error: null };

  auth = {
    getUser: (token: string) =>
      Promise.resolve(
        this.users[token]
          ? { data: { user: { id: this.users[token] } }, error: null }
          : { data: { user: null }, error: { message: "invalid JWT" } },
      ),
  };

  from(table: string) {
    return new FakeQuery(this, table);
  }

  rpc(name: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ name, args });
    return Promise.resolve(this.rpcResult);
  }

  get auditRows(): Record<string, unknown>[] {
    return this.queries
      .filter((q) => q.table === "audit_log" && q.op === "insert")
      .map((q) => q.rows as Record<string, unknown>);
  }

  asClient(): SupabaseClient {
    return this as unknown as SupabaseClient;
  }

  resolve(q: Query): Result {
    const id = q.filters.find(([c]) => c === "id")?.[1] as string | undefined;
    if (q.table === "audit_log" && q.op === "insert") {
      return this.failAuditInsert
        ? { error: { message: "permission denied" } }
        : { error: null };
    }
    if (q.table === "platform_admins") {
      return {
        data:
          id !== undefined && id in this.admins
            ? { is_active: this.admins[id] }
            : null,
        error: null,
      };
    }
    if (q.table === "tenants" && q.op === "select") {
      return {
        data: id && this.tenants[id] ? this.tenants[id] : null,
        error: null,
      };
    }
    if (q.op === "select") return { data: [], count: 3, error: null };
    return { data: null, error: null };
  }
}

class FakeQuery implements PromiseLike<Result> {
  private q: Query;
  constructor(
    private db: FakeDb,
    table: string,
  ) {
    this.q = { table, op: "select", filters: [] };
  }
  select(columns = "*") {
    this.q.op = "select";
    this.q.columns = columns;
    return this;
  }
  insert(rows: unknown) {
    this.q.op = "insert";
    this.q.rows = rows;
    return this;
  }
  update(values: Record<string, unknown>) {
    this.q.op = "update";
    this.q.values = values;
    return this;
  }
  delete() {
    this.q.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.q.filters.push([column, value]);
    return this;
  }
  maybeSingle() {
    return this;
  }
  single() {
    return this;
  }
  then<A = Result, B = never>(
    ok?: ((r: Result) => A | PromiseLike<A>) | null,
    fail?: ((e: unknown) => B | PromiseLike<B>) | null,
  ) {
    this.db.queries.push(this.q);
    return Promise.resolve(this.db.resolve(this.q)).then(ok, fail);
  }
}
