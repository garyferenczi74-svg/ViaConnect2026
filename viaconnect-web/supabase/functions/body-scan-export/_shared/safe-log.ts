// Re-export from the canonical shared module one level up.
// This copy exists so the Supabase MCP deploy bundler can resolve the
// relative import. The source of truth is ../_shared/safe-log.ts.
export * from '../../_shared/safe-log.ts';
