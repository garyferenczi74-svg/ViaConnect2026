export interface ShopLinkParams {
  sku?: string | null;
  productName: string;
  action?: 'buy' | 'view';
}

export function buildShopLink({ sku, productName, action = 'view' }: ShopLinkParams): string {
  const params = new URLSearchParams({ q: productName });
  if (action === 'buy') params.set('action', 'buy');
  return `/shop?${params.toString()}`;
}

export function buildPurchaseLink(params: Omit<ShopLinkParams, 'action'>): string {
  return buildShopLink({ ...params, action: 'buy' });
}

export function buildViewLink(params: Omit<ShopLinkParams, 'action'>): string {
  return buildShopLink({ ...params, action: 'view' });
}
