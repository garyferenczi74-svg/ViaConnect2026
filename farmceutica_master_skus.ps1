<# ================================================================
   FarmCeutica Master SKU Data Loader
   Generates: farmceutica_master_skus.json
   Version: 2.0 | March 2026
   ================================================================ #>

$ErrorActionPreference = "Stop"
$OutputFile = "C:/Users/garyf/farmceutica_master_skus.json"

# Pricing Model Constants
$WholesaleDiscount = 0.50   # 50% off MSRP
$DistributorDiscount = 0.70 # 70% off MSRP

# Define all 62 SKUs
$SKUs = @(
    @{ SKU="01"; Name="BHB Ketone Salts"; Category="Base"; MSRP=68.88; COGS=5.43; DTCMargin=92.1 },
    @{ SKU="02"; Name="MethylB Complete+ B Complex"; Category="Base"; MSRP=48.88; COGS=4.6; DTCMargin=90.6 },
    @{ SKU="03"; Name="Electrolyte Blend"; Category="Base"; MSRP=48.88; COGS=5.52; DTCMargin=88.7 },
    @{ SKU="04"; Name="GLP-1 Activator Complex"; Category="Base"; MSRP=88.88; COGS=7.68; DTCMargin=91.4 },
    @{ SKU="05"; Name="Magnesium Synergy Matrix"; Category="Base"; MSRP=58.88; COGS=3.92; DTCMargin=93.3 },
    @{ SKU="06"; Name="NeuroCalm BH4 Complex"; Category="Base"; MSRP=88.88; COGS=5.84; DTCMargin=93.4 },
    @{ SKU="07"; Name="Omega-3 DHA/EPA (Algal)"; Category="Base"; MSRP=48.88; COGS=4.74; DTCMargin=90.3 },
    @{ SKU="08"; Name="ToxiBind Matrix"; Category="Base"; MSRP=48.88; COGS=4.51; DTCMargin=90.8 },
    @{ SKU="09"; Name="Creatine HCL+"; Category="Advanced"; MSRP=98.88; COGS=10.86; DTCMargin=89 },
    @{ SKU="10"; Name="CATALYST+ Energy Multivitamin"; Category="Advanced"; MSRP=98.88; COGS=13.58; DTCMargin=86.3 },
    @{ SKU="11"; Name="Replenish NAD+"; Category="Advanced"; MSRP=108; COGS=14.03; DTCMargin=87 },
    @{ SKU="12"; Name="Balance+ Gut Repair"; Category="Advanced"; MSRP=98.88; COGS=12.29; DTCMargin=87.6 },
    @{ SKU="13"; Name="BLAST+ Nitric Oxide Stack"; Category="Advanced"; MSRP=98; COGS=11.81; DTCMargin=88 },
    @{ SKU="14"; Name="NeuroCalm+ (Calm+)"; Category="Advanced"; MSRP=128.88; COGS=17.61; DTCMargin=86.3 },
    @{ SKU="15"; Name="RELAX+ Sleep Support"; Category="Advanced"; MSRP=88.88; COGS=10.42; DTCMargin=88.3 },
    @{ SKU="16"; Name="Clean+ Detox & Liver Health"; Category="Advanced"; MSRP=108.88; COGS=14.98; DTCMargin=86.2 },
    @{ SKU="17"; Name="Teloprime+ Telomere Support"; Category="Advanced"; MSRP=188.88; COGS=24.15; DTCMargin=87.2 },
    @{ SKU="18"; Name="DigestiZorb+ Enzyme Complex"; Category="Advanced"; MSRP=48.88; COGS=5.58; DTCMargin=88.6 },
    @{ SKU="19"; Name="FOCUS+ Nootropic Formula"; Category="Advanced"; MSRP=158.88; COGS=19.41; DTCMargin=87.8 },
    @{ SKU="20"; Name="RISE+ Male Testosterone"; Category="Advanced"; MSRP=128.88; COGS=20.54; DTCMargin=84.1 },
    @{ SKU="21"; Name="FLEX+ Joint & Inflammation"; Category="Advanced"; MSRP=98.88; COGS=12.72; DTCMargin=87.1 },
    @{ SKU="22"; Name="IRON+ Red Blood Cell Support"; Category="Advanced"; MSRP=108.88; COGS=14.13; DTCMargin=87 },
    @{ SKU="23"; Name="NeuroCalm BH4+ (Advanced)"; Category="Advanced"; MSRP=158.88; COGS=8.02; DTCMargin=95 },
    @{ SKU="24"; Name="Histamine Relief Protocol"; Category="Advanced"; MSRP=158.88; COGS=15.01; DTCMargin=90.6 },
    @{ SKU="25"; Name="DESIRE+ Female Hormonal"; Category="Women"; MSRP=88.88; COGS=11.78; DTCMargin=86.7 },
    @{ SKU="26"; Name="Grow+ Pre-Natal Formula"; Category="Women"; MSRP=98.88; COGS=15.2; DTCMargin=84.6 },
    @{ SKU="27"; Name="Revitalizher Postnatal+"; Category="Women"; MSRP=128.88; COGS=25.58; DTCMargin=80.2 },
    @{ SKU="28"; Name="Thrive+ Post-Natal GLP-1"; Category="Women"; MSRP=128.88; COGS=21.63; DTCMargin=83.2 },
    @{ SKU="29"; Name="Sproutables Infant Tincture"; Category="Children"; MSRP=48.88; COGS=4.85; DTCMargin=90.1 },
    @{ SKU="30"; Name="Sproutables Toddler Tablets"; Category="Children"; MSRP=58.88; COGS=6.74; DTCMargin=88.6 },
    @{ SKU="31"; Name="Sproutables Children Gummies"; Category="Children"; MSRP=58.88; COGS=7.35; DTCMargin=87.5 },
    @{ SKU="32"; Name="ACAT+ Mitochondrial Support"; Category="SNP"; MSRP=108.88; COGS=12.21; DTCMargin=88.8 },
    @{ SKU="33"; Name="ACHY+ Acetylcholine Support"; Category="SNP"; MSRP=108.88; COGS=18.5; DTCMargin=83 },
    @{ SKU="34"; Name="ADO Support+ Purine Metabolism"; Category="SNP"; MSRP=108.88; COGS=13.54; DTCMargin=87.6 },
    @{ SKU="35"; Name="BHMT+ Methylation Support"; Category="SNP"; MSRP=108.88; COGS=14.13; DTCMargin=87 },
    @{ SKU="36"; Name="CBS Support+ Sulfur Pathway"; Category="SNP"; MSRP=108.88; COGS=12.92; DTCMargin=88.1 },
    @{ SKU="37"; Name="COMT+ Neurotransmitter Balance"; Category="SNP"; MSRP=108.88; COGS=15.13; DTCMargin=86.1 },
    @{ SKU="38"; Name="DAO+ Histamine Balance"; Category="SNP"; MSRP=108.88; COGS=14.83; DTCMargin=86.4 },
    @{ SKU="39"; Name="GST+ Cellular Detox"; Category="SNP"; MSRP=118.88; COGS=20.47; DTCMargin=82.8 },
    @{ SKU="40"; Name="MAOA+ Neurochemical Balance"; Category="SNP"; MSRP=118.88; COGS=20.35; DTCMargin=82.9 },
    @{ SKU="41"; Name="MTHFR+ Folate Metabolism"; Category="SNP"; MSRP=118.88; COGS=18.46; DTCMargin=84.5 },
    @{ SKU="42"; Name="MTR+ Methylation Matrix"; Category="SNP"; MSRP=118.88; COGS=16.54; DTCMargin=86.1 },
    @{ SKU="43"; Name="MTRR+ Methylcobalamin Regen"; Category="SNP"; MSRP=118.88; COGS=16.26; DTCMargin=86.3 },
    @{ SKU="44"; Name="NAT Support+ Acetylation"; Category="SNP"; MSRP=118.88; COGS=19.39; DTCMargin=83.7 },
    @{ SKU="45"; Name="NOS+ Vascular Integrity"; Category="SNP"; MSRP=118.88; COGS=16.68; DTCMargin=86 },
    @{ SKU="46"; Name="RFC1 Support+ Folate Transport"; Category="SNP"; MSRP=108.88; COGS=14.88; DTCMargin=86.3 },
    @{ SKU="47"; Name="SHMT+ Glycine-Folate Balance"; Category="SNP"; MSRP=108.88; COGS=11.98; DTCMargin=89 },
    @{ SKU="48"; Name="SOD+ Antioxidant Defense"; Category="SNP"; MSRP=108.88; COGS=16.25; DTCMargin=85.1 },
    @{ SKU="49"; Name="SUOX+ Sulfite Clearance"; Category="SNP"; MSRP=108.88; COGS=14.44; DTCMargin=86.7 },
    @{ SKU="50"; Name="TCN2+ B12 Transport"; Category="SNP"; MSRP=108.88; COGS=14.78; DTCMargin=86.4 },
    @{ SKU="51"; Name="VDR+ Receptor Activation"; Category="SNP"; MSRP=108.88; COGS=15.34; DTCMargin=85.9 },
    @{ SKU="52"; Name="Chaga Mushroom Capsules"; Category="Mushroom"; MSRP=58.88; COGS=9.77; DTCMargin=83.4 },
    @{ SKU="53"; Name="Cordyceps Mushroom Capsules"; Category="Mushroom"; MSRP=58.88; COGS=9.77; DTCMargin=83.4 },
    @{ SKU="54"; Name="Lions Mane Mushroom Capsules"; Category="Mushroom"; MSRP=58.88; COGS=7.61; DTCMargin=87.1 },
    @{ SKU="55"; Name="Reishi Mushroom Capsules"; Category="Mushroom"; MSRP=58.88; COGS=7.07; DTCMargin=88 },
    @{ SKU="56"; Name="Turkey Tail Mushroom Capsules"; Category="Mushroom"; MSRP=58.88; COGS=7.07; DTCMargin=88 },
    @{ SKU="57"; Name="Genetic Methylation Testing"; Category="Testing"; MSRP=288.88; COGS=159.88; DTCMargin=44.7 },
    @{ SKU="58"; Name="Genetic Nutrition Test"; Category="Testing"; MSRP=388.88; COGS=228.88; DTCMargin=41.1 },
    @{ SKU="59"; Name="Dutch Hormone Test"; Category="Testing"; MSRP=508.88; COGS=198.88; DTCMargin=60.9 },
    @{ SKU="60"; Name="EpiGenDX"; Category="Testing"; MSRP=443; COGS=298.88; DTCMargin=32.5 },
    @{ SKU="61"; Name="Combo Test (Meth+Nutr+Dutch)"; Category="Testing"; MSRP=688.88; COGS=329; DTCMargin=52.2 },
    @{ SKU="62"; Name="30 Day Custom Vitamin Package"; Category="Testing"; MSRP=198.88; COGS=65; DTCMargin=67.3 }
)

