import { Package, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  ADMIN_ALERTS_EMPTY_COPY,
  ADMIN_BOARD_EMPTY_COPY,
  ADMIN_CATALOG_EMPTY_COPY,
  ADMIN_INVENTORY_EMPTY_COPY,
  ADMIN_LOOKUP_FAILED_COPY,
  ADMIN_ORDERS_EMPTY_COPY,
  formatCatalogPrice,
} from "@/lib/admin/erp-honesty";
import { loadAdminLiveCatalog } from "@/lib/admin/live-catalog";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const session = await resolveSessionRole("app.admin.home");
  const entitled = await loadAdminLiveCatalog(supabase, session?.role, "app.admin.home");

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">ViaConnect Admin Portal</h1>
            <p className="text-gray-400 text-sm mt-1">Live operations only</p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">ADMIN</Badge>
        </div>
      </StaggerChild>

      <StaggerChild>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-2">Board Metrics</h2>
          <p className="text-sm text-gray-400">{ADMIN_BOARD_EMPTY_COPY}</p>
        </Card>
      </StaggerChild>

      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Catalog</h2>
            {entitled.skuCount != null && (
              <Badge variant="active">{entitled.skuCount} SKUs</Badge>
            )}
          </div>
          {entitled.lookupFailed ? (
            <p className="text-xs text-gray-500">{ADMIN_LOOKUP_FAILED_COPY}</p>
          ) : entitled.skus.length === 0 ? (
            <p className="text-xs text-gray-500">{ADMIN_CATALOG_EMPTY_COPY}</p>
          ) : (
            <div className="space-y-2">
              {entitled.skus.slice(0, 8).map((sku) => (
                <div
                  key={sku.sku}
                  className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white font-medium truncate">{sku.name}</p>
                    <p className="text-[10px] text-gray-500">
                      {sku.category} &middot; SKU {sku.sku}
                    </p>
                  </div>
                  <span className="text-xs text-gray-300 ml-2">
                    {formatCatalogPrice(sku.msrp)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">Orders</h2>
            <ShoppingBag className="w-4 h-4 text-copper" />
          </div>
          {entitled.lookupFailed ? (
            <p className="text-xs text-gray-500">{ADMIN_LOOKUP_FAILED_COPY}</p>
          ) : entitled.orderCount == null || entitled.orderCount === 0 ? (
            <p className="text-xs text-gray-500">{ADMIN_ORDERS_EMPTY_COPY}</p>
          ) : (
            <p className="text-2xl font-bold text-white">{entitled.orderCount}</p>
          )}
        </Card>
      </StaggerChild>

      <StaggerChild className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-2">Alerts</h2>
          <p className="text-xs text-gray-500">{ADMIN_ALERTS_EMPTY_COPY}</p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-2">Inventory</h2>
          <p className="text-xs text-gray-500">{ADMIN_INVENTORY_EMPTY_COPY}</p>
        </Card>
      </StaggerChild>

      <StaggerChild>
        <Card className="p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Catalog source</h2>
          {entitled.skuCount != null && entitled.skuCount > 0 ? (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] text-sm text-gray-300">
              <Package className="w-4 h-4 text-copper" />
              {entitled.skuCount} master SKUs
            </div>
          ) : (
            <p className="text-xs text-gray-500">{ADMIN_CATALOG_EMPTY_COPY}</p>
          )}
        </Card>
      </StaggerChild>
    </PageTransition>
  );
}
