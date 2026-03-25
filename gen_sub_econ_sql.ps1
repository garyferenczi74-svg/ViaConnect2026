$data = Get-Content 'C:/Users/garyf/ViaConnect2026/subscription_mrr_analysis.json' | ConvertFrom-Json
$sql = @()
foreach ($s in $data.SKUDetails) {
    $safeName = $s.Name -replace "'","''"
    $bestTier = $s.BestSubscriptionTier -replace "'","''"
    $sql += "('$($s.SKU)','$safeName','$($s.Category)',$($s.MSRP),'$($s.SubscriptionAffinity)','$bestTier',$($s.BestLifetimeProfit))"
}
$insert = "INSERT INTO public.subscription_sku_economics (sku,name,category,msrp,subscription_affinity,best_subscription_tier,best_lifetime_profit) VALUES`n" + ($sql -join ",`n") + ";"
$insert | Set-Content 'C:/Users/garyf/ViaConnect2026/sub_econ_insert.sql' -Encoding UTF8
Write-Host "Generated $($sql.Count) rows"