$EnrichedSKUs = $SKUs | ForEach-Object {
    $msrp = $_.MSRP
    $cogs = $_.COGS
    $ws = [math]::Round($msrp * (1 - $WholesaleDiscount), 2)
    $dist = [math]::Round($msrp * (1 - $DistributorDiscount), 2)
    $wsMargin = [math]::Round((($ws - $cogs) / $ws) * 100, 1)
    $distMargin = [math]::Round((($dist - $cogs) / $dist) * 100, 1)
    $cogsRatio = [math]::Round(($cogs / $msrp) * 100, 1)

    $_ | Add-Member -NotePropertyName Wholesale -NotePropertyValue $ws -PassThru |
         Add-Member -NotePropertyName Distributor -NotePropertyValue $dist -PassThru |
         Add-Member -NotePropertyName WSMargin -NotePropertyValue $wsMargin -PassThru |
         Add-Member -NotePropertyName DistMargin -NotePropertyValue $distMargin -PassThru |
         Add-Member -NotePropertyName COGSRatio -NotePropertyValue $cogsRatio -PassThru
}

$EnrichedSKUs | ConvertTo-Json -Depth 5 | Set-Content $OutputFile -Encoding UTF8
Write-Host "Exported $($EnrichedSKUs.Count) SKUs to $OutputFile" -ForegroundColor Green
Write-Host "Portfolio MSRP Range: $([math]::Round(($SKUs.MSRP | Measure-Object -Minimum).Minimum,2)) - $([math]::Round(($SKUs.MSRP | Measure-Object -Maximum).Maximum,2))" -ForegroundColor Cyan
Write-Host "Avg DTC Margin: $([math]::Round(($SKUs.DTCMargin | Measure-Object -Average).Average,1))%" -ForegroundColor Cyan
