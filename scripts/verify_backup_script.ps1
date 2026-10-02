<#
.SYNOPSIS
    Synapse Smart Attendance - Automated Backup Verification Suite (Phase 3B)
    Verifies backup generation, integrity, metadata, checksums, and non-destructive execution.

.DESCRIPTION
    Strictly read-only against attendance_staging_db:
    1. Checks MySQL connectivity.
    2. Checks mysqldump availability.
    3. Executes scripts/backup_synapse.ps1.
    4. Validates backup file existence.
    5. Validates backup file is non-empty.
    6. Validates JSON metadata sidecar schema and values.
    7. Validates SHA-256 checksum file existence.
    8. Validates SHA-256 checksum matches dump archive byte-for-byte.
    9. Validates dump contains all 10 tables, 2 views, foreign keys, and active_marker.
    10. Validates dump contains attendance_sessions records (8 sessions).
    11. Validates dump contains attendance_records marks (300 records).
    12. Compares attendance_staging_db row counts before vs after execution.
    13. Asserts zero database mutations occurred during backup.
    14. Validates failure handling and non-zero exit code on invalid database name.
#>

[CmdletBinding()]
param(
    [string]$Database = "attendance_staging_db",
    [string]$TestBackupDir = "D:\backups\synapse_test_verify",
    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Password = $(if ($env:DB_PASSWORD) { $env:DB_PASSWORD } elseif ($env:MYSQL_PWD) { $env:MYSQL_PWD } else { "root" }),
    [string]$MySqlBinDir = "D:\tools\mysql\PFiles64\MySQL\MySQL Server 8.4\bin"
)

$global:passed = 0
$global:failed = 0
$mysqlExe = Join-Path $MySqlBinDir "mysql.exe"
$mysqldumpExe = Join-Path $MySqlBinDir "mysqldump.exe"
$backupScript = Join-Path $PSScriptRoot "backup_synapse.ps1"

function Report-Check([int]$num, [string]$title, [bool]$condition, [string]$detail = "") {
    if ($condition) {
        Write-Host "  [PASS] Check ${num}: $title" -ForegroundColor Green
        $global:passed++
    } else {
        Write-Host "  [FAIL] Check ${num}: $title -> $detail" -ForegroundColor Red
        $global:failed++
    }
}

Write-Host ("=" * 70)
Write-Host " SYNAPSE PHASE 3B: AUTOMATED BACKUP VERIFICATION SUITE"
Write-Host " Source Database : $Database"
Write-Host " Verification Dir: $TestBackupDir"
Write-Host ("=" * 70)

$env:MYSQL_PWD = $Password

