$ErrorActionPreference = 'Stop'
. (Join-Path (Split-Path $PSScriptRoot -Parent) 'telemetry-gpu.ps1')
function Assert-Equal($Actual, $Expected, $Label) {
    if ($Actual -ne $Expected) { throw "$Label : expected $Expected, received $Actual" }
}
$key = 'luid_0x00000000_0x00013E77_phys_0'
$rows = @(
    @{Name="pid_1_${key}_eng_0_engtype_3D";UtilizationPercentage=24},
    @{Name="pid_2_${key}_eng_0_engtype_3D";UtilizationPercentage=36},
    @{Name="pid_1_${key}_eng_1_engtype_Copy";UtilizationPercentage=45},
    @{Name='pid_1_luid_0x00000000_0x00099999_phys_0_eng_0_engtype_3D';UtilizationPercentage=99},
    @{Name='pid_1_luid_0x00000000_0x00013E77_phys_1_eng_0_engtype_3D';UtilizationPercentage=99}
)
Assert-Equal (Get-GpuEngineUtilization $rows $key) 60 'Aggregate per engine and exclude other adapters'
Assert-Equal (Get-GpuEngineUtilization @() $key) $null 'Missing counters remain unknown'
Assert-Equal (Get-GpuEngineUtilization @(@{Name="pid_1_${key}_eng_0_engtype_3D";UtilizationPercentage=0}) $key) 0 'Real idle remains zero'
Assert-Equal (Get-GpuEngineUtilization @(@{Name="pid_1_${key}_eng_0_engtype_3D";UtilizationPercentage=$null}) $key) $null 'Null is not idle'
Assert-Equal (Get-GpuEngineUtilization @(@{Name="pid_1_${key}_eng_0_engtype_3D";UtilizationPercentage=125}) $key) 100 'Clamp counter overshoot'

# Verify routing without requiring NVIDIA hardware on the test machine.
function Get-NvidiaGpuTelemetry { return @{source='NVIDIA SMI';utilization=0} }
function Get-WindowsGpuTelemetry { return @{source='Windows WDDM';utilization=42} }
Assert-Equal (Get-GpuTelemetry).source 'NVIDIA SMI' 'NVIDIA idle sample is valid'
function Get-NvidiaGpuTelemetry { return @{source='unavailable';utilization=$null} }
Assert-Equal (Get-GpuTelemetry).source 'Windows WDDM' 'Fallback without NVIDIA'
function Get-WindowsGpuTelemetry { return @{source='unavailable';utilization=$null} }
Assert-Equal (Get-GpuTelemetry).utilization $null 'No supported driver stays unknown'
Write-Output 'PASS: GPU aggregation, adapter isolation, missing/idle values, clamping and fallback (8 checks).'
