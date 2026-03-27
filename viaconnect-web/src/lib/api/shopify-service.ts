// ---------------------------------------------------------------------------
// Shopify Storefront API Service — ViaConnect
// ---------------------------------------------------------------------------

const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN =
  process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN!;

const STOREFRONT_URL = `https://${SHOPIFY_STORE_DOMAIN}/api/2024-04/graphql.json`;

// ---- Generic GraphQL helper ------------------------------------------------

export async function shopifyQuery<T = unknown>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(STOREFRONT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    throw new Error(
      `Shopify Storefront API error: ${res.status} ${res.statusText}`,
    );
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(
      `Shopify GraphQL errors: ${JSON.stringify(json.errors)}`,
    );
  }

  return json.data as T;
}

// ---- Type helpers ----------------------------------------------------------

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  priceRange: {
    minVariantPrice: { amount: string; currencyCode: string };
    maxVariantPrice: { amount: string; currencyCode: string };
  };
  images: { edges: { node: { url: string; altText: string | null } }[] };
  variants: {
    edges: {
      node: {
        id: string;
        title: string;
        priceV2: { amount: string; currencyCode: string };
        availableForSale: boolean;
      };
    }[];
  };
  targetGenes: { value: string } | null;
  category: { value: string } | null;
  requiredPanel: { value: string } | null;
  dosage: { value: string } | null;
}

export interface GeneticProfile {
  variants: {
    gene: string;
    rsid: string;
    genotype: string;
    impact_weight: number;
  }[];
}

export interface EnrichedProduct extends ShopifyProduct {
  geneticMatchScore: number;
  matchingGenes: string[];
}

// ---- getProducts -----------------------------------------------------------

export async function getProducts(first = 50): Promise<ShopifyProduct[]> {
  const query = `
    query GetProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            priceRange {
              minVariantPrice { amount currencyCode }
              maxVariantPrice { amount currencyCode }
            }
            images(first: 5) {
              edges {
                node { url altText }
              }
            }
            variants(first: 10) {
              edges {
                node {
                  id
                  title
                  priceV2 { amount currencyCode }
                  availableForSale
                }
              }
            }
            targetGenes: metafield(namespace: "genex360", key: "target_genes") { value }
            category: metafield(namespace: "genex360", key: "category") { value }
            requiredPanel: metafield(namespace: "genex360", key: "required_panel") { value }
            dosage: metafield(namespace: "genex360", key: "dosage") { value }
          }
        }
      }
    }
  `;

  const data = await shopifyQuery<{
    products: { edges: { node: ShopifyProduct }[] };
  }>(query, { first });

  return data.products.edges.map((e) => e.node);
}

// ---- Cart mutations --------------------------------------------------------

export async function createCart(
  variantId: string,
  quantity: number,
): Promise<{ cartId: string; checkoutUrl: string }> {
  const mutation = `
    mutation CartCreate($variantId: ID!, $quantity: Int!) {
      cartCreate(input: {
        lines: [{ merchandiseId: $variantId, quantity: $quantity }]
      }) {
        cart {
          id
          checkoutUrl
        }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyQuery<{
    cartCreate: {
      cart: { id: string; checkoutUrl: string };
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, { variantId, quantity });

  if (data.cartCreate.userErrors.length) {
    throw new Error(
      `Cart creation failed: ${data.cartCreate.userErrors
        .map((e) => e.message)
        .join(', ')}`,
    );
  }

  return {
    cartId: data.cartCreate.cart.id,
    checkoutUrl: data.cartCreate.cart.checkoutUrl,
  };
}

export async function addToCart(
  cartId: string,
  variantId: string,
  quantity: number,
): Promise<{ cartId: string; checkoutUrl: string }> {
  const mutation = `
    mutation CartLinesAdd($cartId: ID!, $variantId: ID!, $quantity: Int!) {
      cartLinesAdd(cartId: $cartId, lines: [{ merchandiseId: $variantId, quantity: $quantity }]) {
        cart {
          id
          checkoutUrl
        }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyQuery<{
    cartLinesAdd: {
      cart: { id: string; checkoutUrl: string };
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, { cartId, variantId, quantity });

  if (data.cartLinesAdd.userErrors.length) {
    throw new Error(
      `Add to cart failed: ${data.cartLinesAdd.userErrors
        .map((e) => e.message)
        .join(', ')}`,
    );
  }

  return {
    cartId: data.cartLinesAdd.cart.id,
    checkoutUrl: data.cartLinesAdd.cart.checkoutUrl,
  };
}

export async function applyDiscount(
  cartId: string,
  discountCode: string,
): Promise<{ cartId: string }> {
  const mutation = `
    mutation CartDiscountCodesUpdate($cartId: ID!, $discountCodes: [String!]) {
      cartDiscountCodesUpdate(cartId: $cartId, discountCodes: $discountCodes) {
        cart { id }
        userErrors { field message }
      }
    }
  `;

  const data = await shopifyQuery<{
    cartDiscountCodesUpdate: {
      cart: { id: string };
      userErrors: { field: string[]; message: string }[];
    };
  }>(mutation, { cartId, discountCodes: [discountCode] });

  if (data.cartDiscountCodesUpdate.userErrors.length) {
    throw new Error(
      `Discount apply failed: ${data.cartDiscountCodesUpdate.userErrors
        .map((e) => e.message)
        .join(', ')}`,
    );
  }

  return { cartId: data.cartDiscountCodesUpdate.cart.id };
}

// ---- Genetic match enrichment ----------------------------------------------

export function enrichProductsWithGeneticMatch(
  products: ShopifyProduct[],
  geneticProfile: GeneticProfile,
): EnrichedProduct[] {
  const profileGeneMap = new Map<string, number>();
  for (const variant of geneticProfile.variants) {
    const existing = profileGeneMap.get(variant.gene) ?? 0;
    profileGeneMap.set(variant.gene, existing + variant.impact_weight);
  }

  const enriched: EnrichedProduct[] = products.map((product) => {
    let geneticMatchScore = 0;
    const matchingGenes: string[] = [];

    if (product.targetGenes?.value) {
      try {
        const targetGenes: string[] = JSON.parse(product.targetGenes.value);
        for (const gene of targetGenes) {
          const weight = profileGeneMap.get(gene);
          if (weight !== undefined) {
            geneticMatchScore += weight;
            matchingGenes.push(gene);
          }
        }
      } catch {
        // metafield is not valid JSON — skip matching
      }
    }

    return { ...product, geneticMatchScore, matchingGenes };
  });

  // Sort descending by match score
  enriched.sort((a, b) => b.geneticMatchScore - a.geneticMatchScore);

  return enriched;
}
