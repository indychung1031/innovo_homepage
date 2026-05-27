# Phase 3 로컬 DB·통합 테스트 설정
# 사용: PowerShell에서 postgres 슈퍼유저 비밀번호 설정 후 실행
#   $env:POSTGRES_SUPER_PASSWORD="실제_postgres_비밀번호"
#   .\scripts\setup_phase3_local.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$pgBin = "C:\Program Files\PostgreSQL\17\bin"
if (-not (Test-Path "$pgBin\psql.exe")) {
    Write-Error "psql.exe를 찾을 수 없습니다. PostgreSQL 17 경로를 확인하세요."
}

$superPw = $env:POSTGRES_SUPER_PASSWORD
if (-not $superPw) {
    Write-Host "POSTGRES_SUPER_PASSWORD 환경변수가 필요합니다 (postgres 슈퍼유저 비밀번호)."
    Write-Host '예: $env:POSTGRES_SUPER_PASSWORD="abc123" ; .\scripts\setup_phase3_local.ps1'
    exit 1
}

if ($superPw -match "PostgreSQL 설치|your_postgres|비밀번호") {
    Write-Host "경고: 예시 문구를 그대로 넣은 것 같습니다."
    Write-Host "PostgreSQL 설치 시 postgres 계정에 설정한 '실제 비밀번호'를 입력하세요."
    Write-Host "(socket_user 비밀번호와 다를 수 있습니다.)"
    exit 1
}

$env:PGPASSWORD = $superPw
$pgHost = "127.0.0.1"
$pgPort = "5432"
$appPw = if ($env:INNOVO_DB_PASSWORD) { $env:INNOVO_DB_PASSWORD } else { "innovo_dev_2026" }

function Invoke-Psql {
    param(
        [Parameter(Mandatory = $true)][string]$Query,
        [string]$Database = "postgres"
    )
    $output = & "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d $Database -tAc $Query 2>&1
    if ($LASTEXITCODE -ne 0) {
        $text = ($output | Out-String).Trim()
        Write-Host ""
        Write-Host "psql 실행 실패:"
        Write-Host $text
        if ($text -match "password authentication failed|password 인증") {
            Write-Host ""
            Write-Host "postgres 슈퍼유저 비밀번호가 맞지 않습니다."
            Write-Host "- pgAdmin에서 User=postgres 로 로그인되는 비밀번호를 사용하세요."
            Write-Host "- socket_auto_design .env 의 POSTGRES_PASSWORD(socket_user)와 다릅니다."
        }
        exit 1
    }
    if ($null -eq $output) { return "" }
    return ($output | Out-String).Trim()
}

Write-Host "postgres 연결 확인..."
Invoke-Psql -Query "SELECT 1" | Out-Null
Write-Host "OK"

Write-Host "DB·사용자 생성 (innovo_homepage / innovo_user)..."
$dbExists = Invoke-Psql -Query "SELECT 1 FROM pg_database WHERE datname='innovo_homepage'"
if (-not $dbExists) {
    & "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE innovo_homepage;"
    if ($LASTEXITCODE -ne 0) { exit 1 }
}

$userExists = Invoke-Psql -Query "SELECT 1 FROM pg_roles WHERE rolname='innovo_user'"
if (-not $userExists) {
    & "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d postgres -v ON_ERROR_STOP=1 -c "CREATE USER innovo_user WITH PASSWORD '$appPw';"
} else {
    & "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d postgres -v ON_ERROR_STOP=1 -c "ALTER USER innovo_user WITH PASSWORD '$appPw';"
}
if ($LASTEXITCODE -ne 0) { exit 1 }

& "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d postgres -v ON_ERROR_STOP=1 -c "GRANT ALL PRIVILEGES ON DATABASE innovo_homepage TO innovo_user;"
& "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d innovo_homepage -v ON_ERROR_STOP=1 -c "GRANT ALL ON SCHEMA public TO innovo_user;"
& "$pgBin\psql.exe" -U postgres -h $pgHost -p $pgPort -d innovo_homepage -v ON_ERROR_STOP=1 -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO innovo_user;"
if ($LASTEXITCODE -ne 0) { exit 1 }

# .env 생성 또는 POSTGRES_PASSWORD·Phase3 변수 동기화
$envPath = Join-Path $Root ".env"
$examplePath = Join-Path $Root ".env.example"
if (-not (Test-Path $envPath)) {
    $envContent = Get-Content $examplePath -Raw
    Write-Host ".env 생성"
} else {
    $envContent = Get-Content $envPath -Raw
    Write-Host ".env 갱신"
}

$envContent = $envContent -replace "POSTGRES_HOST=.*", "POSTGRES_HOST=localhost"
$envContent = $envContent -replace "POSTGRES_PASSWORD=.*", "POSTGRES_PASSWORD=$appPw"
if ($envContent -notmatch "SECRET_KEY=.+") {
    $envContent = $envContent -replace "SECRET_KEY=.*", "SECRET_KEY=dev-secret-key-change-in-prod"
}
if ($envContent -notmatch "ADMIN_SECRET_KEY=") {
    $envContent += "`nADMIN_SECRET_KEY=dev-admin-secret-change-in-prod`n"
} else {
    $envContent = $envContent -replace "ADMIN_SECRET_KEY=.*", "ADMIN_SECRET_KEY=dev-admin-secret-change-in-prod"
}
if ($envContent -notmatch "JWT_ACCESS_EXPIRE_MINUTES=") {
    $envContent += "JWT_ACCESS_EXPIRE_MINUTES=60`nJWT_REFRESH_EXPIRE_DAYS=14`nAPP_BASE_URL=http://127.0.0.1:8000`n"
}
if ($envContent -notmatch "CONTACT_UPLOAD_MAX_BYTES=") {
    $envContent += "CONTACT_UPLOAD_MAX_BYTES=10485760`nCONTACT_UPLOAD_DIR=upload/contact`n"
}
if ($envContent -notmatch "ADMIN_SEED_PASSWORD=.+") {
    if ($envContent -notmatch "ADMIN_SEED_PASSWORD=") {
        $envContent += "ADMIN_SEED_EMAIL=sbchung@innovotech.co.kr`nADMIN_SEED_PASSWORD=AdminTest123!`nADMIN_SEED_DISPLAY_NAME=Sales Manager`nADMIN_SEED_ROLES=sales_admin`n"
    } else {
        $envContent = $envContent -replace "ADMIN_SEED_PASSWORD=.*", "ADMIN_SEED_PASSWORD=AdminTest123!"
    }
}
Set-Content -Path $envPath -Value $envContent -Encoding UTF8
Write-Host ".env 동기화 완료 (innovo_user 비밀번호: $appPw)"

Write-Host "Alembic 마이그레이션..."
python -m alembic upgrade head
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host ""
Write-Host "완료. 통합 테스트: python scripts/phase3_integration_test.py"
Write-Host "Admin seed: sbchung@innovotech.co.kr / AdminTest123! (ADMIN_SEED_PASSWORD)"
