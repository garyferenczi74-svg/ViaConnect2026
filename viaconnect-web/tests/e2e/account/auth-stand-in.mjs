// Local auth stand-in for the account-deletion Playwright check.
// It is not imported by the app. It answers only the Supabase auth and
// REST calls the profile pages make, and it never talks to production.

import { createServer } from 'node:http';

const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'reviewer@example.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
};

const port = Number(process.env.AUTH_STAND_IN_PORT || 5999);

const server = createServer((req, res) => {
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://127.0.0.1');
  if (url.pathname === '/auth/v1/user') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(USER));
    return;
  }
  if (url.pathname.startsWith('/rest/v1/')) {
    const accept = String(req.headers.accept || '');
    if (accept.includes('vnd.pgrst.object')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: USER.id, role: 'consumer', full_name: 'Reviewer' }));
      return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('[]');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'not_found', path: url.pathname }));
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`auth stand-in on ${port}\n`);
});
