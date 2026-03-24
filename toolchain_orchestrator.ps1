<# ================================================================
   FarmCeutica Toolchain Orchestrator & Audit Trail
   Executes all pipeline scripts in dependency order, checksums
   outputs, diffs against prior run, and generates a versioned
   changelog with run metadata.
   Output: toolchain_run_log.json, toolchain_changelog.json
   ================================================================ #>

param(
    [string]$WorkingDir = ".",
    [switch]$DryRun,
    [switch]$SkipUnchanged
)

$ErrorActionPreference = "Stop"
Set-Location $WorkingDir

$RunId = (Get-Date -Format "yyyyMMdd-HHmmss")
$RunStart = Get-Date
$LogFile = "./toolchain_run_log.json"
$ChangelogFile = "./toolchain_changelog.json"
$ChecksumFile = "./toolchain_checksums.json"

# --- Pipeline Definition (dependency order) ---
$Pipeline = @(
    @{
        Step = 1; Name = "Master SKU Loader"
        Script = "farmceutica_master_skus.ps1"
        Outputs = @("farmceutica_master_skus.json")
        DependsOn = @()
        Description = "Generate canonical 62-SKU dataset"
    },
    @{
        Step = 2; Name = "COGS Recalculation"
        Script = "cogs_recalculation_engine.ps1"
        Args = @("-BOMFile", "./updated_bom.csv", "-MasterFile", "./farmceutica_master_skus.json", "-OutputFile", "./cogs_delta_report.json")
        Outputs = @("cogs_delta_report.json")
        DependsOn = @("farmceutica_master_skus.json")
        Description = "Recalculate COGS from BOM ingredients"
    },
    @{
        Step = 3; Name = "Margin Waterfall"
        Script = "margin_waterfall_calculator.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-OutputFile", "./margin_waterfall.json")
        Outputs = @("margin_waterfall.json")
        DependsOn = @("farmceutica_master_skus.json")
        Description = "Decompose margins across 7 cost layers x 3 channels"
    },
    @{
        Step = 4; Name = "Pricing Tier Calculator"
        Script = "pricing_tier_calculator.ps1"
        Args = @("-UpdateFile", "./pricing_updates.csv", "-MasterFile", "./farmceutica_master_skus.json", "-OutputFile", "./updated_pricing_tiers.json")
        Outputs = @("updated_pricing_tiers.json")
        DependsOn = @("farmceutica_master_skus.json")
        Description = "Recalculate 3-tier pricing with margin validation"
    },
    @{
        Step = 5; Name = "Channel Mix Simulator"
        Script = "channel_mix_simulator.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-OutputFile", "./channel_mix_results.json")
        Outputs = @("channel_mix_results.json")
        DependsOn = @("farmceutica_master_skus.json")
        Description = "Simulate revenue across 5 channel mix scenarios"
    },
    @{
        Step = 6; Name = "SKU Rationalization"
        Script = "sku_rationalization_engine.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-WaterfallFile", "./margin_waterfall.json", "-ChannelFile", "./channel_mix_results.json", "-OutputFile", "./sku_rationalization.json")
        Outputs = @("sku_rationalization.json")
        DependsOn = @("farmceutica_master_skus.json", "margin_waterfall.json", "channel_mix_results.json")
        Description = "Score and classify SKUs into Star/Core/Watch/Sunset"
    },
    @{
        Step = 7; Name = "Bundle Optimizer"
        Script = "bundle_promotion_optimizer.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-RationalizationFile", "./sku_rationalization.json", "-OutputFile", "./bundle_optimization.json")
        Outputs = @("bundle_optimization.json")
        DependsOn = @("farmceutica_master_skus.json", "sku_rationalization.json")
        Description = "Design bundles and project revenue uplift"
    },
    @{
        Step = 8; Name = "Executive Dashboard"
        Script = "executive_dashboard_generator.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-WaterfallFile", "./margin_waterfall.json", "-ChannelMixFile", "./channel_mix_results.json", "-RationalizationFile", "./sku_rationalization.json", "-BundleFile", "./bundle_optimization.json", "-PricingFile", "./updated_pricing_tiers.json", "-COGSDeltaFile", "./cogs_delta_report.json", "-OutputFile", "./executive_dashboard.json")
        Outputs = @("executive_dashboard.json")
        DependsOn = @("farmceutica_master_skus.json", "margin_waterfall.json", "channel_mix_results.json", "sku_rationalization.json", "bundle_optimization.json", "updated_pricing_tiers.json", "cogs_delta_report.json")
        Description = "Consolidate all outputs into executive P&L report"
    },
    @{
        Step = 9; Name = "12-Month Forecast"
        Script = "forecast_trend_projector.ps1"
        Args = @("-DashboardFile", "./executive_dashboard.json", "-ChannelMixFile", "./channel_mix_results.json", "-BundleFile", "./bundle_optimization.json", "-OutputFile", "./forecast_12month.json")
        Outputs = @("forecast_12month.json")
        DependsOn = @("executive_dashboard.json", "channel_mix_results.json", "bundle_optimization.json")
        Description = "Project 12 months with seasonality and milestones"
    },
    @{
        Step = 10; Name = "Unit Economics"
        Script = "breakeven_unit_economics.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-WaterfallFile", "./margin_waterfall.json", "-RationalizationFile", "./sku_rationalization.json", "-OutputFile", "./unit_economics.json")
        Outputs = @("unit_economics.json")
        DependsOn = @("farmceutica_master_skus.json", "margin_waterfall.json", "sku_rationalization.json")
        Description = "Calculate breakeven, LTV, and CAC payback per SKU"
    },
    @{
        Step = 11; Name = "Inventory Planner"
        Script = "inventory_reorder_planner.ps1"
        Args = @("-MasterFile", "./farmceutica_master_skus.json", "-ForecastFile", "./forecast_12month.json", "-ChannelFile", "./channel_mix_results.json", "-OutputFile", "./inventory_reorder_plan.json")
        Outputs = @("inventory_reorder_plan.json")
        DependsOn = @("farmceutica_master_skus.json", "forecast_12month.json", "channel_mix_results.json")
        Description = "Calculate EOQ, safety stock, and reorder points"
    }
)

