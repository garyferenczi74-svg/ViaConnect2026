import { createClient } from "@/lib/supabase/server";
import { resolveSessionRole } from "@/lib/auth/resolve-session-role";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageTransition, StaggerChild } from "@/lib/motion";
import {
  ADMIN_CATALOG_EMPTY_COPY,
  ADMIN_LOOKUP_FAILED_COPY,
  formatCatalogPrice,
} from "@/lib/admin/erp-honesty";
import { loadAdminLiveCatalog } from "@/lib/admin/live-catalog";

export const dynamic = "force-dynamic";

export default async function SKUPortfolioPage() {
  const supabase = await createClient();
  const session = await resolveSessionRole("app.admin.skus");
  const snapshot = await loadAdminLiveCatalog(supabase, session?.role, "app.admin.skus");

  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">SKU Catalog</h1>
            <p className="text-gray-400 text-sm mt-1">Live master SKUs</p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">SKUS</Badge>
        </div>
      </StaggerChild>

      {snapshot.lookupFailed ? (
        <Card className="p-6 text-center">
          <p className="text-gray-400">{ADMIN_LOOKUP_FAILED_COPY}</p>
        </Card>
      ) : snapshot.skus.length > 0 ? (
        <StaggerChild>
          <Card className="p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {["SKU", "Name", "Category", "MSRP"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.skus.map((s) => (
                    <tr
                      key={s.sku}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-2.5 text-xs text-gray-400 font-mono">{s.sku}</td>
                      <td className="px-4 py-2.5 text-xs text-white font-medium">{s.name}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-400">{s.category}</td>
                      <td className="px-4 py-2.5 text-xs text-gray-300">
                        {formatCatalogPrice(s.msrp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </StaggerChild>
      ) : (
        <Card className="p-6 text-center">
          <p className="text-gray-400">{ADMIN_CATALOG_EMPTY_COPY}</p>
        </Card>
      )}
    </PageTransition>
  );
}
