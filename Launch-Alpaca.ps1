$ErrorActionPreference = 'Stop'
$endpoint = 'http://127.0.0.1:8765/metrics'
$existing = $null
try {
    $existing = Invoke-RestMethod $endpoint -TimeoutSec 10
} catch { }
if ($existing) {
    if ($null -ne $existing.cpu -and $null -ne $existing.memory) { Write-Host 'ALPACA collector is already running.'; exit 0 }
    throw 'Port 8765 is occupied by another application.'
}
$collector = Join-Path $PSScriptRoot 'collector.ps1'
$arguments = '-NoProfile -ExecutionPolicy Bypass -File "' + $collector + '"'
$process = Start-Process powershell.exe -ArgumentList $arguments -WindowStyle Hidden -PassThru -RedirectStandardError (Join-Path $PSScriptRoot 'collector-error.log') -RedirectStandardOutput (Join-Path $PSScriptRoot 'collector-output.log')
for ($attempt = 0; $attempt -lt 6; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($process.HasExited) { throw 'Collector could not start. See collector-error.log in this folder.' }
    try {
        $data = Invoke-RestMethod $endpoint -TimeoutSec 12
        if ($null -ne $data.cpu) {
            [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot 'collector.pid'), [string]$process.Id)
            Write-Host 'ALPACA collector is ready. Preview: http://127.0.0.1:8765'
            exit 0
        }
    } catch { }
}
throw 'Collector has not returned data. See collector-error.log for details.'
