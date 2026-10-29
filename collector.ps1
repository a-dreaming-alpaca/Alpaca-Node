param([int]$Port = 8765)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'wallpaper'
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
try { $listener.Start() } catch { Write-Error "Cannot open port $Port. Another collector may already be running."; exit 1 }
$script:sequence = 0
$script:cached = $null
$script:lastSample = [datetime]::MinValue
$script:lastNetwork = @{}
$script:lastNetworkTime = [datetime]::UtcNow
$script:bootTime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime
$script:hostname = [System.Net.Dns]::GetHostName()
. (Join-Path $PSScriptRoot 'telemetry-extra.ps1')

. (Join-Path $PSScriptRoot 'telemetry-gpu.ps1')

function Get-ProcessRankings([int]$LogicalProcessors) {
    try {
        $groups = @{}
        foreach ($row in (Get-CimInstance Win32_PerfFormattedData_PerfProc_Process -ErrorAction Stop)) {
            if ($row.IDProcess -eq 0 -or $row.Name -eq '_Total' -or $row.Name -eq 'Idle') { continue }
            $name = $row.Name -replace '#\d+$', ''
            if (-not $groups.ContainsKey($name)) { $groups[$name] = @{ name = $name; cpu = 0.0; memory = 0.0; io = 0.0; count = 0 } }
            $item = $groups[$name]
            $item.cpu += [double]$row.PercentProcessorTime / [math]::Max(1, $LogicalProcessors)
            $item.memory += [double]$row.WorkingSetPrivate
            $item.io += [double]$row.IOReadBytesPersec + [double]$row.IOWriteBytesPersec
            $item.count++
        }
        $items = @($groups.Values | ForEach-Object {
            $_.cpu = [math]::Round([math]::Min(100.0, [math]::Max(0.0, [double]$_.cpu)), 1)
            [pscustomobject]$_
        })
        return @{
            available = $true
            cpu = @($items | Sort-Object -Property @{Expression='cpu';Descending=$true},name | Select-Object -First 4)
            memory = @($items | Sort-Object -Property @{Expression='memory';Descending=$true},name | Select-Object -First 4)
            io = @($items | Sort-Object -Property @{Expression='io';Descending=$true},name | Select-Object -First 4)
        }
    } catch { return @{ available = $false; cpu = @(); memory = @(); io = @() } }
}

