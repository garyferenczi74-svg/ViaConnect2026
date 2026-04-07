"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Product } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import toast from "react-hot-toast";
import {
  ShoppingBag,
  Search,
  ShoppingCart,
  Star,
  Sparkles,
  Filter,
  Grid3X3,
  LayoutList,
  ChevronDown,
  Check,
  Plus,
  Pill,
  Dna,
  Heart,
  Baby,
  Leaf,
  FlaskConical,
  X,
  ArrowRight,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

// ─── Master SKU Library (all FarmCeutica products) ──────────────────────────

import MASTER_SKUS from "@/data/farmceutica_master_skus.json";
import { CategoryNav, CategoryHeader, groupByCategory, categorySectionId } from "@/components/shop/CategorySections";
import { ProductInfoButtons, type FormulationData } from "@/components/shop/ProductInfoButtons";
import { TestingProductInfoButtons } from "@/components/shop/TestingProductInfoButtons";
import { getFormulationByName, getFormulationDataByName } from "@/data/masterFormulations";
import { useCart } from "@/context/CartContext";
import { CartIcon } from "@/components/shop/CartIcon";

const supabase = createClient();

// ─── Category config ─────────────────────────────────────────────────────────

type CategoryKey = "all" | "Base" | "Advanced" | "Women" | "Children" | "SNP" | "Mushroom" | "Testing";

const CATEGORIES: { id: CategoryKey; label: string; icon: React.ElementType; color: string }[] = [
  { id: "all", label: "All Products", icon: Grid3X3, color: "text-gray-400" },
  { id: "Base", label: "Base", icon: Pill, color: "text-teal-light" },
  { id: "Advanced", label: "Advanced", icon: Sparkles, color: "text-copper" },
  { id: "Women", label: "Women's", icon: Heart, color: "text-rose" },
  { id: "Children", label: "Children's", icon: Baby, color: "text-portal-yellow" },
  { id: "SNP", label: "Gene-Targeted", icon: Dna, color: "text-plum" },
  { id: "Mushroom", label: "Mushroom", icon: Leaf, color: "text-sage" },
  { id: "Testing", label: "Testing", icon: FlaskConical, color: "text-cyan" },
];

// ─── SKU type from master file ───────────────────────────────────────────────

type MasterSKU = {
  SKU: string;
  Name: string;
  Category: string;
  MSRP: number;
  COGS: number;
  Wholesale: number;
  Distributor: number;
  DTCMargin: number;
  WSMargin: number;
  DistMargin: number;
  COGSRatio: number;
};

// ─── Recommendation type ─────────────────────────────────────────────────────

type Recommendation = {
  id: string;
  sku: string;
  product_name: string;
  reason: string;
  confidence_score: number;
  confidence_level: string;
  priority_rank: number;
  dosage: string;
  frequency: string;
  monthly_price: number;
  source: string;
};

// Cart item type previously lived here as a local type. As of Prompt #52 the
// shop reads from the global CartContext (src/context/CartContext.tsx) and
// no longer maintains its own item shape.

// ─── Sort options ────────────────────────────────────────────────────────────

type SortOption = "recommended" | "price-low" | "price-high" | "name" | "category";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "recommended", label: "Recommended First" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "name", label: "Name A-Z" },
  { value: "category", label: "Category" },
];

// ─── Supplement name matching (for current regime detection) ─────────────────

