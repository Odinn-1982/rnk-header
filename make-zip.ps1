$exclude = @(".git", ".gitignore", "make-zip.ps1", "*.zip", "*.jpg")
$moduleName = "rnk-header"
$version = "1.0.8"
$zipName = "$moduleName-$version.zip"

Get-ChildItem -Path . -Exclude $exclude | Compress-Archive -DestinationPath $zipName -Force

Write-Host "Created $zipName. Please upload this file to your GitHub Release."