function Get-Telemetry {
    $now = [datetime]::UtcNow
    if ($script:cached -and ($now - $script:lastSample).TotalSeconds -lt 1.5) { return $script:cached }
    $processors = @(Get-CimInstance Win32_PerfFormattedData_PerfOS_Processor | Sort-Object { if ($_.Name -eq '_Total') { [int]::MaxValue } else { [int]$_.Name } })
    $totalCpu = $processors | Where-Object Name -eq '_Total'
    if ($null -eq $totalCpu) { throw 'CPU performance counters unavailable' }
    $cores = @($processors | Where-Object Name -ne '_Total' | ForEach-Object { [math]::Min(100, [math]::Max(0, [double]$_.PercentProcessorTime)) })
    $os = Get-CimInstance Win32_OperatingSystem
    $memoryTotal = [double]$os.TotalVisibleMemorySize * 1024
    $memoryUsed = $memoryTotal - [double]$os.FreePhysicalMemory * 1024
    $diskRead = $null; $diskWrite = $null
    try {
        $disk = Get-CimInstance Win32_PerfFormattedData_PerfDisk_PhysicalDisk -Filter "Name='_Total'" -ErrorAction Stop
        if ($disk) { $diskRead = [double]$disk.DiskReadBytesPersec; $diskWrite = [double]$disk.DiskWriteBytesPersec }
    } catch { }
    $networkNow = [datetime]::UtcNow
    $elapsed = [math]::Max(0.001, ($networkNow - $script:lastNetworkTime).TotalSeconds)
    $rx = 0.0; $tx = 0.0; $count = 0; $nextNetwork = @{}
    foreach ($adapter in [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces()) {
        if ($adapter.OperationalStatus -ne 'Up' -or $adapter.NetworkInterfaceType -eq 'Loopback' -or $adapter.NetworkInterfaceType -eq 'Tunnel') { continue }
        try {
            $stats = $adapter.GetIPStatistics(); $count++
            $nextNetwork[$adapter.Id] = @([double]$stats.BytesReceived, [double]$stats.BytesSent)
            if ($script:lastNetwork.ContainsKey($adapter.Id)) {
                $previous = $script:lastNetwork[$adapter.Id]
                $rx += [math]::Max(0, ([double]$stats.BytesReceived - $previous[0]) / $elapsed)
                $tx += [math]::Max(0, ([double]$stats.BytesSent - $previous[1]) / $elapsed)
            }
        } catch { }
    }
    $script:lastNetwork = $nextNetwork; $script:lastNetworkTime = $networkNow
    $gpu = Get-GpuTelemetry
    $rankings = Get-ProcessRankings $cores.Count
    Update-SystemEvents
    Update-AdapterEvents
    Update-CampusStatus
    Update-CampusLogEvents
    $traffic = Get-BootTraffic
    $volumes = @([System.IO.DriveInfo]::GetDrives() | Where-Object { $_.DriveType -eq 'Fixed' -and $_.IsReady } | ForEach-Object {
        try { @{ name=$_.Name.TrimEnd('\'); free=[double]$_.AvailableFreeSpace; total=[double]$_.TotalSize } } catch { }
    })
    $sampleTime = [datetime]::UtcNow
    $script:cpuHistory += @{ timestamp=$sampleTime.ToString('o'); value=[math]::Min(100.0,[double]$totalCpu.PercentProcessorTime) }
    $script:cpuHistory = @($script:cpuHistory | Where-Object { [datetime]$_.timestamp -ge $sampleTime.AddSeconds(-60) })
    $script:sequence++
    $script:cached = @{
        timestamp = [datetime]::UtcNow.ToString('o'); sequence = $script:sequence; hostname = $script:hostname
        cpu = [math]::Min(100, [math]::Max(0, [double]$totalCpu.PercentProcessorTime)); cores = $cores
        memory = @{ total = $memoryTotal; used = $memoryUsed; percent = [math]::Round($memoryUsed / $memoryTotal * 100, 1) }
        network = @{ rx = [math]::Round($rx, 1); tx = [math]::Round($tx, 1); interfaces = $count }
        disk = @{ read = $diskRead; write = $diskWrite }
        gpu = $gpu; processes = $rankings
        volumes = $volumes
        cpuHistory = $script:cpuHistory; bootTraffic = $traffic
        events = @{ available=$script:eventLogsAvailable; items=@($script:systemEvents | Select-Object -First 3) }
        uptime = [math]::Floor(((Get-Date) - $script:bootTime).TotalSeconds)
    } | ConvertTo-Json -Depth 5 -Compress
    $script:lastSample = [datetime]::UtcNow
    return $script:cached
}

$utf8 = [System.Text.UTF8Encoding]::new($false)
$files = @{ '/' = @('index.html', 'text/html; charset=utf-8'); '/index.html' = @('index.html', 'text/html; charset=utf-8'); '/style.css' = @('style.css', 'text/css; charset=utf-8'); '/app.js' = @('app.js', 'text/javascript; charset=utf-8') }
$files['/reports.js'] = @('reports.js', 'text/javascript; charset=utf-8')
$files['/memory.js'] = @('memory.js', 'text/javascript; charset=utf-8')
Write-Host "ALPACA NODE is listening at http://127.0.0.1:$Port (Ctrl+C to stop)."
try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $client.ReceiveTimeout = 2500; $client.SendTimeout = 2500
            $stream = $client.GetStream(); $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 1024, $true)
            $request = $reader.ReadLine()
            if (-not $request) { continue }
            $headerBytes = 0; $origin = $null
            while ($line = $reader.ReadLine()) {
                $headerBytes += $line.Length; if ($headerBytes -gt 16384) { throw 'Request headers too large' }
                if ($line -match '^Origin:\s*(.*)$') { $origin = $Matches[1].Trim() }
            }
            $parts = $request.Split(' '); $method = $parts[0]; $path = $parts[1].Split('?')[0]
            $status = '200 OK'; $mime = 'application/json; charset=utf-8'; $body = '{}'
            $allowedOrigins = @('null', 'file://', "http://127.0.0.1:$Port", "http://localhost:$Port")
            $corsOrigin = 'null'
            if ($origin -and $allowedOrigins -contains $origin) { $corsOrigin = $origin }
            if ($origin -and $allowedOrigins -notcontains $origin) { $status = '403 Forbidden'; $body = '{"error":"local wallpaper origins only"}' }
            elseif ($method -eq 'OPTIONS') { $status = '204 No Content'; $body = '' }
            elseif ($method -ne 'GET') { $status = '405 Method Not Allowed'; $body = '{"error":"GET only"}' }
            elseif ($path -eq '/metrics') {
                try { $body = Get-Telemetry } catch { $status = '503 Service Unavailable'; $body = '{"error":"Windows performance counters unavailable"}'; Write-Warning $_ }
            }
            elseif ($files.ContainsKey($path)) { $entry = $files[$path]; $mime = $entry[1]; $body = [System.IO.File]::ReadAllText((Join-Path $root $entry[0]), $utf8) }
            else { $status = '404 Not Found'; $body = '{"error":"not found"}' }
            $bytes = $utf8.GetBytes($body)
            $headers = "HTTP/1.1 $status`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: $corsOrigin`r`nVary: Origin`r`nAccess-Control-Allow-Methods: GET, OPTIONS`r`nAccess-Control-Allow-Private-Network: true`r`nCache-Control: no-store`r`nConnection: close`r`n`r`n"
            $headerData = [System.Text.Encoding]::ASCII.GetBytes($headers)
            $stream.Write($headerData, 0, $headerData.Length); $stream.Write($bytes, 0, $bytes.Length); $stream.Flush()
        } catch { Write-Verbose $_ } finally { $client.Dispose() }
    }
} finally { $listener.Stop() }
