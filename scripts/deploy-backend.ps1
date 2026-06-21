# Innovo Homepage — EC2 백엔드 배포 스크립트
# 흐름: 로컬 backend/ + database/versions/ → S3 스테이징 → EC2(SSM) 동기화 → alembic upgrade → 서비스 재시작
param(
    [string]$InstanceId   = 'i-0709c24299d92c883',
    [string]$Bucket       = 'innovo-www-prod',
    [string]$StagingKey   = 'deploy',
    [string]$AppDir       = '/home/ec2-user/innovo_homepage'
)

$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent

# PowerShell 5.1 출력 인코딩 (한글 깨짐 방지)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ── 1. S3에 파일 업로드 ────────────────────────────────────────────────────────
Write-Host '[1/4] S3 스테이징에 백엔드 파일 업로드...'

aws s3 sync "$RepoRoot\backend" "s3://$Bucket/$StagingKey/backend/" `
    --exclude '__pycache__/*' --exclude '*.pyc'

aws s3 sync "$RepoRoot\database\versions" "s3://$Bucket/$StagingKey/database/versions/" `
    --exclude '__pycache__/*' --exclude '*.pyc'

# ── 2. EC2에서 실행할 배포 셸 스크립트 업로드 ────────────────────────────────
Write-Host '[2/4] 배포 스크립트 업로드...'

$deployScript = @"
#!/bin/bash
set -e
APP_DIR=$AppDir
BUCKET=$Bucket
STAGING=$StagingKey

cd `$APP_DIR

echo '[EC2 1/4] S3 -> EC2 파일 동기화...'
aws s3 sync s3://`$BUCKET/`$STAGING/backend/ backend/ --exclude '__pycache__/*' --exclude '*.pyc'
aws s3 sync s3://`$BUCKET/`$STAGING/database/versions/ database/versions/ --exclude '__pycache__/*' --exclude '*.pyc'

echo '[EC2 2/4] __pycache__ 초기화...'
find backend -type d -name '__pycache__' -exec rm -rf {} + 2>/dev/null || true

echo '[EC2 3/4] Alembic 마이그레이션...'
source venv/bin/activate
alembic upgrade head

echo '[EC2 4/4] 서비스 재시작...'
systemctl restart innovo-homepage-api
systemctl is-active innovo-homepage-api

for i in 1 2 3 4 5 6 7 8 9 10; do
    code=`$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8001/health || echo 000)
    if [ "`$code" = "200" ]; then
        echo "Health: `$code"
        break
    fi
    sleep 1
done
if [ "`$code" != "200" ]; then
    echo "Health check failed: `$code"
    exit 1
fi

echo 'EC2 배포 완료!'
"@

$tmpFile = [System.IO.Path]::GetTempFileName()
[System.IO.File]::WriteAllText($tmpFile, $deployScript, (New-Object System.Text.UTF8Encoding $false))
aws s3 cp $tmpFile "s3://$Bucket/$StagingKey/deploy.sh" --content-type 'text/plain'
Remove-Item $tmpFile

# ── 3. SSM으로 EC2에 배포 명령 전송 ──────────────────────────────────────────
Write-Host '[3/4] EC2에 배포 명령 전송...'

$cmd = "aws s3 cp s3://$Bucket/$StagingKey/deploy.sh /tmp/innovo_deploy.sh && chmod +x /tmp/innovo_deploy.sh && /tmp/innovo_deploy.sh"
$commandId = aws ssm send-command `
    --instance-ids $InstanceId `
    --document-name 'AWS-RunShellScript' `
    --parameters "commands=[`"$cmd`"]" `
    --comment '백엔드 자동 배포' `
    --output text `
    --query 'Command.CommandId'

Write-Host "  명령 ID: $commandId"

# ── 4. 완료 대기 ──────────────────────────────────────────────────────────────
Write-Host '[4/4] 완료 대기 중...'
$elapsed = 0
do {
    Start-Sleep -Seconds 5
    $elapsed += 5
    $status = aws ssm get-command-invocation `
        --command-id $commandId `
        --instance-id $InstanceId `
        --query 'Status' `
        --output text 2>$null
    if ($elapsed % 15 -eq 0) { Write-Host "  ... ${elapsed}초 경과 (상태: $status)" }
} while ($status -notmatch '^(Success|Failed|Cancelled|TimedOut)$')

# ── 결과 출력 ─────────────────────────────────────────────────────────────────
$stdout = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $InstanceId `
    --query 'StandardOutputContent' `
    --output text 2>$null

$stderr = aws ssm get-command-invocation `
    --command-id $commandId `
    --instance-id $InstanceId `
    --query 'StandardErrorContent' `
    --output text 2>$null

Write-Host ''
Write-Host '===== EC2 배포 결과 ====='
Write-Host "상태: $status"
if ($stdout) { Write-Host $stdout }
if ($stderr -and $stderr -ne 'None') { Write-Host "STDERR: $stderr" }

# ── S3 스테이징 정리 ──────────────────────────────────────────────────────────
Write-Host ''
Write-Host '>> S3 스테이징 정리...'
aws s3 rm "s3://$Bucket/$StagingKey/" --recursive

if ($status -eq 'Success') {
    Write-Host 'Done. 백엔드 배포 완료!'
} else {
    Write-Host '배포 실패! 위 로그를 확인하세요.'
    exit 1
}
