$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
$projectRoot = $PSScriptRoot
$pythonPath = Join-Path $projectRoot 'backend/.venv/Scripts/python.exe'
$vitePath = Join-Path $projectRoot 'frontend/node_modules/vite/bin/vite.js'
$uiPort = 8443
if ($env:PORT -and (![int]::TryParse($env:PORT, [ref]$uiPort) -or $uiPort -lt 1 -or $uiPort -gt 65535)) {
    throw 'PORT에는 1~65535 사이의 포트 번호를 지정하세요.'
}

function Get-ServerListener([int]$Port) {
    return Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}

function Test-ThinkTreeApi {
    try {
        $health = Invoke-RestMethod 'http://127.0.0.1:8000/api/health' -TimeoutSec 2
        return $health.status -eq 'ok' -and $health.mode -eq 'local-development'
    } catch { return $false }
}

function Test-ThinkTreeUi([int]$Port) {
    try {
        $response = Invoke-WebRequest "http://127.0.0.1:$Port/" -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>ThinkTree CardSync</title>'
    } catch { return $false }
}

$uiListener = Get-ServerListener $uiPort
if ($uiListener -and !(Test-ThinkTreeUi $uiPort)) {
    throw "포트 $uiPort 을 다른 프로그램이 사용하고 있습니다. 해당 프로그램을 종료하거나 다른 PORT를 지정하세요. 기존 프로그램은 종료하지 않았습니다."
}
$apiReady = Test-ThinkTreeApi
if (!$apiReady -and (Get-ServerListener 8000)) {
    throw '포트 8000을 다른 프로그램이 사용하고 있거나 OCR 서버가 아직 준비 중입니다. 잠시 후 다시 실행하세요.'
}
if ($uiListener -and $apiReady) {
    Write-Host "ThinkTree가 이미 실행 중입니다: http://localhost:$uiPort"
    Write-Host '브라우저에서 위 주소로 접속하세요. 서버를 중복 실행하지 않았습니다.'
    return
}
if (!(Test-Path -LiteralPath $pythonPath) -or !(Test-Path -LiteralPath $vitePath)) {
    throw '먼저 README.md의 설치 절차를 완료하세요.'
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
$logDirectory = Join-Path $projectRoot 'backend/runtime/logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$apiProcess = $null
try {
    if (!$apiReady) {
        $apiProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory (Join-Path $projectRoot 'backend') -RedirectStandardOutput (Join-Path $logDirectory 'api.log') -RedirectStandardError (Join-Path $logDirectory 'api-error.log') -WindowStyle Hidden -PassThru
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if ($apiProcess.HasExited) { throw 'OCR 서버를 시작하지 못했습니다. backend/runtime/logs/api-error.log를 확인하세요.' }
            if (Test-ThinkTreeApi) { $apiReady = $true; break }
            Start-Sleep -Milliseconds 200
        }
        if (!$apiReady) { throw 'OCR 서버가 준비되지 않았습니다. backend/runtime/logs/api-error.log를 확인하세요.' }
    }
    Write-Host "ThinkTree: http://localhost:$uiPort / API: http://127.0.0.1:8000/docs"
    Write-Host '종료하려면 Ctrl+C를 누르세요. 기존에 실행 중이던 서버는 종료하지 않습니다.'
    if ($uiListener) {
        Write-Host '기존 화면 서버를 사용하며 OCR 서버만 시작했습니다. 이 터미널을 열어 두세요.'
        Wait-Process -Id $apiProcess.Id
    } else {
        Push-Location (Join-Path $projectRoot 'frontend')
        try {
            & $nodePath $vitePath --host 127.0.0.1 --port $uiPort
            if ($LASTEXITCODE -ne 0) { throw '화면 서버가 종료되었습니다. 위 오류 내용을 확인하세요.' }
        } finally { Pop-Location }
    }
} finally {
    if ($apiProcess -and !$apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue
    }
}