# --- Load Previous Checksums ---
$PrevChecksums = @{}
if (Test-Path $ChecksumFile) {
    $prev = Get-Content $ChecksumFile | ConvertFrom-Json
    $prev.PSObject.Properties | ForEach-Object { $PrevChecksums[$_.Name] = $_.Value }
}

# --- Helper: File Checksum ---
function Get-FileChecksum([string]$Path) {
    if (Test-Path $Path) {
        return (Get-FileHash -Path $Path -Algorithm SHA256).Hash.Substring(0, 16)
    }
    return $null
}

# --- Helper: Quick JSON Diff ---
function Get-JSONDiff([string]$File, [string]$PrevHash) {
    $currHash = Get-FileChecksum $File
    if (-not $PrevHash) { return @{ Changed = $true; Type = "NEW"; Detail = "First run - no prior version" } }
    if ($currHash -eq $PrevHash) { return @{ Changed = $false; Type = "UNCHANGED"; Detail = "Checksum match" } }

    # Extract key metrics for change summary
    $changes = @()
    try {
        $data = Get-Content $File -Raw | ConvertFrom-Json
        if ($data.PSObject.Properties.Name -contains "GeneratedAt") {
            $changes += "Regenerated at $($data.GeneratedAt)"
        }
        if ($data.PSObject.Properties.Name -contains "SKUs") {
            $count = if ($data.SKUs -is [array]) { $data.SKUs.Count } else { 1 }
            $changes += "$count SKUs processed"
        }
        if ($data.PSObject.Properties.Name -contains "Alerts") {
            $alertCount = if ($data.Alerts -is [array]) { $data.Alerts.Count } else { 0 }
            $changes += "$alertCount alerts"
        }
    } catch {}

    return @{ Changed = $true; Type = "MODIFIED"; Detail = ($changes -join "; ") }
}

