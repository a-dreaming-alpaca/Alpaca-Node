$ErrorActionPreference = 'Stop'
$script:bootTime = [datetime]::UtcNow
. (Join-Path $PSScriptRoot 'telemetry-extra.ps1')

function Assert-Equal($Actual, $Expected, $Message) {
    if ($Actual -ne $Expected) { throw "$Message (expected $Expected, got $Actual)" }
}

$at = [datetime]::UtcNow
Observe-CampusStatus 'online' $at
Assert-Equal $script:systemEvents.Count 0 'Initial portal status must only establish a baseline'
Observe-CampusStatus 'offline' $at.AddSeconds(2)
Observe-CampusStatus 'online' $at.AddSeconds(7)
Assert-Equal $script:systemEvents.Count 2 'A five-second campus logout must produce loss and recovery events'
Assert-Equal $script:systemEvents[0].message 'Campus network reconnected' 'Recovery event should be newest'
Assert-Equal $script:systemEvents[1].message 'Campus network disconnected' 'Loss event should be preserved'
Add-ObservedEvent 'campus-log:test' $at.AddSeconds(8) 'Campus network reconnected' 'AutoConnect log'
Assert-Equal $script:systemEvents.Count 2 'AutoConnect log must not duplicate a portal recovery event'

$script:systemEvents = @()
$script:adapterStates = $null
Observe-AdapterStatuses @{ wired = $true } $at
Observe-AdapterStatuses @{ wired = $false } $at.AddSeconds(2)
Observe-AdapterStatuses @{ wired = $true } $at.AddSeconds(7)
Assert-Equal $script:systemEvents.Count 2 'A five-second physical adapter drop must produce two events'
Write-Host 'PASS: short campus and adapter outages, startup baseline, duplicate recovery suppression.'
