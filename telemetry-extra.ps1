# Additional telemetry. Loaded by collector.ps1 after bootTime has been read.
$script:cpuHistory = @()
$script:systemEvents = @()
$script:seenEventLogKeys = @{}
$script:eventLogsAvailable = $false
$script:lastExtraScan = [datetime]::MinValue
$script:physicalIds = @{}
$script:adapterStates = $null
$script:trafficStatePath = Join-Path $PSScriptRoot 'traffic-state.json'
$script:trafficLedger = @{}
$script:bootKey = $script:bootTime.ToUniversalTime().ToString('o')
try {
    $saved = Get-Content -LiteralPath $script:trafficStatePath -Raw | ConvertFrom-Json
    if ($saved.boot -eq $script:bootKey) {
        foreach ($entry in $saved.adapters) { $script:trafficLedger[$entry.id] = @{ rx = [double]$entry.rx; tx = [double]$entry.tx; carryRx = [double]$entry.carryRx; carryTx = [double]$entry.carryTx } }
    }
} catch { }
$script:lastTrafficSave = [datetime]::MinValue
$script:campusState = $null
$script:seenCampusLog = @{}
$script:campusRoot = Join-Path (Split-Path $PSScriptRoot -Parent) 'AutoConnect'
if (-not (Test-Path -LiteralPath (Join-Path $script:campusRoot 'autoconnect.py'))) {
    $script:campusRoot = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'ChatGPT\AutoConnect'
}
$script:campusScript = Join-Path $script:campusRoot 'autoconnect.py'
$script:campusLog = Join-Path $script:campusRoot 'autoconnect.log'
$script:campusHelper = Join-Path $PSScriptRoot 'campus-status.py'
$script:campusPython = $null
try {
    $statusCommand = Get-Content -LiteralPath (Join-Path $script:campusRoot 'status.cmd') -Raw -ErrorAction Stop
    $pythonMatch = [regex]::Match($statusCommand, '(?im)^\s*"([^"\r\n]+python\.exe)"')
    if ($pythonMatch.Success -and (Test-Path -LiteralPath $pythonMatch.Groups[1].Value) -and (Test-Path -LiteralPath $script:campusScript)) {
        $script:campusPython = $pythonMatch.Groups[1].Value
    }
} catch { }

function Add-ObservedEvent([string]$Key, [datetime]$When, [string]$Message, [string]$Source) {
    $whenUtc = $When.ToUniversalTime()
    foreach ($previous in $script:systemEvents) {
        if ($previous.key -eq $Key) { return }
        # NetworkProfile can log the same adapter transition a few seconds later.
        if ($previous.source -ne $Source -and $previous.message -eq $Message) {
            $previousTime = [datetimeoffset]::Parse($previous.timestamp).UtcDateTime
            if ([math]::Abs(($previousTime - $whenUtc).TotalSeconds) -le 20) { return }
        }
    }
    $script:systemEvents += @{ key=$Key; timestamp=$whenUtc.ToString('o'); message=$Message; source=$Source }
}

function Observe-AdapterStatuses([hashtable]$Current, [datetime]$When) {
    if ($null -ne $script:adapterStates) {
        foreach ($id in $Current.Keys) {
            if (-not $script:adapterStates.ContainsKey($id) -or $script:adapterStates[$id] -eq $Current[$id]) { continue }
            $message = if ($Current[$id]) { 'Network connected' } else { 'Network disconnected' }
            Add-ObservedEvent "adapter:${id}:$($When.Ticks)" $When $message 'Network adapter'
        }
    }
    $script:adapterStates = $Current
    $script:systemEvents = @($script:systemEvents | Sort-Object { $_.timestamp } -Descending | Select-Object -First 12)
}

function Update-AdapterEvents {
    if ($script:physicalIds.Count -eq 0) { return }
    $current = @{}
    foreach ($id in $script:physicalIds.Keys) { $current[$id] = $false }
    try {
        foreach ($adapter in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
            $id = $adapter.Id.Trim('{}').ToLowerInvariant()
            if ($current.ContainsKey($id)) { $current[$id] = ($adapter.OperationalStatus -eq 'Up') }
        }
    } catch { return }
    Observe-AdapterStatuses $current ([datetime]::UtcNow)
}

function Observe-CampusStatus([string]$Current, [datetime]$When) {
    if ($Current -ne 'online' -and $Current -ne 'offline') { return }
    if ($null -ne $script:campusState -and $Current -ne $script:campusState) {
        $message = if ($Current -eq 'online') { 'Campus network reconnected' } else { 'Campus network disconnected' }
        Add-ObservedEvent "campus-status:$($When.Ticks)" $When $message 'Campus portal'
    }
    $script:campusState = $Current
    $script:systemEvents = @($script:systemEvents | Sort-Object { $_.timestamp } -Descending | Select-Object -First 12)
}

function Update-CampusStatus {
    if (-not $script:campusPython) { return }
    $process = [System.Diagnostics.Process]::new()
    try {
        $process.StartInfo.FileName = $script:campusPython
        $process.StartInfo.Arguments = '-I "' + $script:campusHelper + '" "' + $script:campusScript + '"'
        $process.StartInfo.UseShellExecute = $false
        $process.StartInfo.CreateNoWindow = $true
        $process.StartInfo.RedirectStandardOutput = $true
        $process.StartInfo.RedirectStandardError = $true
        [void]$process.Start()
        if (-not $process.WaitForExit(2000)) { $process.Kill(); return }
        Observe-CampusStatus $process.StandardOutput.ReadToEnd().Trim() ([datetime]::UtcNow)
    } catch { } finally { $process.Dispose() }
}