# --- Execute Pipeline ---
$StepResults = @()
$NewChecksums = @{}
$ChangeEntries = @()
$TotalSteps = $Pipeline.Count
$PassedSteps = 0
$FailedSteps = 0
$SkippedSteps = 0

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  FARMACEUTICA TOOLCHAIN ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "  Run: $RunId | Steps: $TotalSteps" -ForegroundColor Cyan
if ($DryRun) { Write-Host "  MODE: DRY RUN (no scripts executed)" -ForegroundColor Yellow }
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

foreach ($step in $Pipeline) {
    $stepStart = Get-Date
    $stepName = $step.Name
    $scriptPath = "./$($step.Script)"
    $stepNum = $step.Step

    Write-Host "[$stepNum/$TotalSteps] $stepName" -NoNewline

    # Check script exists
    if (-not (Test-Path $scriptPath)) {
        Write-Host " ... SKIP (script not found)" -ForegroundColor Yellow
        $SkippedSteps++
        $StepResults += [PSCustomObject]@{
            Step = $stepNum; Name = $stepName; Status = "SKIPPED"
            Reason = "Script not found: $($step.Script)"
            Duration = "0s"
        }
        continue
    }

    # Check dependencies
    $depsMissing = @()
    foreach ($dep in $step.DependsOn) {
        if (-not (Test-Path "./$dep")) { $depsMissing += $dep }
    }
    if ($depsMissing.Count -gt 0) {
        Write-Host " ... SKIP (missing: $($depsMissing -join ', '))" -ForegroundColor Yellow
        $SkippedSteps++
        $StepResults += [PSCustomObject]@{
            Step = $stepNum; Name = $stepName; Status = "SKIPPED"
            Reason = "Missing dependencies: $($depsMissing -join ', ')"
            Duration = "0s"
        }
        continue
    }

    # Skip unchanged check
    if ($SkipUnchanged -and $step.DependsOn.Count -gt 0) {
        $depsChanged = $false
        foreach ($dep in $step.DependsOn) {
            $currHash = Get-FileChecksum "./$dep"
            if ($currHash -ne $PrevChecksums[$dep]) { $depsChanged = $true; break }
        }
        if (-not $depsChanged) {
            Write-Host " ... SKIP (inputs unchanged)" -ForegroundColor DarkGray
            $SkippedSteps++
            foreach ($out in $step.Outputs) { $NewChecksums[$out] = $PrevChecksums[$out] }
            $StepResults += [PSCustomObject]@{
                Step = $stepNum; Name = $stepName; Status = "SKIPPED"
                Reason = "Inputs unchanged since last run"
                Duration = "0s"
            }
            continue
        }
    }

    # Execute
    if ($DryRun) {
        Write-Host " ... DRY RUN OK" -ForegroundColor DarkGray
        $PassedSteps++
        $StepResults += [PSCustomObject]@{
            Step = $stepNum; Name = $stepName; Status = "DRY_RUN"
            Reason = "Would execute: $($step.Script)"
            Duration = "0s"
        }
        continue
    }

    try {
        $args = if ($step.Args) { $step.Args } else { @() }
        $output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath @args 2>&1
        $exitCode = $LASTEXITCODE

        $duration = [math]::Round(((Get-Date) - $stepStart).TotalSeconds, 1)

        if ($exitCode -ne 0 -and $exitCode -ne $null) {
            throw "Exit code $exitCode"
        }

        Write-Host " ... OK (${duration}s)" -ForegroundColor Green

        # Checksum outputs and detect changes
        foreach ($outFile in $step.Outputs) {
            $hash = Get-FileChecksum "./$outFile"
            $NewChecksums[$outFile] = $hash
            $diff = Get-JSONDiff "./$outFile" $PrevChecksums[$outFile]
            if ($diff.Changed) {
                $ChangeEntries += [PSCustomObject]@{
                    Step = $stepNum; Name = $stepName; File = $outFile
                    ChangeType = $diff.Type; Detail = $diff.Detail
                }
            }
        }

        $PassedSteps++
        $StepResults += [PSCustomObject]@{
            Step = $stepNum; Name = $stepName; Status = "PASSED"
            Duration = "${duration}s"
            OutputFiles = $step.Outputs
        }
    }
    catch {
        $duration = [math]::Round(((Get-Date) - $stepStart).TotalSeconds, 1)
        Write-Host " ... FAILED (${duration}s)" -ForegroundColor Red
        Write-Host "    Error: $_" -ForegroundColor Red
        $FailedSteps++
        $StepResults += [PSCustomObject]@{
            Step = $stepNum; Name = $stepName; Status = "FAILED"
            Error = "$_"; Duration = "${duration}s"
        }
    }
}

