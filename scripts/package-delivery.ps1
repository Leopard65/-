param(
  [switch]$BuildFrontend,
  [switch]$IncludeDist,
  [string]$OutputDir = "release",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = Resolve-Path (Join-Path $scriptDir "..")
$rootPath = $root.Path.TrimEnd("\")
$outputPath = Join-Path $rootPath $OutputDir
$stamp = Get-Date -Format "yyyyMMdd_HHmm"
$zipName = "stray-animal-rescue_$stamp.zip"
$zipPath = Join-Path $outputPath $zipName
$stagePath = Join-Path $outputPath "_stage_$stamp"

function Get-RelativePath([string]$fullPath) {
  return $fullPath.Substring($rootPath.Length).TrimStart("\").Replace("\", "/")
}

function Test-Excluded([string]$relativePath) {
  $p = $relativePath.Replace("\", "/")

  if ($p -match '(^|/)\.git(/|$)') { return $true }
  if ($p -match '(^|/)\.claude(/|$)') { return $true }
  if ($p -match '(^|/)node_modules(/|$)') { return $true }
  if ($p -match '(^|/)release(/|$)') { return $true }
  if ($p -match '(^|/)output(/|$)') { return $true }
  if ($p -match '(^|/)test-results(/|$)') { return $true }
  if ($p -match '(^|/)server/uploads(/|$)') { return $true }
  if ($p -eq 'server/.env') { return $true }
  if ($p -match '(^|/)\.env$') { return $true }
  if ($p -match '\.local$') { return $true }
  if ($p -match '(^|/)docs/ppt_assets(/|$)') { return $true }
  if ($p -match '(^|/)docs/ppt_build(/|$)') { return $true }
  if ($p -match '^docs/.*\.pptx$') { return $true }
  if (-not $IncludeDist -and $p -match '(^|/)client/dist(/|$)') { return $true }

  return $false
}

if ($BuildFrontend) {
  Push-Location (Join-Path $rootPath "client")
  try {
    npm run build
  } finally {
    Pop-Location
  }
  $IncludeDist = $true
}

if ($IncludeDist -and -not (Test-Path (Join-Path $rootPath "client/dist/index.html"))) {
  throw "client/dist/index.html was not found. Run npm run build in client, or run scripts/package-delivery.ps1 -BuildFrontend."
}

$files = Get-ChildItem -LiteralPath $rootPath -Force -Recurse -File |
  Where-Object { -not (Test-Excluded (Get-RelativePath $_.FullName)) }

if ($DryRun) {
  Write-Host "Project root: $rootPath"
  Write-Host "Output directory: $outputPath"
  Write-Host "Files to package: $($files.Count)"
  Write-Host "Include client/dist: $IncludeDist"
  Write-Host "Sample files:"
  $files | Select-Object -First 20 | ForEach-Object { Write-Host "  - $(Get-RelativePath $_.FullName)" }
  exit 0
}

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null

$resolvedOutput = Resolve-Path $outputPath
if (-not $resolvedOutput.Path.StartsWith($rootPath, [System.StringComparison]::OrdinalIgnoreCase)) {
  throw "Output directory must stay inside project root: $outputPath"
}

if (Test-Path $stagePath) {
  $resolvedStage = Resolve-Path $stagePath
  if (-not $resolvedStage.Path.StartsWith($resolvedOutput.Path, [System.StringComparison]::OrdinalIgnoreCase)) {
    throw "Unexpected staging path, stopped: $stagePath"
  }
  Remove-Item -LiteralPath $stagePath -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $stagePath | Out-Null

foreach ($file in $files) {
  $relative = Get-RelativePath $file.FullName
  $target = Join-Path $stagePath $relative
  $targetDir = Split-Path -Parent $target
  New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
  Copy-Item -LiteralPath $file.FullName -Destination $target -Force
}

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}
Compress-Archive -Path (Join-Path $stagePath "*") -DestinationPath $zipPath -Force
Remove-Item -LiteralPath $stagePath -Recurse -Force

Write-Host "Delivery package created: $zipPath"
Write-Host "Files: $($files.Count)"
Write-Host "Include client/dist: $IncludeDist"
