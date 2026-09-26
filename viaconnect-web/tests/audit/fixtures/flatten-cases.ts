// Hand-written policy expression fixtures. These are not catalog extracts.

export interface FlattenCase {
  readonly name: string;
  readonly input: string;
  readonly expected: string;
}

export function nestUid(depth: number): string {
  let expr = 'auth.uid()';
  for (let level = 0; level < depth; level += 1) {
    expr = `( SELECT ${expr} AS uid)`;
  }
  return expr;
}

export function nestJwt(depth: number): string {
  let expr = 'auth.jwt()';
  for (let level = 0; level < depth; level += 1) {
    expr = `( SELECT ${expr} AS jwt)`;
  }
  return expr;
}

export function nestRole(depth: number): string {
  let expr = 'auth.role()';
  for (let level = 0; level < depth; level += 1) {
    expr = `( SELECT ${expr} AS role)`;
  }
  return expr;
}

export const FLATTEN_CASES: readonly FlattenCase[] = [
  {
    name: 'depth 1 uid is a no-op',
    input: '(user_id = ( SELECT auth.uid() AS uid))',
    expected: '(user_id = ( SELECT auth.uid() AS uid))',
  },
  {
    name: 'depth 2 uid collapses to one wrapper',
    input: '(user_id = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
    expected: '(user_id = ( SELECT auth.uid() AS uid))',
  },
  {
    name: 'depth 50 uid collapses to one wrapper',
    input: `(user_id = ${nestUid(50)})`,
    expected: '(user_id = ( SELECT auth.uid() AS uid))',
  },
  {
    name: 'depth 908 uid collapses to one wrapper',
    input: `(user_id = ${nestUid(908)})`,
    expected: '(user_id = ( SELECT auth.uid() AS uid))',
  },
  {
    name: 'mixed bare call and a nested call',
    input: '(auth.uid() = x) OR (y = ( SELECT ( SELECT auth.uid() AS uid) AS uid))',
    expected: '(auth.uid() = x) OR (y = ( SELECT auth.uid() AS uid))',
  },
  {
    name: 'jwt depth 3 collapses and the bare jwt call stays',
    input: `(auth.jwt() ->> 'email') = ${nestJwt(3)}`,
    expected: "(auth.jwt() ->> 'email') = ( SELECT auth.jwt() AS jwt)",
  },
  {
    name: 'role depth 4 collapses and keeps the comparison',
    input: `${nestRole(4)} = 'authenticated'`,
    expected: "( SELECT auth.role() AS role) = 'authenticated'",
  },
  {
    name: 'already flat jwt is a no-op',
    input: "( SELECT auth.jwt() AS jwt) ->> 'role'",
    expected: "( SELECT auth.jwt() AS jwt) ->> 'role'",
  },
  {
    name: 'bare uid, jwt, and role stay bare',
    input: "(auth.uid() = user_id) AND (auth.role() = 'service_role') AND (auth.jwt() ->> 'email' IS NOT NULL)",
    expected: "(auth.uid() = user_id) AND (auth.role() = 'service_role') AND (auth.jwt() ->> 'email' IS NOT NULL)",
  },
  {
    name: 'cast and extra parentheses around a nested uid stay',
    input: '(( SELECT ( SELECT ( SELECT auth.uid() AS uid) AS uid) AS uid)::text = owner_id)',
    expected: '(( SELECT auth.uid() AS uid)::text = owner_id)',
  },
];

export const MIGRATION_POLICY_SQL = `
-- comment with CREATE POLICY not_a_policy should be ignored
CREATE TABLE public.demo (id uuid);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'demo_self') THEN
    CREATE POLICY "demo_self"
      ON public.demo FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
  CREATE POLICY "demo_admin"
    ON public.demo FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
    WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
END $$;
`;
