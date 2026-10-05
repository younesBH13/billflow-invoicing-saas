$zipName = "billflow_omv_deployment.zip"
$tempDbDir = "temp_db_export"
$dbSource = "billflow-backend/data/billflow.sqlite"
$dbDest = "$tempDbDir/billflow.sqlite"

Write-Host "Creating deployment package: $zipName..." -ForegroundColor Cyan

# 1. Handle old files
if (Test-Path $zipName) { Remove-Item $zipName -Force }
if (Test-Path $tempDbDir) { Remove-Item $tempDbDir -Recurse -Force }
New-Item -ItemType Directory -Path $tempDbDir | Out-Null

# 2. Try to copy the database (to avoid lock issues during zipping)
try {
    Copy-Item -Path $dbSource -Destination $dbDest -ErrorAction Stop
    Write-Host "Database copied for package." -ForegroundColor Gray
} catch {
    Write-Host "Warning: Could not copy database. It might still be locked. Please ensure all BillFlow processes are closed." -ForegroundColor Red
}

# 3. Get files to zip
$filesToZip = Get-ChildItem -Path . -Recurse | Where-Object {
    $_.FullName -notmatch "node_modules" -and 
    $_.FullName -notmatch "\.git" -and 
    $_.FullName -notmatch "dist" -and 
    $_.FullName -notmatch "billflow-backend/data" -and # Exclude original data folder so we use the temp one
    $_.Name -ne $zipName -and
    $_.Name -ne "package-for-omv.ps1" -and
    $_.FullName -notmatch "temp_db_export"
}

# Add the temp database to the list of items to zip
$zipItems = $filesToZip.FullName + (Get-Item $dbDest).FullName

# 4. Use Compress-Archive
Compress-Archive -Path $zipItems -DestinationPath $zipName -Force

# 5. Clean up temp folder
Remove-Item $tempDbDir -Recurse -Force

Write-Host "Success! Package created: $zipName" -ForegroundColor Green
Write-Host "Note: Your local database (billflow.sqlite) IS included in the root of the zip." -ForegroundColor Yellow
Write-Host "Please move it to 'billflow-backend/data/billflow.sqlite' on the OMV server." -ForegroundColor Cyan