const SUPPLEMENT_KEYWORDS: Record<string, string[]> = {
  "BHB Ketone Salts": ["bhb", "ketone", "keto salts"],
  "MethylB Complete+ B Complex": ["b complex", "b12", "methylb", "b vitamin"],
  "Electrolyte Blend": ["electrolyte", "hydration"],
  "GLP-1 Activator Complex": ["glp-1", "glp1", "ozempic alternative", "semaglutide"],
  "Magnesium Synergy Matrix": ["magnesium", "mag"],
  "NeuroCalm BH4 Complex": ["bh4", "neurocalm", "tetrahydrobiopterin"],
  "Omega-3 DHA/EPA (Algal)": ["omega", "fish oil", "dha", "epa", "algal"],
  "ToxiBind Matrix": ["toxibind", "binder", "charcoal", "detox binder"],
  "Creatine HCL+": ["creatine"],
  "CATALYST+ Energy Multivitamin": ["multivitamin", "multi", "catalyst"],
  "Replenish NAD+": ["nad", "nmn", "nicotinamide"],
  "Balance+ Gut Repair": ["gut repair", "gut health", "probiotic", "leaky gut"],
  "BLAST+ Nitric Oxide Stack": ["nitric oxide", "pre workout", "pre-workout", "blast"],
  "NeuroCalm+ (Calm+)": ["calm", "ashwagandha", "adaptogen"],
  "RELAX+ Sleep Support": ["sleep", "melatonin", "relax", "insomnia"],
  "Clean+ Detox & Liver Health": ["liver", "detox", "milk thistle", "nac"],
  "Teloprime+ Telomere Support": ["telomere", "longevity", "aging"],
  "DigestiZorb+ Enzyme Complex": ["enzyme", "digestive enzyme", "digestion"],
  "FOCUS+ Nootropic Formula": ["nootropic", "focus", "lion's mane", "lions mane"],
  "RISE+ Male Testosterone": ["testosterone", "male hormone", "test booster"],
  "FLEX+ Joint & Inflammation": ["joint", "turmeric", "curcumin", "inflammation"],
  "IRON+ Red Blood Cell Support": ["iron", "anemia"],
  "DESIRE+ Female Hormonal": ["female hormone", "estrogen", "menopause"],
  "Grow+ Pre-Natal Formula": ["prenatal", "pre-natal", "pregnancy vitamin"],
  "Chaga Mushroom Capsules": ["chaga"],
  "Cordyceps Mushroom Capsules": ["cordyceps"],
  "Lions Mane Mushroom Capsules": ["lion's mane", "lions mane"],
  "Reishi Mushroom Capsules": ["reishi"],
  "Turkey Tail Mushroom Capsules": ["turkey tail"],
};

