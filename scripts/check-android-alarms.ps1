# Check Timetable reminder alarms on AlarmManager.
# See docs/android-release.md for usage context.
#
# Usage:
#   .\scripts\check-android-alarms.ps1
#   .\scripts\check-android-alarms.ps1 -Package com.tenta.timetable.debug
#   .\scripts\check-android-alarms.ps1 -Serial 33211JEHN21845

param(
    [string]$Package = "",
    [string]$Serial = ""
)

$ErrorActionPreference = "Stop"

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

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "== $Title =="
}

function Split-Lines {
    param([string]$Text)
    return $Text -split "`r?`n"
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

    foreach ($candidate in @("com.tenta.timetable", "com.tenta.timetable.debug")) {
        $installed = Invoke-Adb @("shell", "pm", "path", $candidate)
        if ($LASTEXITCODE -eq 0 -and ($installed -match "^package:")) {
            return $candidate
        }
    }

    throw "Timetable app not found. Install release or debug build first."
}

function Find-Line {
    param(
        [string[]]$Lines,
        [string]$Pattern
    )
    return $Lines | Where-Object { $_ -match $Pattern } | Select-Object -First 1
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
$alarmReceiver = "app.tauri.notification.TimedNotificationPublisher"
$alarmTagAlarm = "*alarm*:$package/$alarmReceiver"
$alarmTagWalarm = "*walarm*:$package/$alarmReceiver"

Write-Section "Target"
Write-Host "package: $package"
Write-Host "receiver: $alarmReceiver"
Write-Host "tags: $alarmTagAlarm, $alarmTagWalarm"

Write-Section "Permissions"
$packageDumpLines = @(Split-Lines (Invoke-Adb @("shell", "dumpsys", "package", $package) | Out-String))
$postLine = Find-Line -Lines $packageDumpLines -Pattern "POST_NOTIFICATIONS"
$exactLine = Find-Line -Lines $packageDumpLines -Pattern "SCHEDULE_EXACT_ALARM"
Write-Host $(if ($postLine) { $postLine.Trim() } else { "POST_NOTIFICATIONS: (not found)" })
Write-Host $(if ($exactLine) { $exactLine.Trim() } else { "SCHEDULE_EXACT_ALARM: (not found)" })

$postAppOps = (Invoke-Adb @("shell", "appops", "get", $package, "POST_NOTIFICATION") | Out-String).Trim()
$exactAppOps = (Invoke-Adb @("shell", "appops", "get", $package, "SCHEDULE_EXACT_ALARM") | Out-String).Trim()
Write-Host "appops POST_NOTIFICATION: $postAppOps"
Write-Host "appops SCHEDULE_EXACT_ALARM: $exactAppOps"

$postGrantedLine = Find-Line -Lines $packageDumpLines -Pattern "android\.permission\.POST_NOTIFICATIONS: granted="
$postGranted = $false
if ($postGrantedLine -match "granted=true") {
    $postGranted = $true
    Write-Host "runtime POST_NOTIFICATIONS: granted=true"
} elseif ($postGrantedLine -match "granted=false") {
    Write-Host "runtime POST_NOTIFICATIONS: granted=false"
} else {
    Write-Host "runtime POST_NOTIFICATIONS: (unknown)"
}

$postAppOpsOk = $postAppOps -match ": allow$|POST_NOTIFICATION: allow"
$notificationBlocked = (-not $postGranted) -or (-not $postAppOpsOk) -or ($postAppOps -match ": ignore$|POST_NOTIFICATION: ignore")

Write-Section "Notification settings"
$notificationDumpLines = @(Split-Lines (Invoke-Adb @("shell", "dumpsys", "notification") | Out-String))
$appSettings = Find-Line -Lines $notificationDumpLines -Pattern "AppSettings: $([regex]::Escape($package))"
$importanceNone = $false
if ($appSettings) {
    Write-Host $appSettings.Trim()
    if ($appSettings -match "importance=NONE") {
        $importanceNone = $true
        Write-Host "WARNING: app notification channel importance is NONE (OS blocks notifications)."
    }
} else {
    Write-Host "AppSettings: (not found)"
}

if ($notificationBlocked) {
    Write-Host "WARNING: notification permission is blocked. syncReminders skips scheduling."
    Write-Host "Fix: Settings > Apps > Timetable > Notifications ON, then reopen the app."
}

Write-Section "Registered alarms"
$alarmDumpText = (Invoke-Adb @("shell", "dumpsys", "alarm") | Out-String)
$pendingSection = $alarmDumpText
if ($alarmDumpText -match "App Alarm history:") {
    $pendingSection = ($alarmDumpText -split "App Alarm history:", 2)[0]
}

function Find-PendingAlarmBlocks {
    param([string]$SectionText)

    $blocks = New-Object System.Collections.Generic.List[string]
    $currentBlock = New-Object System.Collections.Generic.List[string]
    $blockHeaderPattern = "^\s+(RTC_WAKEUP|RTC|ELAPSED_WAKEUP|ELAPSED) #"

    foreach ($line in (Split-Lines $SectionText)) {
        if ($line -match $blockHeaderPattern) {
            if ($currentBlock.Count -gt 0) {
                $blockText = ($currentBlock -join [Environment]::NewLine)
                if ($blockText -match [regex]::Escape($alarmReceiver)) {
                    [void]$blocks.Add($blockText)
                }
            }
            $currentBlock = New-Object System.Collections.Generic.List[string]
            [void]$currentBlock.Add($line)
            continue
        }

        if ($currentBlock.Count -gt 0) {
            if ($line -match $blockHeaderPattern -or $line -match "^\s+Alarm history:|^  Pending alarms per uid:") {
                $blockText = ($currentBlock -join [Environment]::NewLine)
                if ($blockText -match [regex]::Escape($alarmReceiver)) {
                    [void]$blocks.Add($blockText)
                }
                $currentBlock = New-Object System.Collections.Generic.List[string]
                if ($line -match $blockHeaderPattern) {
                    [void]$currentBlock.Add($line)
                }
            } else {
                [void]$currentBlock.Add($line)
            }
        }
    }

    if ($currentBlock.Count -gt 0) {
        $blockText = ($currentBlock -join [Environment]::NewLine)
        if ($blockText -match [regex]::Escape($alarmReceiver)) {
            [void]$blocks.Add($blockText)
        }
    }

    return $blocks
}

$alarmBlocks = Find-PendingAlarmBlocks -SectionText $pendingSection

if ($alarmBlocks.Count -eq 0) {
    Write-Host "No pending TimedNotificationPublisher alarms found."
    Write-Host "Note: allowWhileIdle schedules use RTC_WAKEUP (*walarm*), not only RTC (*alarm*)."
    Write-Host "Open the app, grant notifications, save an event, then run this script again."
} else {
    Write-Host "Count: $($alarmBlocks.Count)"
    for ($i = 0; $i -lt $alarmBlocks.Count; $i++) {
        Write-Host ""
        Write-Host "-- alarm $($i + 1) --"
        Write-Host $alarmBlocks[$i]
    }
}

Write-Section "Power"
$batteryText = (Invoke-Adb @("shell", "dumpsys", "battery") | Out-String)
foreach ($key in @("AC powered", "USB powered", "Wireless powered", "status", "level")) {
    $line = ($batteryText -split "`r?`n" | Where-Object { $_ -match [regex]::Escape($key) } | Select-Object -First 1)
    if ($line) {
        Write-Host $line.Trim()
    }
}

$powerText = (Invoke-Adb @("shell", "dumpsys", "power") | Out-String)
foreach ($key in @("mDeviceIdleMode", "mLightDeviceIdleMode")) {
    $line = ($powerText -split "`r?`n" | Where-Object { $_ -match [regex]::Escape($key) } | Select-Object -First 1)
    if ($line) {
        Write-Host $line.Trim()
    }
}

Write-Section "Result"
if ($notificationBlocked -or $importanceNone) {
    Write-Host "NG: notifications are blocked (fix permission/settings first)."
    if ($alarmBlocks.Count -gt 0) {
        Write-Host "Note: some alarms exist, but delivery may still fail."
        exit 0
    }
    exit 1
}

if ($alarmBlocks.Count -gt 0) {
    Write-Host "OK: alarms are registered."
    exit 0
}

Write-Host "NG: no alarms registered."
Write-Host "If permissions are OK, rebuild release after proguard-rules.pro update and retry."
exit 1
