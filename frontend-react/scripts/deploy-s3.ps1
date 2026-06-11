# Innovo React — S3 업로드 (CloudFront invalidation은 DISTRIBUTION_ID 필요)
param(
    [string]$Bucket = 'innovo-www-prod',
    [string]$DistributionId = $(if ($env:CLOUDFRONT_DISTRIBUTION_ID) { $env:CLOUDFRONT_DISTRIBUTION_ID } else { 'EAD1YVAYMLDS7' })
)

$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$RepoRoot = Split-Path $Root -Parent
Set-Location $Root

Write-Host '>> npm run build'
npm run build

Write-Host ">> s3 sync dist/ -> s3://$Bucket (upload/ 제외)"
# --delete는 dist에 없는 upload/까지 지우므로 사용하지 않음
aws s3 sync dist/ "s3://$Bucket/" --exclude 'index.html' --exclude 'upload/*'
aws s3 cp dist/index.html "s3://$Bucket/index.html" `
    --cache-control 'no-cache,no-store,must-revalidate' `
    --content-type 'text/html'

# 홈페이지 이미지·PDF — CloudFront 동일 오리진 /upload (ppt·ai 제외)
$UploadSrc = Join-Path $RepoRoot 'upload'
if (Test-Path $UploadSrc) {
    Write-Host ">> s3 sync upload/ -> s3://$Bucket/upload/"
    aws s3 sync $UploadSrc "s3://$Bucket/upload/" `
        --exclude '*.ppt' --exclude '*.PPT' --exclude '*.ai'
}

if ($DistributionId) {
    Write-Host ">> CloudFront invalidation $DistributionId"
    aws cloudfront create-invalidation --distribution-id $DistributionId --paths '/*'
} else {
    Write-Host '>> CLOUDFRONT_DISTRIBUTION_ID 미설정 — invalidation 생략'
}

Write-Host 'Done.'
Write-Host "  CloudFront: https://dusftiakt754y.cloudfront.net  (Distribution: $DistributionId)"
Write-Host "  S3 website (legacy): http://$Bucket.s3-website.ap-northeast-2.amazonaws.com/"
