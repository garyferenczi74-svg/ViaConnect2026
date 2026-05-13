// Prompt #164 Phase 5 follow-up: unwrap the {"types": "..."} MCP envelope
// into a pure TypeScript file and write to src/lib/supabase/types.ts.

const fs = require('fs');
const src = 'C:/Users/garyf/.claude/projects/C--WINDOWS-system32/1a122c73-e874-4c56-98b5-b4c308993d6b/tool-results/mcp-plugin_supabase_supabase-generate_typescript_types-1778647145291.txt';
const dest = 'C:/Users/garyf/ViaConnect2026/viaconnect-web/src/lib/supabase/types.ts';

const wrapped = JSON.parse(fs.readFileSync(src, 'utf8'));
fs.writeFileSync(dest, wrapped.types);
console.log(`wrote ${wrapped.types.length} chars to ${dest}`);
