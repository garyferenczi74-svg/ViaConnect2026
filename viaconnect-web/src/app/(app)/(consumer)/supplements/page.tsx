"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { UserProtocol, Product, SupplementLog, Order } from "@/lib/supabase/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import toast from "react-hot-toast";
import {
  FlaskConical,
  Search,
  Sun,
  CloudSun,
  Moon,
  MoonStar,
  Plus,
  Package,
  Clock,
} from "lucide-react";
import { PageTransition, StaggerChild, MotionCard } from "@/lib/motion";

const supabase = createClient();

const timeIcons: Record<string, React.ElementType> = {
  morning: Sun,
  noon: CloudSun,
  evening: Moon,
  bedtime: MoonStar,
};

const timeLabels: Record<string, string> = {
  morning: "Morning",
  noon: "Noon",
  evening: "Evening",
  bedtime: "Bedtime",
};

const categoryFilters = [
  { id: "all", label: "All" },
  { id: "supplement", label: "Core Supplements" },
  { id: "test_kit", label: "Test Kits" },
  { id: "peptide", label: "Peptides" },
  { id: "cannabis", label: "Cannabis" },
];

export default function SupplementsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  type ProtocolWithProduct = UserProtocol & { product: Product | null };

  // Current protocol
  const { data: protocol, isLoading: protocolLoading } = useQuery({
    queryKey: ["user-protocol", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("user_protocols")
        .select("*, product:products(*)")
        .eq("user_id", userId!)
        .eq("active", true)
        .order("time_of_day");
      return (data ?? []) as ProtocolWithProduct[];
    },
    enabled: !!userId,
  });

  // Adherence data (last 30 days)
  const { data: recentLogs } = useQuery({
    queryKey: ["recent-logs", userId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from("supplement_logs")
        .select("product_id, logged_at")
        .eq("user_id", userId!)
        .gte("logged_at", thirtyDaysAgo.toISOString());
      return (data ?? []) as Pick<SupplementLog, "product_id" | "logged_at">[];
    },
    enabled: !!userId,
  });

  // Product catalog
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products-catalog"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("active", true)
        .order("name");
      return (data ?? []) as Product[];
    },
  });

  // Order history
  const { data: orders } = useQuery({
    queryKey: ["orders", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data ?? []) as Order[];
    },
    enabled: !!userId,
  });

  // Add to protocol
  const addToProtocol = useMutation({
    mutationFn: async ({ productId, timeOfDay }: { productId: string; timeOfDay: string }) => {
      const { error } = await supabase.from("user_protocols").insert({
        user_id: userId!,
        product_id: productId,
        dose: "1 capsule",
        time_of_day: timeOfDay as "morning" | "noon" | "evening" | "bedtime",
        active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-protocol"] });
      toast.success("Added to protocol");
    },
    onError: () => toast.error("Failed to add to protocol"),
  });

  // Compute adherence per product
  const adherenceMap: Record<string, number> = {};
  if (recentLogs && protocol) {
    protocol.forEach((p: ProtocolWithProduct) => {
      const logs = (recentLogs ?? []).filter((l: Pick<SupplementLog, "product_id" | "logged_at">) => l.product_id === p.product_id);
      adherenceMap[p.product_id] = Math.round((logs.length / 30) * 100);
    });
  }

  // Group protocol by time of day
  const grouped: Record<string, ProtocolWithProduct[]> = { morning: [], noon: [], evening: [], bedtime: [] };
  (protocol ?? []).forEach((item) => {
    const tod = item.time_of_day;
    if (!grouped[tod]) grouped[tod] = [];
    grouped[tod].push(item);
  });

  // Filter catalog
  const filteredProducts = (products ?? []).filter((p) => {
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.short_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const statusBadge: Record<string, "active" | "pending" | "warning" | "danger" | "info"> = {
    pending: "pending",
    processing: "info",
    shipped: "active",
    delivered: "active",
    cancelled: "danger",
  };

  return (
    <PageTransition className="p-6 lg:p-8 space-y-6">
      <StaggerChild>
        <h1 className="text-2xl font-bold text-white">Supplement Protocol</h1>
        <p className="text-gray-400 text-sm mt-1">
          Personalized supplement stack — formulated from your GeneX360 results with 10–27x bioavailability.
        </p>
      </StaggerChild>

      {/* Split Layout */}
      <StaggerChild className="grid grid-cols-1 xl:grid-cols-[1fr_40%] gap-6">
        {/* LEFT: Current Protocol */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Daily Schedule</h2>

          {protocolLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : (protocol ?? []).length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No active protocol"
              description="Browse the catalog and add supplements to build your daily protocol."
            />
          ) : (
            Object.entries(grouped).map(([time, items]) => {
              if (!items || items.length === 0) return null;
              const TimeIcon = timeIcons[time] ?? Clock;
              return (
                <MotionCard key={time} className="p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TimeIcon className="w-4 h-4 text-copper" />
                    <h3 className="text-sm font-semibold text-white">{timeLabels[time] ?? time}</h3>
                    <Badge variant="neutral">{items.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {items.map((item) => {
                      const product = item.product;
                      const adherence = adherenceMap[item.product_id] ?? 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-3 rounded-lg border border-white/[0.06] bg-white/[0.01]"
                        >
                          <div className="w-10 h-10 rounded-lg bg-copper/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-copper text-xs font-bold">Rx</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium truncate">
                              {product?.short_name ?? product?.name ?? "Supplement"}
                            </p>
                            <p className="text-xs text-gray-500">{item.dose}</p>
                          </div>
                          {product?.delivery_type && (
                            <Badge variant="info">{product.delivery_type}</Badge>
                          )}
                          <div className="w-20 text-right">
                            <p className="text-xs text-gray-400 mb-1">{adherence}%</p>
                            <Progress
                              value={adherence}
                              color={
                                adherence >= 80
                                  ? "bg-portal-green"
                                  : adherence >= 50
                                    ? "bg-portal-yellow"
                                    : "bg-rose"
                              }
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </MotionCard>
              );
            })
          )}
        </div>

        {/* RIGHT: Product Catalog */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Product Catalog</h2>

          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search supplements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg text-sm text-white placeholder:text-gray-600 bg-white/[0.04] border border-white/[0.08] focus:border-copper/50 focus:ring-1 focus:ring-copper/20 outline-none"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {categoryFilters.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    categoryFilter === cat.id
                      ? "bg-copper/20 text-copper border border-copper/30"
                      : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:bg-white/[0.06]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-xl" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No products found"
              description="Try adjusting your search or filter criteria."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {filteredProducts.map((product) => (
                <Card key={product.id} className="p-4">
                  <div className="w-10 h-10 rounded-lg bg-copper/10 flex items-center justify-center mb-3">
                    <span className="text-copper text-xs font-bold">Rx</span>
                  </div>
                  <p className="text-sm text-white font-medium truncate">
                    {product.short_name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">${product.price.toFixed(2)}</p>
                  {product.delivery_type && (
                    <Badge variant="neutral" className="mt-2">{product.delivery_type}</Badge>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full mt-3 gap-1"
                    onClick={() => {
                      if (userId) {
                        addToProtocol.mutate({ productId: product.id, timeOfDay: "morning" });
                      }
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Add to Protocol
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </StaggerChild>

      {/* Order History */}
      {(orders ?? []).length > 0 && (
        <StaggerChild className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Order History</h2>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                    <th className="py-3 px-4 font-medium text-xs text-gray-400">Order ID</th>
                    <th className="py-3 px-4 font-medium text-xs text-gray-400">Date</th>
                    <th className="py-3 px-4 font-medium text-xs text-gray-400">Status</th>
                    <th className="py-3 px-4 font-medium text-xs text-gray-400 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(orders ?? []).map((order) => (
                    <tr key={order.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-xs text-gray-400">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-300">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={statusBadge[order.status] ?? "neutral"}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-sm text-white font-medium text-right">
                        ${order.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </StaggerChild>
      )}
    </PageTransition>
  );
}
