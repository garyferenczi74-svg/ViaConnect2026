const KEY_NAME = 'TRIPO_API_KEY';

/** Server-only Tripo key. Never NEXT_PUBLIC_. Empty / missing is a clean no-op. */
export function readTripoApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[KEY_NAME];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isTripoEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readTripoApiKey(env) !== null;
}

export function tripoAuthHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}