function matchesCurrentSupplement(productName: string, currentSupplements: string[]): boolean {
  const keywords = SUPPLEMENT_KEYWORDS[productName];
  if (!keywords) return false;
  return currentSupplements.some((supp) => {
    const norm = supp.toLowerCase().trim();
    return keywords.some((kw) => norm.includes(kw) || kw.includes(norm));
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SupplementShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryKey>("all");
  const [sortBy, setSortBy] = useState<SortOption>("recommended");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  // Cart state now lives in the global CartContext (Prompt #52). The legacy
  // `cart` / `showCart` local state was removed. We re-derive a sku-keyed view
  // here so the inline "in cart" indicator on each product card still works.
  const {
    items: cartItems,
    itemCount: cartItemCount,
    addItem,
    removeItem,
    updateQuantity: updateCartItemQuantity,
  } = useCart();

  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Handle deep-link params from recommendation cards (?q=ProductName&action=buy)
  useEffect(() => {
    const incomingQuery = searchParams.get('q');
    if (incomingQuery) {
      setSearchQuery(incomingQuery);
    }
  }, [searchParams]);

  // Fetch user's personalized recommendations
  const { data: recommendations } = useQuery({
    queryKey: ["shop-recommendations", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("recommendations")
        .select("id, sku, product_name, reason, confidence_score, confidence_level, priority_rank, dosage, frequency, monthly_price, source")
        .eq("user_id", userId!)
        .in("source", ["caq", "genetic"])
        .order("priority_rank");
      return (data ?? []) as Recommendation[];
    },
    enabled: !!userId,
  });

  // Fetch user's CAQ responses (Phase 4 — current supplements)
  const { data: caqData } = useQuery({
    queryKey: ["shop-caq-supplements", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("data")
        .eq("user_id", userId!)
        .eq("phase", 4)
        .single();
      if (data?.data && typeof data.data === "object") {
        const d = data.data as Record<string, unknown>;
        return {
          currentSupplements: (d.supplements as string[]) ?? (d.current_supplements as string[]) ?? [],
        };
      }
      return { currentSupplements: [] as string[] };
    },
    enabled: !!userId,
  });

  // Fetch DB products for image_url/description enrichment
  const { data: dbProducts } = useQuery({
    queryKey: ["shop-db-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("product_catalog")
        .select("sku, name, description, image_url, delivery_form, short_description, formulation_json")
        .eq("active", true);
      return (data ?? []).map((p: any) => ({
        sku: p.sku,
        name: p.name,
        short_name: p.name,
        description: p.description ?? '',
        image_url: p.image_url,
        delivery_type: p.delivery_form,
        short_description: p.short_description ?? null,
        formulation_json: p.formulation_json ?? null,
      })) as {
        sku: string;
        name: string;
        short_name: string;
        description: string;
        image_url: string | null;
        delivery_type: string | null;
        short_description: string | null;
        formulation_json: FormulationData;
      }[];
    },
  });

  // Build recommendation lookup
  const recMap = useMemo(() => {
    const map = new Map<string, Recommendation>();
    (recommendations ?? []).forEach((r) => map.set(r.product_name, r));
    return map;
  }, [recommendations]);

  // Build DB product lookup by normalized name so MASTER_SKUS entries with
  // ™/® symbols, hyphens, plurals, or descriptive suffixes still resolve to the
  // matching DB row (and pick up image_url, delivery_form, etc.)
  const dbProductMap = useMemo(() => {
    type DbInfo = {
      short_name: string;
      description: string;
      image_url: string | null;
      delivery_type: string | null;
      short_description: string | null;
      formulation_json: FormulationData;
    };
    const map = new Map<string, DbInfo>();
    const normKey = (s: string) =>
      s.toLowerCase().replace(/[™®]/g, "").replace(/[^a-z0-9]+/g, "").trim();
    (dbProducts ?? []).forEach((p) => {
      map.set(p.name, p);
      const k = normKey(p.name);
      if (k) map.set(k, p);
    });
    return map;
  }, [dbProducts]);

  // Lookup helper: try exact name, then normalized name, then explicit aliases
  // for testing-kit products whose MASTER_SKUS marketing names differ from the
  // catalog names in product_catalog.
  const findDbInfo = useMemo(() => {
    const NAME_ALIASES: Record<string, string> = {
      // MASTER_SKUS marketing name → product_catalog canonical name
      "GeneX-M™ Methylation Panel": "GeneXM",
      "NutrigenDX™ Genetic Nutrition Panel": "NutragenHQ",
      "HormoneIQ™ Genetic Hormone Panel": "HormoneIQ",
      "EpigenHQ™ Epigenetic Aging Panel": "EpiGenDX",
      "GeneX360™ Complete Genetic Panel": "GeneX360",
      "30-Day Custom Vitamin Package": "30 Day Custom Vitamin Package",
      "PeptideIQ™ Genetic Peptide Response Panel": "PeptidesIQ",
      "CannabisIQ™ Genetic Cannabinoid Panel": "CannabisIQ",
    };
    const normKey = (s: string) =>
      s.toLowerCase().replace(/[™®]/g, "").replace(/[^a-z0-9]+/g, "").trim();
    return (skuName: string) => {
      // 1. exact name
      const exact = dbProductMap.get(skuName);
      if (exact) return exact;
      // 2. explicit alias → canonical DB name
      const aliased = NAME_ALIASES[skuName];
      if (aliased) {
        const v = dbProductMap.get(aliased) ?? dbProductMap.get(normKey(aliased));
        if (v) return v;
      }
      // 3. normalized form
      return dbProductMap.get(normKey(skuName));
    };
  }, [dbProductMap]);

  const currentSupplements = caqData?.currentSupplements ?? [];

  // Filter and sort the full SKU library
  const displayProducts = useMemo(() => {
    let items = (MASTER_SKUS as MasterSKU[]).map((sku) => {
      const rec = recMap.get(sku.Name);
      const dbInfo = findDbInfo(sku.Name);
      const isCurrentRegime = matchesCurrentSupplement(sku.Name, currentSupplements);
      // Prefer the hardcoded Master Formulation file (Prompt #49f) over DB data.
      const masterFormulation = getFormulationByName(sku.Name);
      const masterFormulationLegacy = getFormulationDataByName(sku.Name);
      return {
        ...sku,
        recommendation: rec ?? null,
        isRecommended: !!rec,
        isCurrentRegime,
        description: dbInfo?.description ?? null,
        shortName: dbInfo?.short_name ?? null,
        imageUrl: dbInfo?.image_url ?? null,
        deliveryType: dbInfo?.delivery_type ?? null,
        shortDescription:
          masterFormulation?.marketingDescription ?? dbInfo?.short_description ?? null,
        formulationJson: (masterFormulationLegacy ?? dbInfo?.formulation_json ?? null) as FormulationData,
      };
    });

    // Category filter
    if (categoryFilter !== "all") {
      items = items.filter((p) => p.Category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (p) =>
          p.Name.toLowerCase().includes(q) ||
          p.Category.toLowerCase().includes(q) ||
          (p.shortName && p.shortName.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    // Fixed display order for Testing & Diagnostics products
    const TESTING_ORDER: Record<string, number> = {
      "GeneX360": 1,
      "GeneXM": 2,
      "NutragenHQ": 3,
      "HormoneIQ": 4,
      "EpiGenDX": 5,
      "PeptidesIQ": 6,
      "CannabisIQ": 7,
      "30 Day Custom Vitamin Package": 8,
    };
    const testingOrder = (name: string) => TESTING_ORDER[name] ?? 999;

    // Sort
    switch (sortBy) {
      case "recommended":
        items.sort((a, b) => {
          // Testing products use fixed custom order
          if (a.Category === "Testing" && b.Category === "Testing") {
            return testingOrder(a.Name) - testingOrder(b.Name);
          }
          // Recommended first, then current regime, then alphabetical
          if (a.isRecommended && !b.isRecommended) return -1;
          if (!a.isRecommended && b.isRecommended) return 1;
          if (a.isRecommended && b.isRecommended) return (a.recommendation?.priority_rank ?? 99) - (b.recommendation?.priority_rank ?? 99);
          if (a.isCurrentRegime && !b.isCurrentRegime) return -1;
          if (!a.isCurrentRegime && b.isCurrentRegime) return 1;
          return a.Name.localeCompare(b.Name);
        });
        break;
      case "price-low":
        items.sort((a, b) => a.MSRP - b.MSRP);
        break;
      case "price-high":
        items.sort((a, b) => b.MSRP - a.MSRP);
        break;
      case "name":
        items.sort((a, b) => a.Name.localeCompare(b.Name));
        break;
      case "category":
        items.sort((a, b) => a.Category.localeCompare(b.Category) || a.Name.localeCompare(b.Name));
        break;
    }

    return items;
  }, [categoryFilter, searchQuery, sortBy, recMap, dbProductMap, currentSupplements]);

  // Cart operations — thin wrappers over the global CartContext.
  // `addToCart` keeps the existing call sites untouched while routing through
  // the new context (which persists to shop_cart_items + fires the toast).
  function addToCart(sku: MasterSKU) {
    addItem({
      productSlug: sku.SKU,
      productName: sku.Name,
      productType: sku.Category === "Testing" ? "genetic_test" : "supplement",
      quantity: 1,
      deliveryForm: null,
      unitPriceCents: Math.round((sku.MSRP ?? 0) * 100),
      metadata: {
        category: sku.Category,
        isRecommended: !!recMap.get(sku.Name),
      },
    });
    toast.success(`${sku.Name} added to cart`);
  }

  // Lookup helpers used by the inline "In Cart (n)" indicator on product cards
  const cartBySku = useMemo(() => {
    const m = new Map<string, { id: string; quantity: number }>();
    cartItems.forEach((it) => m.set(it.productSlug, { id: it.id, quantity: it.quantity }));
    return m;
  }, [cartItems]);

  const recommendedCount = displayProducts.filter((p) => p.isRecommended).length;

  // Category badge color
  function categoryColor(cat: string): "active" | "warning" | "danger" | "info" | "pending" | "neutral" {
    switch (cat) {
      case "Base": return "info";
      case "Advanced": return "warning";
      case "Women": return "danger";
      case "Children": return "pending";
      case "SNP": return "active";
      case "Mushroom": return "active";
      case "Testing": return "neutral";
      default: return "neutral";
    }
  }

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <StaggerChild className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-copper" />
            Supplement Shop
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Full product library — personalized picks highlighted from your wellness assessment.
          </p>
        </div>

        {/* Cart trigger — opens the global CartSlideOver from CartContext */}
        <CartIcon />
      </StaggerChild>

      {/* Personalized Banner */}
      {recommendedCount > 0 && (
        <StaggerChild>
          <div className="rounded-xl bg-gradient-to-r from-copper/10 via-teal/10 to-plum/10 border border-copper/20 p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-copper/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-copper" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">
                {recommendedCount} Personalized Recommendations
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Based on your Clinical Assessment Questionnaire results
                {currentSupplements.length > 0 && ` and ${currentSupplements.length} current supplements`}.
                Look for the <span className="text-copper font-medium">star badge</span> on recommended products.
              </p>
            </div>
          </div>
        </StaggerChild>
      )}

      {/* Peptide Catalog discover card — informational, links to /shop/peptides */}
      <StaggerChild>
        <Link
          href="/shop/peptides"
          className="block rounded-2xl border border-[rgba(45,165,160,0.20)] bg-gradient-to-br from-[rgba(45,165,160,0.10)] to-[rgba(183,94,24,0.08)] px-4 py-3 transition-all duration-200 hover:border-[rgba(45,165,160,0.40)] hover:from-[rgba(45,165,160,0.15)] hover:to-[rgba(183,94,24,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DA5A0]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A2744]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[rgba(45,165,160,0.30)] bg-gradient-to-br from-[#1A2744] to-[#2DA5A0]">
              <FlaskConical className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Peptide Catalog
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-[rgba(255,255,255,0.55)]">
                Educational profiles for the FarmCeutica peptide portfolio. Information only — not for direct purchase. Share with your licensed practitioner.
              </p>
            </div>
            <span className="hidden flex-shrink-0 items-center gap-1 rounded-full border border-[rgba(45,165,160,0.30)] bg-[rgba(45,165,160,0.10)] px-3 py-1 text-xs font-medium text-[#2DA5A0] sm:inline-flex">
              View Catalog
              <ChevronDown className="h-3 w-3 -rotate-90" strokeWidth={1.5} />
            </span>
          </div>
        </Link>
      </StaggerChild>

      {/* Search, Filters, Sort, View Toggle */}
      <StaggerChild className="space-y-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search supplements, categories, or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl text-sm text-white placeholder:text-gray-600 bg-white/[0.04] border border-white/[0.08] focus:border-copper/50 focus:ring-1 focus:ring-copper/20 outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills + Sort + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const count =
                cat.id === "all"
                  ? (MASTER_SKUS as MasterSKU[]).length
                  : (MASTER_SKUS as MasterSKU[]).filter((s) => s.Category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? "bg-copper/20 text-copper border border-copper/30"
                      : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.06]"
                  }`}
                >
                  <Icon className={`w-3 h-3 ${categoryFilter === cat.id ? "text-copper" : cat.color}`} />
                  {cat.label}
                  <span className="text-[10px] opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Sort + View */}
          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.06] transition-colors"
              >
                <Filter className="w-3 h-3" />
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${showSortDropdown ? "rotate-180" : ""}`} />
              </button>
              {showSortDropdown && (
                <div className="absolute right-0 top-full mt-1 w-48 rounded-lg bg-dark-card border border-dark-border shadow-xl z-20 py-1">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setSortBy(opt.value);
                        setShowSortDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs hover:bg-white/[0.04] flex items-center gap-2 ${
                        sortBy === opt.value ? "text-copper" : "text-gray-400"
                      }`}
                    >
                      {sortBy === opt.value && <Check className="w-3 h-3" />}
                      <span className={sortBy === opt.value ? "" : "pl-5"}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex rounded-lg border border-white/[0.06] overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 ${viewMode === "grid" ? "bg-copper/20 text-copper" : "bg-white/[0.04] text-gray-500 hover:text-white"}`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 ${viewMode === "list" ? "bg-copper/20 text-copper" : "bg-white/[0.04] text-gray-500 hover:text-white"}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </StaggerChild>

      {/* Results Count */}
      <StaggerChild>
        <p className="text-xs text-gray-500">
          Showing {displayProducts.length} product{displayProducts.length !== 1 ? "s" : ""}
          {categoryFilter !== "all" && ` in ${CATEGORIES.find((c) => c.id === categoryFilter)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </p>
      </StaggerChild>

      {/* Product Grid / List */}
      <StaggerChild>
        {displayProducts.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="No products found"
            description="Try adjusting your search or filter criteria."
          />
        ) : viewMode === "grid" ? (
          /* ── Grouped Category Sections (A-Z) ── */
          (() => {
            const groups = groupByCategory(displayProducts);
            const categoryKeys = [...groups.keys()];
            return (
              <div>
                <CategoryNav categoryKeys={categoryKeys} />
                <div className="space-y-12">
                  {[...groups.entries()].map(([catKey, catProducts]) => (
                    <section key={catKey} id={categorySectionId(catKey)} className="scroll-mt-20">
                      <CategoryHeader categoryKey={catKey} productCount={catProducts.length} />
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {catProducts.map((product) => {
              const inCart = cartBySku.get(product.SKU);
              return (
                <MotionCard
                  key={product.SKU}
                  className={`relative group overflow-hidden ${
                    product.isRecommended
                      ? "ring-1 ring-copper/30"
                      : product.isCurrentRegime
                        ? "ring-1 ring-teal/20"
                        : ""
                  }`}
                >
                  {/* Recommended / Current Regime Badges */}
                  <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                    {product.isRecommended && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-copper/90 text-white text-[10px] font-bold shadow-sm">
                        <Star className="w-3 h-3 fill-current" />
                        Recommended
                      </span>
                    )}
                    {product.isCurrentRegime && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal/80 text-white text-[10px] font-bold shadow-sm">
                        <Check className="w-3 h-3" />
                        Current Regime
                      </span>
                    )}
                  </div>

                  {/* Product Image / Placeholder */}
                  <div className="aspect-square bg-white flex items-center justify-center p-4 relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.Name}
                        className="w-full h-full object-contain mix-blend-multiply"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-copper/15 to-teal/10 flex items-center justify-center">
                        <span className="text-copper text-xl font-bold">
                          {product.SKU.padStart(2, "0")}
                        </span>
                      </div>
                    )}

                    {/* Quick-add overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        size="sm"
                        variant="primary"
                        className="gap-1"
                        onClick={() => addToCart(product)}
                      >
                        <Plus className="w-3 h-3" />
                        Add to Cart
                      </Button>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-3 space-y-2">
                    <Badge variant={categoryColor(product.Category)} className="mb-1">
                      {product.Category}
                    </Badge>

                    <p className="text-sm font-medium text-white leading-tight line-clamp-2">
                      {product.shortName ?? product.Name}
                    </p>

                    {(() => {
                      // For test_kit products, swap the bare delivery_form text
                      // for the product's mini description.
                      const isTestKit =
                        !!product.deliveryType && /test[\s_]?kit/i.test(product.deliveryType);
                      if (isTestKit && product.shortDescription) {
                        return (
                          <p className="text-[10px] text-gray-400 leading-snug line-clamp-3">
                            {product.shortDescription}
                          </p>
                        );
                      }
                      if (product.deliveryType) {
                        return <p className="text-[10px] text-gray-500">{product.deliveryType}</p>;
                      }
                      return null;
                    })()}

                    {/* Recommendation Reason */}
                    {product.recommendation && (
                      <p className="text-[10px] text-copper/80 leading-snug line-clamp-2">
                        {product.recommendation.reason}
                      </p>
                    )}

                    {/* Price + Confidence */}
                    <div className="flex items-end justify-between pt-1">
                      <div>
                        <p className="text-base font-bold text-white">${product.MSRP.toFixed(2)}</p>
                      </div>
                      {product.recommendation && (
                        <div className="text-right">
                          <p className="text-[10px] text-gray-500">Match</p>
                          <p className="text-xs font-semibold text-copper">
                            {product.recommendation.confidence_score}%
                          </p>
                        </div>
                      )}
                    </div>

                    {product.shortDescription && (
                      <p className="text-xs text-[rgba(255,255,255,0.50)] leading-relaxed line-clamp-3 mt-1">
                        {product.shortDescription}
                      </p>
                    )}

                    {/* Description + Formulation drop-downs (or Testing accordion) */}
                    {product.Category === 'Testing' ? (
                      <TestingProductInfoButtons sku={product.SKU} />
                    ) : (
                      <ProductInfoButtons
                        description={product.shortDescription ?? product.description}
                        formulationJson={product.formulationJson}
                        deliveryForm={product.deliveryType}
                      />
                    )}

                    {/* Add to Cart Button */}
                    <Button
                      size="sm"
                      variant={product.isRecommended ? "primary" : "secondary"}
                      className="w-full gap-1 mt-1"
                      onClick={() => addToCart(product)}
                    >
                      {inCart ? (
                        <>
                          <Check className="w-3 h-3" />
                          In Cart ({inCart.quantity})
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          Add to Cart
                        </>
                      )}
                    </Button>
                  </div>
                </MotionCard>
              );
            })}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            );
          })()
        ) : (
          /* ── List View ── */
          <div className="space-y-2">
            {displayProducts.map((product) => {
              const inCart = cartBySku.get(product.SKU);
              return (
                <Card key={product.SKU} className={`p-4 ${product.isRecommended ? "ring-1 ring-copper/30" : ""}`}>
                  <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4">
                    {/* SKU Badge */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-copper/15 to-teal/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-copper text-sm font-bold">{product.SKU.padStart(2, "0")}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-white truncate">
                          {product.shortName ?? product.Name}
                        </p>
                        <Badge variant={categoryColor(product.Category)}>
                          {product.Category}
                        </Badge>
                        {product.isRecommended && (
                          <span className="flex items-center gap-1 text-copper text-[10px] font-bold">
                            <Star className="w-3 h-3 fill-current" />
                            Recommended
                          </span>
                        )}
                        {product.isCurrentRegime && (
                          <span className="flex items-center gap-1 text-teal-light text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            In Your Regime
                          </span>
                        )}
                      </div>
                      {product.recommendation && (
                        <p className="text-xs text-copper/70 mt-0.5 truncate">
                          {product.recommendation.reason}
                        </p>
                      )}
                      {(() => {
                        const isTestKit =
                          !!product.deliveryType && /test[\s_]?kit/i.test(product.deliveryType);
                        if (isTestKit && product.shortDescription) {
                          return (
                            <p className="text-[10px] text-gray-400 mt-0.5 leading-snug line-clamp-2">
                              {product.shortDescription}
                            </p>
                          );
                        }
                        if (product.deliveryType) {
                          return (
                            <p className="text-[10px] text-gray-500 mt-0.5">{product.deliveryType}</p>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    {/* Confidence */}
                    {product.recommendation && (
                      <div className="text-center flex-shrink-0">
                        <p className="text-xs font-semibold text-copper">{product.recommendation.confidence_score}%</p>
                        <p className="text-[10px] text-gray-500">match</p>
                      </div>
                    )}

                    {/* Price */}
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-white">${product.MSRP.toFixed(2)}</p>
                    </div>

                    {/* Add to Cart */}
                    <Button
                      size="sm"
                      variant={product.isRecommended ? "primary" : "secondary"}
                      className="gap-1 flex-shrink-0"
                      onClick={() => addToCart(product)}
                    >
                      {inCart ? (
                        <Check className="w-3 h-3" />
                      ) : (
                        <Plus className="w-3 h-3" />
                      )}
                      {inCart ? `(${inCart.quantity})` : "Add"}
                    </Button>
                  </div>

                    {product.shortDescription && (
                      <p className="text-xs text-[rgba(255,255,255,0.45)] leading-snug line-clamp-2 mt-0.5">
                        {product.shortDescription}
                      </p>
                    )}

                    {/* Description + Formulation drop-downs (or Testing accordion) */}
                    {product.Category === 'Testing' ? (
                      <TestingProductInfoButtons sku={product.SKU} />
                    ) : (
                      <ProductInfoButtons
                        description={product.shortDescription ?? product.description}
                        formulationJson={product.formulationJson}
                        deliveryForm={product.deliveryType}
                      />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </StaggerChild>

      {/* Cart slide-over now lives in src/app/(app)/(consumer)/layout.tsx
          via <CartSlideOver />, driven by the global CartContext (Prompt #52). */}
    </PageTransition>
  );
}
