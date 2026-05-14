param(
    [string]$ApiBase = "http://localhost:8080/api",
    [string]$UploadedBy = "admin"
)

$endpoint  = "$ApiBase/recursos-descargables"
$assetsDir = Join-Path $PSScriptRoot "..\src\assets\documents"
$indexFile = Join-Path $assetsDir "index.json"

if (-not (Test-Path $indexFile)) {
    Write-Host "No se encontro index.json en $assetsDir" -ForegroundColor Red
    exit 1
}

$index = Get-Content $indexFile -Raw -Encoding UTF8 | ConvertFrom-Json

try {
    $existing = Invoke-RestMethod -Uri $endpoint -Method GET -ErrorAction Stop
    Write-Host "Backend disponible. Ya hay $($existing.Count) recurso(s) registrados." -ForegroundColor Cyan
} catch {
    Write-Host "Backend no disponible en $endpoint" -ForegroundColor Red
    exit 1
}

$categoryMap = @{
    "pdf"  = "PDF"
    "doc"  = "Word"
    "docx" = "Word"
    "xlsx" = "Excel"
    "xls"  = "Excel"
    "csv"  = "CSV"
    "txt"  = "Texto"
}

$uploadedCount = 0
$skippedCount  = 0

foreach ($doc in $index) {
    $filePath = Join-Path $assetsDir $doc.path
    if (-not (Test-Path $filePath)) {
        Write-Host "  SKIP (no encontrado): $($doc.path)" -ForegroundColor Yellow
        $skippedCount++
        continue
    }

    $alreadyUploaded = $existing | Where-Object { $_.fileName -eq $doc.path }
    if ($alreadyUploaded) {
        Write-Host "  SKIP (ya subido):     $($doc.name)" -ForegroundColor DarkGray
        $skippedCount++
        continue
    }

    $fileItem = Get-Item $filePath
    $ext = $fileItem.Extension.TrimStart('.').ToLower()
    $category = if ($categoryMap.ContainsKey($ext)) { $categoryMap[$ext] } else { "General" }
    $description = if ($doc.description) { $doc.description } else { $doc.name }

    try {
        $result = & curl.exe -s -o NUL -w "%{http_code}" `
            -X POST $endpoint `
            -F "file=@`"$filePath`"" `
            -F "displayName=$($doc.name)" `
            -F "description=$description" `
            -F "category=$category" `
            -F "uploadedBy=$UploadedBy"

        if ($result -eq "200" -or $result -eq "201") {
            Write-Host "  OK: $($doc.name)" -ForegroundColor Green
            $uploadedCount++
        } else {
            Write-Host "  ERROR HTTP $result : $($doc.name)" -ForegroundColor Red
        }
    } catch {
        Write-Host "  ERROR: $($doc.name) - $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Completado: $uploadedCount subidos, $skippedCount omitidos." -ForegroundColor Cyan
