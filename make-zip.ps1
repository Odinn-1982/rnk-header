$exclude = @(".git", ".gitignore", "make-zip.ps1", "*.zip", "*.jpg")
$moduleName = "rnk-header"
$version = "1.0.27"
$zipName = "$moduleName-$version.zip"

# Create temp folder structure that Foundry expects
$tempDir = "$env:TEMP\$moduleName"
if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Copy files to temp folder (excluding unwanted files)
Get-ChildItem -Path . -Exclude $exclude | Copy-Item -Destination $tempDir -Recurse

# Remove existing zip if present
if (Test-Path $zipName) { Remove-Item $zipName -Force }

# Create zip with proper folder structure
Compress-Archive -Path $tempDir -DestinationPath $zipName -Force

# Cleanup temp folder
Remove-Item $tempDir -Recurse -Force

Write-Host "Created $zipName with proper folder structure. Please upload this file to your GitHub Release."