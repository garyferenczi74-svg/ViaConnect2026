$data = Get-Content 'C:/Users/garyf/ViaConnect2026/inventory_reorder_plan.json' | ConvertFrom-Json
$sql = @()
foreach ($r in $data.SKUs) {
    $safeName = $r.Name -replace "'","''"
    $d = $r.Demand; $sc = $r.SupplyChain; $il = $r.InventoryLevels; $f = $r.Financials; $ri = $r.Risk; $po = $r.NextPO
    $sql += "('$($r.SKU)','$safeName','$($r.Category)',$($r.COGS),$($d.AvgMonthlyUnits),$($d.PeakMonthlyUnits),$($d.AnnualUnits),$($d.DailyUnits),$($d.DemandCV),$($sc.LeadTimeDays),$($sc.MOQ),$($sc.ShelfLifeMonths),$($il.SafetyStock),$($il.ReorderPoint),$($il.EOQ),$($il.MaxStock),$($il.AvgInventory),$($il.WeeksOfSupply),$($f.AvgInventoryValue),$($f.AnnualHoldingCost),$($f.AnnualOrderingCost),$($f.TotalInventoryCost),$($f.InventoryTurns),$($f.OrdersPerYear),'$($ri.StockoutRisk)','$($ri.ShelfLifeRisk)','$($po.Urgency)',$($po.DaysUntilReorder),$($po.OrderQuantity),$($po.OrderValue))"
}
$insert = "INSERT INTO public.inventory_reorder (sku,name,category,cogs,avg_monthly_demand,peak_monthly_demand,annual_demand,daily_demand,demand_cv,lead_time_days,moq,shelf_life_months,safety_stock,reorder_point,eoq,max_stock,avg_inventory,weeks_of_supply,avg_inventory_value,annual_holding_cost,annual_ordering_cost,total_inventory_cost,inventory_turns,orders_per_year,stockout_risk,shelf_life_risk,po_urgency,days_until_reorder,next_order_qty,next_order_value) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/inventory_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