function Update-CampusLogEvents {
    if (-not $script:campusPython -or -not (Test-Path -LiteralPath $script:campusLog)) { return }
    try {
        foreach ($line in (Get-Content -LiteralPath $script:campusLog -Tail 20 -ErrorAction Stop)) {
            if ($line -notmatch '^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3}) reconnected$') { continue }
            $stamp = $Matches[1]
            if ($script:seenCampusLog.ContainsKey($stamp)) { continue }
            $script:seenCampusLog[$stamp] = $true
            $when = [datetime]::ParseExact($stamp, 'yyyy-MM-dd HH:mm:ss,fff', [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::AssumeLocal)
            if (([datetime]::UtcNow - $when.ToUniversalTime()).TotalSeconds -ge 0 -and ([datetime]::UtcNow - $when.ToUniversalTime()).TotalSeconds -le 60) {
                Add-ObservedEvent "campus-log:$stamp" $when 'Campus network reconnected' 'AutoConnect log'
            }
        }
    } catch { }
    $script:systemEvents = @($script:systemEvents | Sort-Object { $_.timestamp } -Descending | Select-Object -First 12)
}

function Update-SystemEvents {
    if (([datetime]::UtcNow - $script:lastExtraScan).TotalSeconds -lt 15) { return }
    $script:lastExtraScan = [datetime]::UtcNow
    $queries = @(
        @{ LogName='System'; ProviderName='Microsoft-Windows-Kernel-General'; Id=12 },
        @{ LogName='System'; ProviderName='Microsoft-Windows-Power-Troubleshooter'; Id=1 },
        @{ LogName='System'; ProviderName='Microsoft-Windows-Kernel-Power'; Id=42 },
        @{ LogName='Microsoft-Windows-NetworkProfile/Operational'; Id=10000,10001 }
    )
    foreach ($query in $queries) {
        $query.StartTime = $script:bootTime.AddSeconds(-5)
        try {
            $entries = @(Get-WinEvent -FilterHashtable $query -MaxEvents 3 -ErrorAction Stop)
            $script:eventLogsAvailable = $true
            foreach ($entry in $entries) {
                $key = $entry.LogName + ':' + $entry.RecordId
                if ($script:seenEventLogKeys.ContainsKey($key)) { continue }
                $script:seenEventLogKeys[$key] = $true
                $message = switch ($entry.Id) { 12 {'Windows started'} 1 {'Resumed from sleep'} 42 {'Entered sleep'} 10000 {'Network connected'} 10001 {'Network disconnected'} }
                Add-ObservedEvent $key $entry.TimeCreated $message 'Windows Event Log'
            }
        } catch { if ($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*') { $script:eventLogsAvailable = $true } }
    }
    # Refresh physical adapter inventory without counting virtual/VPN traffic twice.
    try {
        $adapters = @(Get-NetAdapter -Physical -ErrorAction Stop)
        foreach ($adapter in $adapters) {
            $id = ([string]$adapter.InterfaceGuid).Trim('{}').ToLowerInvariant()
            $script:physicalIds[$id] = $true
        }
    } catch { }
    $script:systemEvents = @($script:systemEvents | Sort-Object { $_.timestamp } -Descending | Select-Object -First 12)
}

function Get-BootTraffic {
    $seen = 0
    foreach ($adapter in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
        $id = $adapter.Id.Trim('{}').ToLowerInvariant()
        if (-not $script:physicalIds.ContainsKey($id)) { continue }
        try {
            $stats = $adapter.GetIPStatistics(); $seen++
            $rx = [double]$stats.BytesReceived; $tx = [double]$stats.BytesSent
            if (-not $script:trafficLedger.ContainsKey($id)) { $script:trafficLedger[$id] = @{ rx=$rx; tx=$tx; carryRx=0.0; carryTx=0.0 } }
            $previous = $script:trafficLedger[$id]
            if ($rx -lt $previous.rx) { $previous.carryRx += $previous.rx }
            if ($tx -lt $previous.tx) { $previous.carryTx += $previous.tx }
            $previous.rx=$rx; $previous.tx=$tx
        } catch { }
    }
    $totalRx=0.0; $totalTx=0.0
    foreach ($entry in $script:trafficLedger.Values) { $totalRx += $entry.rx+$entry.carryRx; $totalTx += $entry.tx+$entry.carryTx }
    if (([datetime]::UtcNow-$script:lastTrafficSave).TotalSeconds -ge 15) {
        try {
            $entries = @($script:trafficLedger.Keys | ForEach-Object { $item=$script:trafficLedger[$_]; @{id=$_;rx=$item.rx;tx=$item.tx;carryRx=$item.carryRx;carryTx=$item.carryTx} })
            @{boot=$script:bootKey;adapters=$entries} | ConvertTo-Json -Depth 4 -Compress | Set-Content -LiteralPath $script:trafficStatePath -Encoding UTF8
            $script:lastTrafficSave=[datetime]::UtcNow
        } catch { }
    }
    return @{ available=($seen -gt 0); rx=$totalRx; tx=$totalTx; estimated=$true; scope='physical-adapter counters; resets before observation cannot be recovered' }
}
