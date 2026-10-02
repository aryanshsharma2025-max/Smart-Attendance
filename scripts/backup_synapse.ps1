<#
.SYNOPSIS
    Synapse Smart Attendance - Deterministic Database Backup Script
    Performs transactional, non-blocking backups of the MySQL attendance database.

.DESCRIPTION
    Compliant with Synapse Phase 3B specifications:
    - Uses mysqldump with --single-transaction, --quick, --default-character-set=utf8mb4.
    - Captures tables, views, indexes, foreign keys, and generated columns.
    - Includes --routines, --triggers, --events for complete recovery.
    - Generates atomic timestamped backup files, SHA-256 checksums, and JSON metadata sidecars.
    - Never overwrites existing backups silently.
    - Safe credential handling via local environment scoping (MYSQL_PWD) with immediate cleanup.
    - Non-destructive: strictly read-only against the source database.

.PARAMETER Database
    The MySQL database to back up (default: 'attendance_staging_db').

.PARAMETER BackupDir
    Directory path where backup artifacts are written (default: 'D:\backups\synapse').

.PARAMETER Host
    MySQL server hostname or IP (default: '127.0.0.1').

.PARAMETER Port
    MySQL server port (default: 3306).

.PARAMETER User
    MySQL database username (default: 'root').

.PARAMETER Password
    MySQL database password. If not passed, checks $env:DB_PASSWORD, then $env:MYSQL_PWD, then defaults to 'root'.

.PARAMETER MySqlBinDir
    Directory containing mysqldump.exe and mysql.exe (default: 'D:\tools\mysql\PFiles64\MySQL\MySQL Server 8.4\bin').

.PARAMETER RetentionDays
    Number of days to retain backups. Default is 0 (retention disabled / no deletion).
#>

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Database = "attendance_staging_db",

    [Parameter(Position = 1)]
    [string]$BackupDir = $(if ($env:SYNAPSE_BACKUP_DIR) { $env:SYNAPSE_BACKUP_DIR } else { "D:\backups\synapse" }),

    [string]$HostName = "127.0.0.1",
    [int]$Port = 3306,
    [string]$User = "root",
    [string]$Password = $(if ($env:DB_PASSWORD) { $env:DB_PASSWORD } elseif ($env:MYSQL_PWD) { $env:MYSQL_PWD } else { "root" }),
    [string]$MySqlBinDir = "D:\tools\mysql\PFiles64\MySQL\MySQL Server 8.4\bin",
    [int]$RetentionDays = 0
)

$SCRIPT_VERSION = "1.0.0"
$startTime = [System.Diagnostics.Stopwatch]::StartNew()

function Write-Log([string]$level, [string]$message) {
    $ts = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    Write-Host "[$ts] [$level] $message"
}

Write-Log "INFO" "======================================================================"
Write-Log "INFO" "SYNAPSE BACKUP ENGINE v$SCRIPT_VERSION"
Write-Log "INFO" "Target Database : $Database"
Write-Log "INFO" "Target Server   : ${HostName}:${Port}"
Write-Log "INFO" "Database User   : $User"
Write-Log "INFO" "Destination Dir : $BackupDir"
Write-Log "INFO" "======================================================================"

# 1. Locate binaries
$mysqldumpExe = Join-Path $MySqlBinDir "mysqldump.exe"
$mysqlExe = Join-Path $MySqlBinDir "mysql.exe"

if (-not (Test-Path $mysqldumpExe)) {
    $cmd = Get-Command "mysqldump.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $mysqldumpExe = $cmd.Source
    } else {
        Write-Log "ERROR" "mysqldump.exe not found at '$mysqldumpExe' or in system PATH."
        exit 1
    }
}

if (-not (Test-Path $mysqlExe)) {
    $cmd = Get-Command "mysql.exe" -ErrorAction SilentlyContinue
    if ($cmd) {
        $mysqlExe = $cmd.Source
    } else {
        Write-Log "ERROR" "mysql.exe not found at '$mysqlExe' or in system PATH."
        exit 1
    }
}

