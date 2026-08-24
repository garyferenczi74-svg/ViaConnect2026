import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageTransition, StaggerChild } from "@/lib/motion";
import { ADMIN_INVENTORY_EMPTY_COPY } from "@/lib/admin/erp-honesty";

export default function InventoryPage() {
  return (
    <PageTransition className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1440px] mx-auto">
      <StaggerChild>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Inventory</h1>
            <p className="text-gray-400 text-sm mt-1">Warehouse snapshot required</p>
          </div>
          <Badge variant="active" className="bg-copper/20 text-copper">INVENTORY</Badge>
        </div>
      </StaggerChild>

      <StaggerChild>
        <Card className="p-6">
          <p className="text-sm text-gray-300">{ADMIN_INVENTORY_EMPTY_COPY}</p>
        </Card>
      </StaggerChild>
    </PageTransition>
  );
}
