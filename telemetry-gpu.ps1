# NVIDIA SMI is preferred when present. WDDM counters support AMD/Intel/NVIDIA
# without third-party monitoring software. All failures leave fields unknown.
$script:gpuAdapters = @()
$script:gpuInventoryTime = [datetime]::MinValue
$script:nvidia = Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue

function New-GpuSample {
    return @{ name='GPU'; utilization=$null; memoryUsed=$null; memoryTotal=$null;
        sharedUsed=$null; sharedTotal=$null; temperature=$null; power=$null; fan=$null;
        source='unavailable' }
}

function Get-WindowsGpuTelemetry {
    $result = New-GpuSample
    try {
        if (([datetime]::UtcNow - $script:gpuInventoryTime).TotalSeconds -ge 60) {
            if (-not ('Alpaca.GpuInventory' -as [type])) {
                Add-Type -Path (Join-Path $PSScriptRoot 'gpu-adapters.cs') -ErrorAction Stop
            }
            $script:gpuAdapters = @([Alpaca.GpuInventory]::Read())
            $script:gpuInventoryTime = [datetime]::UtcNow
        }
        $adapter = $script:gpuAdapters | Select-Object -First 1
        if (-not $adapter) { return $result }
        $result.name = $adapter.Name
        $result.source = 'Windows WDDM / busiest engine / ' + $adapter.CounterKey
        $result.memoryTotal = [double]$adapter.DedicatedBytes
        $result.sharedTotal = [double]$adapter.SharedLimitBytes
        try {
            $rows = @(Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUEngine -ErrorAction Stop)
            $result.utilization = Get-GpuEngineUtilization $rows $adapter.CounterKey
        } catch { }
        try {
            $memory = Get-CimInstance Win32_PerfFormattedData_GPUPerformanceCounters_GPUAdapterMemory -ErrorAction Stop |
                Where-Object { $_.Name -eq $adapter.CounterKey } | Select-Object -First 1
            if ($memory) {
                if ($null -ne $memory.DedicatedUsage) { $result.memoryUsed = [double]$memory.DedicatedUsage }
                if ($null -ne $memory.SharedUsage) { $result.sharedUsed = [double]$memory.SharedUsage }
            }
        } catch { }
    } catch { }
    return $result
}

function Get-GpuEngineUtilization($Rows, [string]$CounterKey) {
    # Sum processes on the SAME physical engine, then take the busiest engine.
    # Adding 3D + Copy + Video would overcount parallel work; mixing LUIDs would
    # accidentally include remote adapters or another GPU.
    $engines = @{}
    $pattern = '^pid_\d+_' + [regex]::Escape($CounterKey) + '_eng_(\d+)_engtype_'
    foreach ($row in $Rows) {
        if ($row.Name -notmatch $pattern -or $null -eq $row.UtilizationPercentage) { continue }
        $engine = $Matches[1]
        if (-not $engines.ContainsKey($engine)) { $engines[$engine] = 0.0 }
        $engines[$engine] += [math]::Max(0, [double]$row.UtilizationPercentage)
    }
    if ($engines.Count -eq 0) { return $null }
    return [math]::Round([math]::Min(100, ($engines.Values | Measure-Object -Maximum).Maximum), 1)
}

function Get-NvidiaGpuTelemetry {
    $result = New-GpuSample
    if (-not $script:nvidia) { return $result }
    $proc = [System.Diagnostics.Process]::new()
    try {
        $proc.StartInfo.FileName = $script:nvidia.Source
        $proc.StartInfo.Arguments = '--query-gpu=index,name,utilization.gpu,memory.used,memory.total,temperature.gpu,power.draw,fan.speed --format=csv,noheader,nounits'
        $proc.StartInfo.UseShellExecute = $false
        $proc.StartInfo.CreateNoWindow = $true
        $proc.StartInfo.RedirectStandardOutput = $true
        $proc.StartInfo.RedirectStandardError = $true
        [void]$proc.Start()
        $outputTask = $proc.StandardOutput.ReadToEndAsync()
        $errorTask = $proc.StandardError.ReadToEndAsync()
        if (-not $proc.WaitForExit(1800)) { $proc.Kill(); return $result }
        if ($proc.ExitCode -ne 0) { return $result }
        $line = ($outputTask.Result -split "`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
        if (-not $line) { return $result }
        $fields = @($line.Split(',') | ForEach-Object { $_.Trim() })
        if ($fields.Count -lt 8) { return $result }
        $result.name = $fields[1]; $result.source = 'NVIDIA SMI / GPU ' + $fields[0]
        $keys = @('utilization','memoryUsed','memoryTotal','temperature','power','fan')
        for ($i=0; $i -lt $keys.Count; $i++) {
            $value = 0.0
            if ([double]::TryParse($fields[$i+2], [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$value) -and $value -ge 0) {
                if ($i -eq 1 -or $i -eq 2) { $value *= 1048576 }
                $result[$keys[$i]] = $value
            }
        }
    } catch { } finally { $proc.Dispose() }
    return $result
}

function Get-GpuTelemetry {
    $nvidia = Get-NvidiaGpuTelemetry
    if ($null -ne $nvidia.utilization) { return $nvidia }
    $windows = Get-WindowsGpuTelemetry
    if ($windows.source -ne 'unavailable') { return $windows }
    return $nvidia
}
