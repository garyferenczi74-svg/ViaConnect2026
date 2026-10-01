// Narrow port over the service-role client so account deletion does not
// depend on generated table types and does not use an explicit any.

import type { SupabaseClient } from '@supabase/supabase-js';

export interface QueryError {
  message: string;
  code?: string;
}

export interface QueryResponse {
  data: unknown;
  error: QueryError | null;
}

export interface FilterBuilder extends PromiseLike<QueryResponse> {
  eq(column: string, value: string): FilterBuilder;
  in(column: string, values: readonly string[]): FilterBuilder;
}

export interface TableHandle {
  select(columns: string): FilterBuilder;
  update(values: Readonly<Record<string, unknown>>): FilterBuilder;
  delete(): FilterBuilder;
}

export interface StorageListItem {
  name: string;
  id: string | null;
}

export interface AccountAdmin {
  from(table: string): TableHandle;
  rpc(fn: string): Promise<QueryResponse>;
  storage: {
    from(bucket: string): {
      list(
        path: string,
        options: { limit: number; offset: number },
      ): Promise<{ data: StorageListItem[] | null; error: QueryError | null }>;
      remove(paths: string[]): Promise<{ error: QueryError | null }>;
    };
  };
  auth: {
    admin: {
      deleteUser(userId: string): Promise<{ error: QueryError | null }>;
    };
  };
}

interface LooseFilter extends PromiseLike<{ data: unknown; error: { message: string; code?: string; status?: number } | null }> {
  eq(column: string, value: unknown): LooseFilter;
  in(column: string, values: readonly unknown[]): LooseFilter;
  select(columns: string): LooseFilter;
  update(values: Record<string, unknown>): LooseFilter;
  delete(): LooseFilter;
}

function asLoose(value: unknown): LooseFilter {
  if (typeof value !== 'object' || value === null) {
    throw new Error('unexpected query builder');
  }
  return value as LooseFilter;
}

function toQueryError(error: { message: string; code?: string; status?: number } | null): QueryError | null {
  if (!error) return null;
  const code = error.code ?? (typeof error.status === 'number' ? String(error.status) : undefined);
  return { message: error.message, code };
}

function asFilter(loose: LooseFilter): FilterBuilder {
  const filter: FilterBuilder = {
    eq(column: string, value: string) {
      return asFilter(loose.eq(column, value));
    },
    in(column: string, values: readonly string[]) {
      return asFilter(loose.in(column, values));
    },
    then(onfulfilled, onrejected) {
      return Promise.resolve(loose).then((result) => ({
        data: result.data,
        error: toQueryError(result.error),
      })).then(onfulfilled, onrejected);
    },
  };
  return filter;
}

export function accountAdmin(client: SupabaseClient): AccountAdmin {
  return {
    from(table: string): TableHandle {
      const raw = asLoose(client.from(table));
      return {
        select(columns: string) {
          return asFilter(raw.select(columns));
        },
        update(values: Readonly<Record<string, unknown>>) {
          return asFilter(raw.update({ ...values }));
        },
        delete() {
          return asFilter(raw.delete());
        },
      };
    },
    async rpc(fn: string): Promise<QueryResponse> {
      const result = await client.rpc(fn);
      return {
        data: result.data,
        error: toQueryError(result.error),
      };
    },
    storage: {
      from(bucket: string) {
        const bucketApi = client.storage.from(bucket);
        return {
          async list(path: string, options: { limit: number; offset: number }) {
            const result = await bucketApi.list(path, options);
            const data = result.data
              ? result.data.map((row) => ({ name: row.name, id: row.id ?? null }))
              : null;
            return {
              data,
              error: result.error ? { message: result.error.message } : null,
            };
          },
          async remove(paths: string[]) {
            const result = await bucketApi.remove(paths);
            return { error: result.error ? { message: result.error.message } : null };
          },
        };
      },
    },
    auth: {
      admin: {
        async deleteUser(userId: string) {
          const result = await client.auth.admin.deleteUser(userId);
          return { error: toQueryError(result.error) };
        },
      },
    },
  };
}
