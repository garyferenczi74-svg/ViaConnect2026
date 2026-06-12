// Prompt 192 Task 3 test util: a recording fake of the supabase client
// surface the runner, loader, and helix award touch. Every from() call is
// recorded with its operation, payload, and filter chain; resolution comes
// from per table handlers, defaulting to { data: null, error: null } so
// fail open code paths see an empty world instead of throwing.

export interface FakeCall {
  table: string;
  op: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
  payload?: unknown;
  filters: Array<{ method: string; args: unknown[] }>;
}

export interface FakeResponse {
  data?: unknown;
  error?: { message: string } | null;
}

export type FakeHandler = (call: FakeCall) => FakeResponse | undefined;

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'upsert',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'is',
  'not',
  'order',
  'limit',
  'range',
  'contains',
  'maybeSingle',
  'single',
] as const;

const OP_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

export function makeFakeAdmin(handlers: Record<string, FakeHandler> = {}): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  calls: FakeCall[];
} {
  const calls: FakeCall[] = [];

  function from(table: string) {
    const call: FakeCall = { table, op: 'select', filters: [] };
    calls.push(call);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const builder: any = {};
    for (const method of CHAIN_METHODS) {
      builder[method] = (...args: unknown[]) => {
        if (OP_METHODS.has(method)) {
          call.op = method as FakeCall['op'];
          call.payload = args[0];
        } else {
          call.filters.push({ method, args });
        }
        return builder;
      };
    }
    builder.then = (
      onFulfilled?: (value: FakeResponse) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => {
      const response = handlers[table]?.(call) ?? {};
      return Promise.resolve({ data: null, error: null, ...response }).then(
        onFulfilled,
        onRejected,
      );
    };
    return builder;
  }

  return { client: { from }, calls };
}

/** First recorded call matching table and op, if any. */
export function findCall(
  calls: FakeCall[],
  table: string,
  op: FakeCall['op'],
): FakeCall | undefined {
  return calls.find((c) => c.table === table && c.op === op);
}

/** All recorded calls matching table and op. */
export function findCalls(calls: FakeCall[], table: string, op: FakeCall['op']): FakeCall[] {
  return calls.filter((c) => c.table === table && c.op === op);
}

/** True when the call's filter chain contains method(...args) exactly. */
export function hasFilter(call: FakeCall, method: string, ...args: unknown[]): boolean {
  return call.filters.some(
    (f) => f.method === method && JSON.stringify(f.args) === JSON.stringify(args),
  );
}
