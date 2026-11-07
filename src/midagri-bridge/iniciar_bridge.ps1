# ============================================================
#  AgroSmart — Inicio rápido del Bridge + Túnel ngrok
#  Uso: .\iniciar_bridge.ps1 -Token "TU_TOKEN"
# ============================================================
param(
    [Parameter(Mandatory=$true)]
    [string]$Token,

    [int]$Puerto = 8080,

    [string]$NgrokPath = ""   # Si ngrok está en PATH, déjalo vacío
)

$ErrorActionPreference = "Stop"

# --- Ruta del bridge -----------------------------------------------------------
$ScriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$BridgeScript = Join-Path $ScriptDir "midagri_bridge.py"

if (-not (Test-Path $BridgeScript)) {
    Write-Error "No se encontró midagri_bridge.py en $ScriptDir"
    exit 1
}

# --- Lanzar el bridge en una ventana nueva ------------------------------------
Write-Host "`n[1/2] Iniciando Bridge MIDAGRI en http://localhost:$Puerto ..." -ForegroundColor Cyan

$env:BRIDGE_TOKEN = $Token

Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "`$env:BRIDGE_TOKEN='$Token'; py '$BridgeScript'"

Start-Sleep -Seconds 3

# --- Verificar que el bridge responde -----------------------------------------
try {
    $health = Invoke-RestMethod "http://localhost:$Puerto/health" -TimeoutSec 5
    Write-Host "   Bridge activo: $($health.estado)" -ForegroundColor Green
} catch {
    Write-Warning "El bridge no respondió aún. Verifica la ventana que se abrió."
}

# --- Lanzar ngrok en otra ventana nueva ---------------------------------------
Write-Host "`n[2/2] Iniciando túnel ngrok para el puerto $Puerto ..." -ForegroundColor Cyan

$ngrokCmd = if ($NgrokPath) { $NgrokPath } else { "ngrok" }

Start-Process powershell -ArgumentList `
    "-NoExit", `
    "-Command", `
    "& '$ngrokCmd' http $Puerto"

Write-Host @"

============================================================
  Bridge + túnel iniciados en ventanas separadas.

  Una vez que ngrok muestre la URL pública, cópiala y
  pégala como BRIDGE_URL en tus workflows de n8n.

  Health check local:
    Invoke-RestMethod "http://localhost:$Puerto/health"
============================================================
"@ -ForegroundColor Yellow

