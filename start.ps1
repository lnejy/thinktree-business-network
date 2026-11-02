$ErrorActionPreference = 'Stop'
$env:PYTHONIOENCODING = 'utf-8'
$projectRoot = $PSScriptRoot
$pythonPath = Join-Path $projectRoot 'backend/.venv/Scripts/python.exe'
$vitePath = Join-Path $projectRoot 'frontend/node_modules/vite/bin/vite.js'
if (!(Test-Path -LiteralPath $pythonPath) -or !(Test-Path -LiteralPath $vitePath)) {
    throw '먼저 README.md의 설치 절차를 완료하세요.'
}
$nodePath = (Get-Command node -ErrorAction Stop).Source
$logDirectory = Join-Path $projectRoot 'backend/runtime/logs'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
$apiProcess = $null
try {
    $alreadyRunning = $false
    try { $alreadyRunning = (Invoke-RestMethod 'http://127.0.0.1:8000/api/health' -TimeoutSec 1).mode -eq 'local-development' } catch { }
    if (!$alreadyRunning) {
        $apiProcess = Start-Process -FilePath $pythonPath -ArgumentList @('-m', 'uvicorn', 'api:app', '--host', '127.0.0.1', '--port', '8000') -WorkingDirectory (Join-Path $projectRoot 'backend') -RedirectStandardOutput (Join-Path $logDirectory 'api.log') -RedirectStandardError (Join-Path $logDirectory 'api-error.log') -WindowStyle Hidden -PassThru
        for ($attempt = 0; $attempt -lt 30; $attempt++) {
            if ($apiProcess.HasExited) { throw 'OCR 서버를 시작하지 못했습니다. backend/runtime/logs/api-error.log를 확인하세요.' }
            try { if ((Invoke-RestMethod 'http://127.0.0.1:8000/api/health' -TimeoutSec 1).status -eq 'ok') { break } } catch { }
            Start-Sleep -Milliseconds 200
        }
    }
    $uiPort = if ($env:PORT) { $env:PORT } else { '8443' }
    Write-Host "ThinkTree: http://localhost:$uiPort / API: http://127.0.0.1:8000/docs"
    Write-Host '종료하려면 Ctrl+C를 누르세요.'
    Push-Location (Join-Path $projectRoot 'frontend')
    try { & $nodePath $vitePath --host 127.0.0.1 } finally { Pop-Location }
} finally {
    if ($apiProcess -and !$apiProcess.HasExited) {
        Stop-Process -Id $apiProcess.Id -ErrorAction SilentlyContinue
    }
}
