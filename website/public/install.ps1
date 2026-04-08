# TFLOPS Intelligence CLI Native Windows Installer
# Usage: iwr -useb https://tflops.world/install.ps1 | iex

$ErrorActionPreference = "Stop"

$BINARY_NAME = "tflops.exe"
$BASE_URL = "https://tflops.world/bin"
$REMOTE_FILE = "tflops-windows-x86_64.exe"
$DOWNLOAD_URL = "$BASE_URL/$REMOTE_FILE"
$INSTALL_DIR = (Get-Location).Path

Write-Host "--- TFLOPS Intelligence CLI Installer ---" -ForegroundColor Cyan

# Check Architecture
$arch = $env:PROCESSOR_ARCHITECTURE
if ($arch -ne "AMD64") {
    Write-Host "Error: Unsupported Architecture ($arch). Only x86_64 is supported on Windows currently." -ForegroundColor Red
    exit
}

Write-Host "Detecting Environment: Windows/x86_64" -ForegroundColor Green
Write-Host "Target Location:      $INSTALL_DIR" -ForegroundColor Green

Write-Host "`nDownloading TFLOPS Intelligence Engine..."
try {
    Invoke-RestMethod -Uri $DOWNLOAD_URL -OutFile "$INSTALL_DIR\$BINARY_NAME"
} catch {
    Write-Host "Error: Failed to download binary from $DOWNLOAD_URL" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Gray
    exit 1
}

Write-Host "`nSUCCESS: TFLOPS Audit CLI installed successfully!" -ForegroundColor Green
Write-Host "Run " -NoNewline; Write-Host "./$BINARY_NAME --help" -NoNewline -ForegroundColor Cyan; Write-Host " to begin your hardware forensic audit."
