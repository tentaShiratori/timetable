# Stream or dump Timetable-related logcat from a connected Android device.
# See docs/android-release.md for usage context.
#
# Usage:
#   .\scripts\show-android-logs.ps1
#   .\scripts\show-android-logs.ps1 -Dump
#   .\scripts\show-android-logs.ps1 -Dump -Lines 300
#   .\scripts\show-android-logs.ps1 -Clear
#   .\scripts\show-android-logs.ps1 -AppOnly
#   .\scripts\show-android-logs.ps1 -Package com.tenta.timetable.debug -Serial 33211JEHN21845
#   .\scripts\show-android-logs.ps1 -Save logs\timetable.log
#   .\scripts\show-android-logs.ps1 -WebView
#
# release ビルドでは Tauri Logger (Tauri/*) はほぼ出ない。WebView の console.log は -WebView で見る。

param(
    [string]$Package = "",
    [string]$Serial = "",
    [switch]$Dump,
    [int]$Lines = 500,
    [switch]$Clear,
    [switch]$AppOnly,
    [switch]$WebView,
    [string]$Save = "",
    [string[]]$Tags = @()
)

$ErrorActionPreference = "Stop"

if ($Tags.Count -eq 0) {
    if ($WebView) {
        $Tags = @("chromium", "cr_WebView", "Tauri", "AndroidRuntime")
    } else {
        $Tags = @("Tauri", "AndroidRuntime", "GlanceAppWidget", "chromium")
    }
}

function Invoke-Adb {
    param([string[]]$CommandArgs)
    $adbArgs = @()
    if ($Serial -ne "") {
        $adbArgs += "-s"
        $adbArgs += $Serial
    }
    $adbArgs += $CommandArgs
    & adb @adbArgs
}

function Resolve-Package {
    param([string]$Preferred)
    if ($Preferred -ne "") {
        $installed = Invoke-Adb @("shell", "pm", "path", $Preferred)
        if ($LASTEXITCODE -eq 0 -and ($installed -match "^package:")) {
            return $Preferred
        }
        throw "package not installed: $Preferred"
    }

    foreach ($candidate in @("com.tenta.timetable.debug", "com.tenta.timetable")) {
        $installed = Invoke-Adb @("shell", "pm", "path", $candidate)
        if ($LASTEXITCODE -eq 0 -and ($installed -match "^package:")) {
            return $candidate
        }
    }

    throw "Timetable app not found. Install release or debug build first."
}

function Resolve-AppPid {
    param([string]$PackageName)
    $pid = (Invoke-Adb @("shell", "pidof", "-s", $PackageName) | Out-String).Trim()
    if ($pid -match "^\d+$") {
        return $pid
    }
    return $null
}

if (-not (Get-Command adb -ErrorAction SilentlyContinue)) {
    throw "adb not found in PATH."
}

$devices = @(Invoke-Adb @("devices") | Select-Object -Skip 1 | Where-Object { $_ -match "`tdevice$" })
if ($devices.Count -eq 0) {
    throw "No adb device connected."
}
if ($devices.Count -gt 1 -and $Serial -eq "") {
    Write-Host "Multiple devices connected. Using the first one."
    foreach ($line in $devices) {
        Write-Host "  $line"
    }
    $Serial = ($devices[0] -split "`t")[0]
    Write-Host "Serial: $Serial"
}

$package = Resolve-Package -Preferred $Package
$pidFilter = $null
if ($AppOnly) {
    $pidFilter = Resolve-AppPid -PackageName $package
    if ($null -eq $pidFilter) {
        throw "App is not running: $package. Launch it first or omit -AppOnly."
    }
}

Write-Host "package: $package"
Write-Host "tags: $($Tags -join ', ')"
if ($pidFilter) {
    Write-Host "pid: $pidFilter"
}
if ($Dump) {
    Write-Host "mode: dump (last $Lines lines)"
} else {
    Write-Host "mode: follow (Ctrl+C to stop)"
}
if ($Save -ne "") {
    Write-Host "save: $Save"
}

if ($Clear) {
    Invoke-Adb @("logcat", "-c") | Out-Null
    Write-Host "logcat buffer cleared."
}

$logcatArgs = @("logcat")
if ($Dump) {
    $logcatArgs += "-d"
    $logcatArgs += "-t"
    $logcatArgs += "$Lines"
}
if ($pidFilter) {
    $logcatArgs += "--pid=$pidFilter"
}
$logcatArgs += "-s"
$logcatArgs += $Tags

function Format-LogLine {
    param([string]$Line)
    if ($Line -match "page_load_metrics_update_dispatcher") {
        return $null
    }
    if ($Line -match '\[INFO:CONSOLE\(\d+\)\] "(.+)"') {
        return "JS: $($Matches[1])"
    }
    return $Line
}

if ($Save -ne "") {
    $saveDir = Split-Path -Parent $Save
    if ($saveDir -ne "" -and -not (Test-Path $saveDir)) {
        New-Item -ItemType Directory -Path $saveDir -Force | Out-Null
    }
    Invoke-Adb $logcatArgs | ForEach-Object { Format-LogLine $_ } | Where-Object { $_ } | Tee-Object -FilePath $Save
    exit $LASTEXITCODE
}

Invoke-Adb $logcatArgs | ForEach-Object { Format-LogLine $_ } | Where-Object { $_ }
exit $LASTEXITCODE