$RunEnd = Get-Date
$TotalDuration = [math]::Round(($RunEnd - $RunStart).TotalSeconds, 1)

# --- Save Checksums ---
if (-not $DryRun) {
    $NewChecksums | ConvertTo-Json | Set-Content $ChecksumFile -Encoding UTF8
}

# --- Build Run Log ---
$runLog = [PSCustomObject]@{
    RunId = $RunId
    StartedAt = $RunStart.ToString("o")
    CompletedAt = $RunEnd.ToString("o")
    TotalDuration = "${TotalDuration}s"
    DryRun = [bool]$DryRun
    Summary = [PSCustomObject]@{
        TotalSteps = $TotalSteps
        Passed = $PassedSteps
        Failed = $FailedSteps
        Skipped = $SkippedSteps
    }
    Steps = $StepResults
    FilesChanged = $ChangeEntries.Count
}

$runLog | ConvertTo-Json -Depth 5 | Set-Content $LogFile -Encoding UTF8

# --- Build/Append Changelog ---
$changelog = @()
if (Test-Path $ChangelogFile) {
    $existing = Get-Content $ChangelogFile | ConvertFrom-Json
    if ($existing -is [array]) { $changelog = @($existing) }
}

if ($ChangeEntries.Count -gt 0 -or $FailedSteps -gt 0) {
    $entry = [PSCustomObject]@{
        RunId = $RunId
        Timestamp = $RunStart.ToString("o")
        Duration = "${TotalDuration}s"
        Passed = $PassedSteps
        Failed = $FailedSteps
        Changes = $ChangeEntries
    }
    $changelog = @($entry) + $changelog
    # Keep last 50 runs
    if ($changelog.Count -gt 50) { $changelog = $changelog[0..49] }
}

$changelog | ConvertTo-Json -Depth 8 | Set-Content $ChangelogFile -Encoding UTF8

# --- Console Summary ---
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "  RUN COMPLETE: $RunId" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""
$passColor = if ($PassedSteps -eq $TotalSteps) { "Green" } elseif ($FailedSteps -gt 0) { "Red" } else { "Yellow" }
Write-Host "  Passed:  $PassedSteps / $TotalSteps" -ForegroundColor $passColor
if ($FailedSteps -gt 0) { Write-Host "  Failed:  $FailedSteps" -ForegroundColor Red }
if ($SkippedSteps -gt 0) { Write-Host "  Skipped: $SkippedSteps" -ForegroundColor Yellow }
Write-Host "  Duration: ${TotalDuration}s" -ForegroundColor White
Write-Host "  Changes:  $($ChangeEntries.Count) files modified" -ForegroundColor White
Write-Host ""
if ($ChangeEntries.Count -gt 0) {
    Write-Host "  --- Changes ---" -ForegroundColor Cyan
    foreach ($c in $ChangeEntries) {
        $icon = if ($c.ChangeType -eq "NEW") { "+" } else { "~" }
        Write-Host "  $icon $($c.File) ($($c.ChangeType))" -ForegroundColor White
    }
    Write-Host ""
}
Write-Host "  Log:       $LogFile" -ForegroundColor Cyan
Write-Host "  Changelog: $ChangelogFile" -ForegroundColor Cyan