# 2. Ensure destination directory exists
try {
    if (-not (Test-Path $BackupDir)) {
        New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
        Write-Log "INFO" "Created destination directory: $BackupDir"
    }
    # Test writability by creating and removing a test file
    $testFile = Join-Path $BackupDir ".write_test_$([guid]::NewGuid().ToString('N'))"
    [System.IO.File]::WriteAllText($testFile, "test")
    Remove-Item -Path $testFile -Force
} catch {
    Write-Log "ERROR" "Destination directory '$BackupDir' is not writable: $_"
    exit 2
}

# Scoped credential protection
$env:MYSQL_PWD = $Password
try {
    # 3. Verify MySQL connectivity and database existence
    Write-Log "INFO" "Verifying connectivity and checking database '$Database'..."
    $dbCheckOutput = & $mysqlExe --host=$HostName --port=$Port --user=$User --skip-column-names -e "SHOW DATABASES LIKE '$Database';" 2>&1
    if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($dbCheckOutput) -or ($dbCheckOutput.ToString().Trim() -ne $Database)) {
        Write-Log "ERROR" "Database '$Database' does not exist or server unreachable at ${HostName}:${Port}. Exit code: $LASTEXITCODE"
        exit 3
    }

    # Query MySQL version
    $serverVersion = (& $mysqlExe --host=$HostName --port=$Port --user=$User --skip-column-names -e "SELECT VERSION();" 2>&1).Trim()

    # Query mysqldump version
    $dumpVersionRaw = (& $mysqldumpExe --version 2>&1)
    $dumpVersion = if ($dumpVersionRaw -match "Distrib ([0-9\.]+)") { $matches[1] } else { $dumpVersionRaw.Trim() }

    # Query table list from source database
    $tableListRaw = & $mysqlExe --host=$HostName --port=$Port --user=$User --skip-column-names -e "SHOW TABLES FROM $Database;" 2>&1
    $tablesList = @($tableListRaw | Where-Object { $_ -and ($_.ToString().Trim() -ne "") } | ForEach-Object { $_.ToString().Trim() })

    # 4. Construct file paths
    $timestamp = (Get-Date).ToString("yyyyMMdd_HHmmss")
    $dumpFileName = "synapse_backup_${Database}_${timestamp}.sql"
    $dumpFilePath = Join-Path $BackupDir $dumpFileName
    $metadataFileName = "synapse_backup_${Database}_${timestamp}.json"
    $metadataFilePath = Join-Path $BackupDir $metadataFileName
    $checksumFileName = "${dumpFileName}.sha256"
    $checksumFilePath = Join-Path $BackupDir $checksumFileName

    if (Test-Path $dumpFilePath) {
        Write-Log "ERROR" "Backup file '$dumpFilePath' already exists. Overwrite rejected."
        exit 4
    }

    # 5. Execute mysqldump
    Write-Log "INFO" "Starting mysqldump for '$Database' (InnoDB Consistent Snapshot)..."
    $dumpArgs = @(
        "--host=$HostName",
        "--port=$Port",
        "--user=$User",
        "--single-transaction",
        "--quick",
        "--default-character-set=utf8mb4",
        "--routines",
        "--triggers",
        "--events",
        "--set-gtid-purged=OFF",
        "--result-file=$dumpFilePath",
        "$Database"
    )

    $dumpProcess = Start-Process -FilePath $mysqldumpExe -ArgumentList $dumpArgs -NoNewWindow -Wait -PassThru
    if ($dumpProcess.ExitCode -ne 0) {
        Write-Log "ERROR" "mysqldump failed with exit code $($dumpProcess.ExitCode)."
        if (Test-Path $dumpFilePath) { Remove-Item $dumpFilePath -Force }
        exit 5
    }

    # 6. Verify generated dump file
    if (-not (Test-Path $dumpFilePath)) {
        Write-Log "ERROR" "Dump file was not created at '$dumpFilePath'."
        exit 6
    }

    $dumpItem = Get-Item $dumpFilePath
    if ($dumpItem.Length -eq 0) {
        Write-Log "ERROR" "Dump file is empty (0 bytes): '$dumpFilePath'."
        Remove-Item $dumpFilePath -Force
        exit 6
    }

    # 7. Generate SHA-256 Checksum
    Write-Log "INFO" "Calculating SHA-256 checksum..."
    $hashObj = Get-FileHash -Algorithm SHA256 -Path $dumpFilePath
    $sha256 = $hashObj.Hash.ToLower()

    # Write checksum file
    $checksumContent = "$sha256 *$dumpFileName"
    [System.IO.File]::WriteAllText($checksumFilePath, $checksumContent)

    $startTime.Stop()
    $durationMs = $startTime.ElapsedMilliseconds

    # 8. Generate JSON Metadata Sidecar
    Write-Log "INFO" "Generating backup metadata sidecar..."
    $metadata = [PSCustomObject]@{
        timestamp            = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
        database             = $Database
        dumpFile             = $dumpFileName
        dumpSizeBytes        = $dumpItem.Length
        dumpSizeHuman        = "$([math]::Round($dumpItem.Length / 1KB, 2)) KB"
        sha256               = $sha256
        checksumFile         = $checksumFileName
        mysqlServerVersion   = $serverVersion
        mysqldumpVersion     = $dumpVersion
        scriptVersion        = $SCRIPT_VERSION
        status               = "SUCCESS"
        executionDurationMs  = $durationMs
        tablesCount          = $tablesList.Count
        tablesIncluded       = $tablesList
        dumpOptions          = @(
            "--single-transaction",
            "--quick",
            "--default-character-set=utf8mb4",
            "--routines",
            "--triggers",
            "--events",
            "--set-gtid-purged=OFF"
        )
        retentionPolicyDays  = $RetentionDays
    }

    $jsonContent = $metadata | ConvertTo-Json -Depth 5
    [System.IO.File]::WriteAllText($metadataFilePath, $jsonContent)

    Write-Log "INFO" "[SUCCESS] Backup completed successfully."
    Write-Log "INFO" "  SQL Dump   : $dumpFilePath ($([math]::Round($dumpItem.Length / 1KB, 2)) KB)"
    Write-Log "INFO" "  SHA-256    : $sha256"
    Write-Log "INFO" "  Metadata   : $metadataFilePath"
    Write-Log "INFO" "  Duration   : ${durationMs} ms"

    # 9. Conservative opt-in retention
    if ($RetentionDays -gt 0) {
        Write-Log "INFO" "Evaluating retention policy (RetentionDays = $RetentionDays)..."
        $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
        $pattern = "synapse_backup_${Database}_*.sql*"
        $oldDumps = Get-ChildItem -Path $BackupDir -Filter $pattern | Where-Object { $_.LastWriteTime -lt $cutoffDate }
        foreach ($old in $oldDumps) {
            $baseName = $old.BaseName.Replace(".sql", "")
            Write-Log "INFO" "Purging expired backup file: $($old.Name) (Created: $($old.LastWriteTime))"
            Remove-Item $old.FullName -Force
            # Also purge sidecars
            $sidecarJson = Join-Path $BackupDir "$baseName.json"
            if (Test-Path $sidecarJson) { Remove-Item $sidecarJson -Force }
            $sidecarSha = Join-Path $BackupDir "$($old.Name).sha256"
            if (Test-Path $sidecarSha) { Remove-Item $sidecarSha -Force }
        }
    } else {
        Write-Log "INFO" "Retention policy disabled (RetentionDays = 0). All archives preserved."
    }

    exit 0

} finally {
    # Ensure credentials are wiped from the execution environment
    Remove-Item Env:\MYSQL_PWD -ErrorAction SilentlyContinue
}
