/**
 * Prompt 215: /full long-scroll retired. Permanent redirect to PDP tabs.
 * Deep-link preserves genetic_compatibility via query when requested.
 */

import { redirect } from 'next/navigation'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams?: Promise<{ tab?: string }>
}

export default async function ProductFullCardRedirect(props: PageProps) {
  const params = await props.params
  const sp = props.searchParams ? await props.searchParams : {}
  const tab = sp.tab ? `?tab=${encodeURIComponent(sp.tab)}` : ''
  redirect(`/shop/product/${params.slug}${tab}`)
}