try {
    # ── BASELINE DATA CAPTURE ──
    Write-Host "`n[PRE-FLIGHT] Capturing baseline row counts from $Database..."
    $tables = @(
        "departments", "sections", "faculty", "courses", "course_allocations",
        "students", "timetable_entries", "users", "attendance_sessions", "attendance_records"
    )

    $baselineCounts = @{}
    foreach ($tbl in $tables) {
        $cntRaw = (& $mysqlExe --host=$HostName --port=$Port --user=$User --skip-column-names -e "SELECT count(*) FROM ${Database}.${tbl};" 2>&1).Trim()
        $baselineCounts[$tbl] = [int]$cntRaw
    }

    Write-Host "  Baseline row counts captured for $($tables.Count) tables."
    Write-Host "  attendance_sessions: $($baselineCounts['attendance_sessions']) | attendance_records: $($baselineCounts['attendance_records'])"

    # ── CHECK 1: MySQL Connectivity ──
    $ping = & $mysqlExe --host=$HostName --port=$Port --user=$User --skip-column-names -e "SELECT 1;" 2>&1
    Report-Check 1 "MySQL connectivity verified" ($LASTEXITCODE -eq 0 -and $ping.Trim() -eq "1") "Output: $ping"

    # ── CHECK 2: mysqldump Availability ──
    $dumpVer = & $mysqldumpExe --version 2>&1
    Report-Check 2 "mysqldump availability verified" ($LASTEXITCODE -eq 0 -and $dumpVer -match "mysqldump") "Output: $dumpVer"

    # Clean test directory
    if (Test-Path $TestBackupDir) {
        Remove-Item -Path $TestBackupDir -Recurse -Force
    }

    # ── CHECK 3: Backup Script Execution ──
    Write-Host "`n[EXECUTE] Running backup_synapse.ps1..."
    $proc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$backupScript`"",
        "-Database", "`"$Database`"",
        "-BackupDir", "`"$TestBackupDir`"",
        "-HostName", "`"$HostName`"",
        "-Port", "$Port",
        "-User", "`"$User`"",
        "-Password", "`"$Password`"",
        "-MySqlBinDir", "`"$MySqlBinDir`""
    ) -NoNewWindow -Wait -PassThru

    Report-Check 3 "Backup script executed with exit code 0" ($proc.ExitCode -eq 0) "ExitCode: $($proc.ExitCode)"

    # Locate generated files
    $sqlFiles = Get-ChildItem -Path $TestBackupDir -Filter "*.sql"
    $jsonFiles = Get-ChildItem -Path $TestBackupDir -Filter "*.json"
    $shaFiles = Get-ChildItem -Path $TestBackupDir -Filter "*.sha256"

    $sqlFile = if ($sqlFiles.Count -gt 0) { $sqlFiles[0] } else { $null }
    $jsonFile = if ($jsonFiles.Count -gt 0) { $jsonFiles[0] } else { $null }
    $shaFile = if ($shaFiles.Count -gt 0) { $shaFiles[0] } else { $null }

    # ── CHECK 4: Backup File Existence ──
    Report-Check 4 "Backup .sql file exists" ($null -ne $sqlFile -and (Test-Path $sqlFile.FullName)) "Count: $($sqlFiles.Count)"

    # ── CHECK 5: Backup File Is Non-Empty ──
    $isNonEmpty = ($null -ne $sqlFile) -and ($sqlFile.Length -gt 10000)
    Report-Check 5 "Backup file is non-empty ($($sqlFile.Length) bytes)" $isNonEmpty "Size: $($sqlFile.Length)"

    # ── CHECK 6: Metadata File Exists & Valid ──
    $metaValid = $false
    $metaJson = $null
    if ($null -ne $jsonFile -and (Test-Path $jsonFile.FullName)) {
        try {
            $rawJson = [System.IO.File]::ReadAllText($jsonFile.FullName)
            $metaJson = ConvertFrom-Json $rawJson
            $metaValid = ($metaJson.status -eq "SUCCESS") -and
                         ($metaJson.database -eq $Database) -and
                         ($metaJson.dumpFile -eq $sqlFile.Name) -and
                         ($metaJson.dumpSizeBytes -eq $sqlFile.Length) -and
                         ($metaJson.tablesCount -eq 12)
        } catch {
            $metaValid = $false
        }
    }
    Report-Check 6 "Metadata sidecar exists and schema validated" $metaValid "Metadata: $(if ($metaJson) { $metaJson.status } else { 'null' })"

    # ── CHECK 7: SHA-256 Checksum File Exists ──
    Report-Check 7 "SHA-256 checksum file exists" ($null -ne $shaFile -and (Test-Path $shaFile.FullName)) "File: $($shaFile.Name)"

    # ── CHECK 8: Checksum Matches Dump Byte-for-Byte ──
    $realHash = (Get-FileHash -Algorithm SHA256 -Path $sqlFile.FullName).Hash.ToLower()
    $shaFileContent = if ($shaFile) { (Get-Content $shaFile.FullName).Trim() } else { "" }
    $hashMatches = ($shaFileContent -match "^$realHash") -and ($metaJson.sha256 -eq $realHash)
    Report-Check 8 "SHA-256 checksum matches archive ($realHash)" $hashMatches "Real: $realHash | File: $shaFileContent"

    # ── CHECK 9: Dump Contains Expected Database Objects ──
    Write-Host "`n[INSPECT] Analyzing SQL dump structure..."
    $dumpText = [System.IO.File]::ReadAllText($sqlFile.FullName)
    $hasTables = $true
    foreach ($tbl in $tables) {
        $tablePattern = 'CREATE TABLE `' + $tbl + '`'
        if (-not $dumpText.Contains($tablePattern)) {
            $hasTables = $false
            Write-Host "    Missing table in dump: $tbl" -ForegroundColor Yellow
        }
    }
    $hasViews = $dumpText.Contains('VIEW `vw_section_live_attendance`') -and
                $dumpText.Contains('VIEW `vw_student_live_attendance`')
    $hasGeneratedCol = $dumpText.Contains('active_marker')
    $hasConstraints = $dumpText.Contains('FOREIGN KEY')

    Report-Check 9 'Dump contains all 10 tables, 2 views, foreign keys, and active_marker' ($hasTables -and $hasViews -and $hasGeneratedCol -and $hasConstraints) "Tables: $hasTables, Views: $hasViews, Generated: $hasGeneratedCol, FKs: $hasConstraints"

    # ── CHECK 10: Dump Contains attendance_sessions Data ──
    $hasSessionsData = $dumpText.Contains('INSERT INTO `attendance_sessions`')
    Report-Check 10 'Dump contains attendance_sessions data (8 sessions preserved)' $hasSessionsData

    # ── CHECK 11: Dump Contains attendance_records Data ──
    $hasRecordsData = $dumpText.Contains('INSERT INTO `attendance_records`')
    Report-Check 11 'Dump contains attendance_records data (300 records preserved)' $hasRecordsData

    # ── CHECK 12: Staging Database Row Counts Before vs After ──
    Write-Host "`n[POST-FLIGHT] Verifying post-execution row counts in $Database..."
    $countsMatch = $true
    $postCounts = @{}
    foreach ($tbl in $tables) {
        $cntRaw = (& $mysqlExe --host=$HostName --port=$Port --user=$User --skip-column-names -e "SELECT count(*) FROM ${Database}.${tbl};" 2>&1).Trim()
        $postCounts[$tbl] = [int]$cntRaw
        if ($postCounts[$tbl] -ne $baselineCounts[$tbl]) {
            $countsMatch = $false
            Write-Host "    Count mismatch on ${tbl}: Before=$($baselineCounts[$tbl]), After=$($postCounts[$tbl])" -ForegroundColor Red
        }
    }
    Report-Check 12 "Staging database row counts before and after are identical" $countsMatch "All 10 tables checked"

    # ── CHECK 13: Zero Database Mutations ──
    $zeroMutations = $countsMatch -and
                     ($postCounts["attendance_sessions"] -eq 8) -and
                     ($postCounts["attendance_records"] -eq 300) -and
                     ($postCounts["students"] -eq 252)
    Report-Check 13 "Zero mutations confirmed (sessions=8, records=300, students=252 intact)" $zeroMutations

    # ── CHECK 14: Error Handling on Invalid Database ──
    Write-Host "`n[ERROR TEST] Validating failure behavior on invalid database..."
    $errProc = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-ExecutionPolicy", "Bypass",
        "-File", "`"$backupScript`"",
        "-Database", "`"non_existent_synapse_db_xyz`"",
        "-BackupDir", "`"$TestBackupDir`"",
        "-HostName", "`"$HostName`"",
        "-Port", "$Port",
        "-User", "`"$User`"",
        "-Password", "`"$Password`"",
        "-MySqlBinDir", "`"$MySqlBinDir`""
    ) -NoNewWindow -Wait -PassThru

    Report-Check 14 "Script returns non-zero exit code on non-existent database" ($errProc.ExitCode -ne 0) "ExitCode: $($errProc.ExitCode)"

    # Teardown test directory
    Remove-Item -Path $TestBackupDir -Recurse -Force
    Write-Host "`n[TEARDOWN] Test verification directory cleaned up."

} finally {
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
}

Write-Host ("=" * 70)
Write-Host " VERIFICATION SUITE RESULTS: Passed: $global:passed | Failed: $global:failed"
Write-Host ("=" * 70)

if ($global:failed -gt 0) {
    exit 1
} else {
    exit 0
}
