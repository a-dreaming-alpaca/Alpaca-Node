$pidFile = Join-Path $PSScriptRoot 'collector.pid'
if (Test-Path -LiteralPath $pidFile) {
    $collectorPid = [int]([System.IO.File]::ReadAllText($pidFile))
    $process = Get-CimInstance Win32_Process -Filter "ProcessId=$collectorPid" -ErrorAction SilentlyContinue
    $expected = Join-Path $PSScriptRoot 'collector.ps1'
    if ($process -and $process.Name -eq 'powershell.exe' -and $process.CommandLine.Contains($expected)) { Stop-Process -Id $collectorPid -ErrorAction SilentlyContinue }
    Remove-Item -LiteralPath $pidFile
}
