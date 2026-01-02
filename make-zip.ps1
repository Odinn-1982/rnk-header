$exclude = @(".git", ".gitignore", "make-zip.ps1", "*.zip", "*.jpg")
$moduleName = "rnk-header"
$version = "1.0.7"
$zipName = "$moduleName-$version.zip"

Get-ChildItem -Path . -Exclude $exclude | Compress-Archive -DestinationPath $zipName -Force

Write-Host "Created $zipName. Please upload this file to your GitHub Release."