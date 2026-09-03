const KEY_NAME = 'MESHY_API_KEY';

/** Server-only Meshy key. Never NEXT_PUBLIC_. Empty / missing is a clean no-op. */
export function readMeshyApiKey(
  env: NodeJS.ProcessEnv = process.env,
): string | null {
  const raw = env[KEY_NAME];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isMeshyEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return readMeshyApiKey(env) !== null;
}

export function meshyAuthHeader(apiKey: string): string {
  return `Bearer ${apiKey}`;
}
