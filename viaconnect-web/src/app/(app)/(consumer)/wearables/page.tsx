import { redirect } from 'next/navigation';

// Canonical Connections path is /body-tracker/connections. Same page. Not a fifth destination.

export default function WearablesAliasPage() {
  redirect('/body-tracker/connections');
}
