# NES Forge Agent Lab v0.3 — local, read-only ROM analysis.
param(
    [string]$Rom = "",
    [string]$ForgeRoot = "",
    [string]$Output = "",
    [switch]$NoAI,
    [switch]$Audio,
    [switch]$Capture
)
$ErrorActionPreference = 'Stop'
$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
function PickFile([string]$Title, [string]$Filter) {
    Add-Type -AssemblyName System.Windows.Forms
    $d = New-Object System.Windows.Forms.OpenFileDialog
    $d.Title = $Title
    $d.Filter = $Filter
    if ($d.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return '' }
    return $d.FileName
}
function PickDirectory([string]$Title) {
    Add-Type -AssemblyName System.Windows.Forms
    $d = New-Object System.Windows.Forms.FolderBrowserDialog
    $d.Description = $Title
    if ($d.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) { return '' }
    return $d.SelectedPath
}
if (-not $Rom) { $Rom = PickFile 'Select your own NES ROM — remains local' 'NES ROM (*.nes)|*.nes' }
if (-not $Rom) { Write-Host 'Canceled. No files changed.'; exit 0 }
if (-not $ForgeRoot) {
    $ForgeRoot = PickDirectory 'Select the NES_Forge folder from your NES Forge source folder containing NES_Forge.html, app/build-inputs.json, and QA harness'
}
if (-not $ForgeRoot) { Write-Host 'Canceled. No files changed.'; exit 0 }
if (-not $Output) { $Output = Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'NESForge-Agent-Lab' }
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Python 3.9+ required.' }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js 20+ required.' }
$params = @((Join-Path $scriptRoot 'forge_agent.py'), '--rom', $Rom, '--forge-root', $ForgeRoot, '--output', $Output)
if ($NoAI) { $params += '--no-ai' }
if ($Audio) { $params += '--audio' }
if ($Capture) { $params += '--capture' }
Write-Host 'Starting read-only extraction; no GitHub writes or ROM modifications.'
& python @params
$exit = $LASTEXITCODE
if ($exit -eq 0) {
    $dashboard = Join-Path $Output 'review\index.html'
    if (Test-Path -LiteralPath $dashboard) { Start-Process -FilePath $dashboard }
}
exit $exit
