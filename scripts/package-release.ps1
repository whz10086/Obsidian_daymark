$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$manifestPath = Join-Path $projectPath 'manifest.json'
$pluginManifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
if ($pluginManifest.id -notmatch '^[a-z0-9-]+$' -or $pluginManifest.version -notmatch '^\d+\.\d+\.\d+$') {
  throw 'Invalid release ID or version.'
}
$releasePath = Join-Path $projectPath 'release'
$pluginPath = Join-Path $releasePath $pluginManifest.id
New-Item -ItemType Directory -Path $pluginPath -Force | Out-Null
foreach ($name in @('main.js', 'manifest.json', 'styles.css')) {
  Copy-Item -LiteralPath (Join-Path $projectPath $name) -Destination (Join-Path $pluginPath $name) -Force
}
$installZip = Join-Path $projectPath "$($pluginManifest.id)-$($pluginManifest.version).zip"
Compress-Archive -LiteralPath $pluginPath -DestinationPath $installZip -Force
$sourceItems = @(
  'src', 'tests', 'package.json', 'package-lock.json', 'tsconfig.json',
  'vitest.config.ts', 'esbuild.config.mjs', 'manifest.json', 'versions.json',
  'styles.css', 'README.md', 'CHANGELOG.md', 'LICENSE', '.gitignore'
) | ForEach-Object { Join-Path $projectPath $_ }
$sourceZip = Join-Path $projectPath "$($pluginManifest.id)-source-$($pluginManifest.version).zip"
Compress-Archive -LiteralPath $sourceItems -DestinationPath $sourceZip -Force
Get-Item -LiteralPath $installZip, $sourceZip | Select-Object FullName, Length
