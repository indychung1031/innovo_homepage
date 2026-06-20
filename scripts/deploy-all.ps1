# Innovo Homepage — 전체 배포 스크립트 (프론트엔드 + 백엔드)
# 사용법:
#   .\scripts\deploy-all.ps1              # 둘 다
#   .\scripts\deploy-all.ps1 -Frontend   # 프론트엔드만
#   .\scripts\deploy-all.ps1 -Backend    # 백엔드만
param(
    [switch]$Frontend,
    [switch]$Backend
)

$ErrorActionPreference = 'Stop'
$ScriptsDir  = $PSScriptRoot
$RepoRoot    = Split-Path $ScriptsDir -Parent

# 플래그가 모두 없으면 둘 다 실행
$runFrontend = $Frontend -or (-not $Frontend -and -not $Backend)
$runBackend  = $Backend  -or (-not $Frontend -and -not $Backend)

$start = Get-Date

if ($runFrontend) {
    Write-Host ''
    Write-Host '══════════════════════════════'
    Write-Host '  프론트엔드 배포 (S3 + CloudFront)'
    Write-Host '══════════════════════════════'
    & "$RepoRoot\frontend-react\scripts\deploy-s3.ps1"
}

if ($runBackend) {
    Write-Host ''
    Write-Host '══════════════════════════════'
    Write-Host '  백엔드 배포 (EC2)'
    Write-Host '══════════════════════════════'
    & "$ScriptsDir\deploy-backend.ps1"
}

$elapsed = (Get-Date) - $start
Write-Host ''
Write-Host "전체 배포 완료 ($([math]::Round($elapsed.TotalSeconds))초)"
