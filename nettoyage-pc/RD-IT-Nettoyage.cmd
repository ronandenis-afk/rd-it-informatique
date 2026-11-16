<# :
@echo off
set "RDIT_SELF=%~f0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "$t=Join-Path $env:TEMP 'RD-IT-Nettoyage.ps1'; [IO.File]::WriteAllText($t,[IO.File]::ReadAllText($env:RDIT_SELF,[Text.Encoding]::UTF8),(New-Object Text.UTF8Encoding $true)); Start-Process powershell.exe -ArgumentList ('-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File '+[char]34+$t+[char]34)"
exit /b
#>
<#
    RD IT Nettoyage - Analyse et suppression de virus, malwares et adwares
    RD IT INFORMATIQUE - 1 La Conuais, 35580 Goven - 06.95.95.40.56 - rd-it-informatique.com

    Lancement : double-cliquer sur "RD-IT-Nettoyage.cmd" (droits administrateur demandés).
#>

# ---------------------------------------------------------------- Élévation administrateur
$script:Self = $PSCommandPath
if ($env:RDIT_SELF) { $script:Self = $env:RDIT_SELF }
$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    try {
        if ($script:Self -like '*.cmd') { Start-Process -FilePath $script:Self -Verb RunAs }
        else { Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -STA -WindowStyle Hidden -File `"$script:Self`"" }
    } catch {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.MessageBox]::Show("RD IT Nettoyage a besoin des droits administrateur.", "RD IT Nettoyage") | Out-Null
    }
    exit
}

$ErrorActionPreference = 'Continue'
$ProgressPreference = 'SilentlyContinue'
$script:ErrLog = Join-Path ([IO.Path]::GetTempPath()) 'RD-IT-Nettoyage-erreurs.log'
try { if ($script:Self) { $script:ErrLog = Join-Path (Split-Path $script:Self) 'RD-IT-Nettoyage-erreurs.log' } } catch {}
trap {
    try { Add-Content -Path $script:ErrLog -Value ("[{0:dd/MM/yyyy HH:mm:ss}] {1}`r`n{2}" -f (Get-Date), $_.Exception.Message, $_.InvocationInfo.PositionMessage) -Encoding UTF8 } catch {}
    continue
}
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()
try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 } catch {}

# ---------------------------------------------------------------- Moteur de tests (C#)
if (-not ('RdBench' -as [type])) {
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Runtime.InteropServices;
using System.Threading;
using System.Threading.Tasks;

public static class RdBench
{
    public static volatile int Progress = 0;

    [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public static void HideConsole() { IntPtr h = GetConsoleWindow(); if (h != IntPtr.Zero) ShowWindow(h, 0); }

    // Stress CPU : renvoie le nombre total de boucles effectuées
    public static Task<long> CpuStress(int seconds, int threads)
    {
        return Task.Factory.StartNew(() =>
        {
            long[] counts = new long[threads];
            DateTime end = DateTime.UtcNow.AddSeconds(seconds);
            Thread[] ts = new Thread[threads];
            for (int i = 0; i < threads; i++)
            {
                int k = i;
                ts[i] = new Thread(() =>
                {
                    double x = 1.0001; long c = 0;
                    while (DateTime.UtcNow < end)
                    {
                        for (int j = 1; j < 20000; j++) { x = Math.Sqrt(x * x + j) * 0.5 + 1.0; }
                        c++;
                    }
                    counts[k] = c + (x < 0 ? 1 : 0);
                });
                ts[i].IsBackground = true;
                ts[i].Priority = ThreadPriority.BelowNormal;
                ts[i].Start();
            }
            foreach (Thread t in ts) t.Join();
            long total = 0; foreach (long c in counts) total += c;
            return total;
        }, TaskCreationOptions.LongRunning);
    }

    // Test mémoire : écrit des motifs puis les relit. Renvoie "MoTestés;Erreurs;Mo/s"
    public static Task<string> MemTest(int megabytes)
    {
        return Task.Factory.StartNew(() =>
        {
            Progress = 0;
            List<ulong[]> blocks = new List<ulong[]>();
            int chunkMB = 64;
            try { for (int a = 0; a < megabytes; a += chunkMB) blocks.Add(new ulong[chunkMB * 1024 * 1024 / 8]); }
            catch (OutOfMemoryException) { }
            long errors = 0; long bytes = 0;
            ulong[] patterns = { 0x5555555555555555UL, 0xAAAAAAAAAAAAAAAAUL, 0x0UL, 0xFFFFFFFFFFFFFFFFUL, 0x0123456789ABCDEFUL };
            Stopwatch sw = Stopwatch.StartNew();
            int step = 0; int steps = patterns.Length;
            foreach (ulong pat in patterns)
            {
                ulong seed = 0;
                foreach (ulong[] b in blocks) { for (int i = 0; i < b.Length; i++) { b[i] = pat ^ (seed + (ulong)i); } seed += (ulong)b.Length; }
                seed = 0;
                foreach (ulong[] b in blocks)
                {
                    for (int i = 0; i < b.Length; i++) { if (b[i] != (pat ^ (seed + (ulong)i))) errors++; }
                    seed += (ulong)b.Length;
                    bytes += (long)b.Length * 16;
                }
                step++; Progress = step * 100 / steps;
            }
            double secs = Math.Max(0.001, sw.Elapsed.TotalSeconds);
            int tested = blocks.Count * chunkMB;
            blocks.Clear(); GC.Collect();
            return tested + ";" + errors + ";" + Math.Round(bytes / 1048576.0 / secs);
        }, TaskCreationOptions.LongRunning);
    }

    // Test d'écriture disque (secours si WinSAT indisponible). Renvoie Mo/s
    public static Task<double> DiskWrite(string folder, int megabytes)
    {
        return Task.Factory.StartNew(() =>
        {
            string path = Path.Combine(folder, "rdit_disktest.tmp");
            byte[] buf = new byte[4 * 1024 * 1024];
            new Random().NextBytes(buf);
            Stopwatch sw = Stopwatch.StartNew();
            using (FileStream fs = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough))
            {
                for (int i = 0; i < megabytes / 4; i++) { fs.Write(buf, 0, buf.Length); Progress = (i * 4) * 100 / megabytes; }
                fs.Flush(true);
            }
            double secs = sw.Elapsed.TotalSeconds;
            try { File.Delete(path); } catch { }
            return Math.Round(megabytes / Math.Max(0.001, secs));
        }, TaskCreationOptions.LongRunning);
    }
}
'@
}
[RdBench]::HideConsole()

# ---------------------------------------------------------------- Constantes
$script:LogoB64 = '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'
$script:Company = 'RD IT INFORMATIQUE'
$script:CompanyInfo = '1 La Conuais, 35580 Goven &middot; 06.95.95.40.56 &middot; rd-it-informatique.com'
$script:ReportDir = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Rapports RD IT'
$script:Results = New-Object System.Collections.ArrayList
$script:Running = $false

$cNavy  = [Drawing.Color]::FromArgb(18, 42, 82)
$cNavy2 = [Drawing.Color]::FromArgb(28, 62, 118)
$cBlue  = [Drawing.Color]::FromArgb(38, 112, 214)
$cBg    = [Drawing.Color]::FromArgb(244, 246, 250)

function Get-LogoImage {
    $bytes = [Convert]::FromBase64String($script:LogoB64)
    $ms = New-Object IO.MemoryStream(,$bytes)
    return [Drawing.Image]::FromStream($ms)
}

# ---------------------------------------------------------------- Journal & résultats
function Write-Log([string]$Text, [string]$Level = 'INFO') {
    $color = switch ($Level) {
        'OK'    { [Drawing.Color]::FromArgb(110, 220, 140) }
        'WARN'  { [Drawing.Color]::FromArgb(255, 190, 80) }
        'FAIL'  { [Drawing.Color]::FromArgb(255, 110, 110) }
        'TITLE' { [Drawing.Color]::FromArgb(120, 180, 255) }
        default { [Drawing.Color]::Gainsboro }
    }
    $script:LogBox.SelectionStart = $script:LogBox.TextLength
    $script:LogBox.SelectionLength = 0
    $script:LogBox.SelectionColor = $color
    $script:LogBox.AppendText("$Text`r`n")
    $script:LogBox.ScrollToCaret()
    [System.Windows.Forms.Application]::DoEvents()
}

function Add-Result([string]$Section, [string]$Item, $Value, [string]$Status = 'INFO') {
    [void]$script:Results.Add([pscustomobject]@{ Section = $Section; Item = $Item; Value = "$Value"; Status = $Status })
    $prefix = switch ($Status) { 'OK' { '  [OK] ' } 'WARN' { '  [ ! ] ' } 'FAIL' { '  [ X ] ' } default { '  [ i ] ' } }
    Write-Log ("$prefix$Item : $Value") $Status
}

function Set-Status([string]$Text) {
    $script:StatusLbl.Text = $Text
    [System.Windows.Forms.Application]::DoEvents()
}

function Invoke-Safe([string]$Section, [scriptblock]$Block) {
    try { & $Block }
    catch { Add-Result $Section 'Erreur pendant le test' $_.Exception.Message 'WARN' }
}

function Wait-Task($Task, [string]$Label, [int]$Expected = 0, [switch]$ShowProgress) {
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while (-not $Task.IsCompleted) {
        $el = [int]$sw.Elapsed.TotalSeconds
        $txt = "$Label - $el s"
        if ($Expected -gt 0) { $txt = "$Label - $el / $Expected s" }
        if ($ShowProgress) { $txt = "$Label - $([RdBench]::Progress) %" }
        Set-Status $txt
        Start-Sleep -Milliseconds 120
    }
    if ($Task.IsFaulted) { throw $Task.Exception.InnerException }
    return , $Task.Result
}

function Invoke-Hidden([string]$File, [string]$Arguments, [string]$Label, [int]$Expected = 0) {
    $psi = New-Object Diagnostics.ProcessStartInfo
    $psi.FileName = $File; $psi.Arguments = $Arguments
    $psi.UseShellExecute = $false; $psi.CreateNoWindow = $true
    $psi.RedirectStandardOutput = $true; $psi.RedirectStandardError = $true
    $p = [Diagnostics.Process]::Start($psi)
    $tOut = $p.StandardOutput.ReadToEndAsync()
    $tErr = $p.StandardError.ReadToEndAsync()
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while (-not $p.HasExited) {
        $el = [int]$sw.Elapsed.TotalSeconds
        if ($Expected -gt 0) { Set-Status "$Label - $el / ~$Expected s" } else { Set-Status "$Label - $el s" }
        Start-Sleep -Milliseconds 150
    }
    $p.WaitForExit()
    $text = "$($tOut.Result)$($tErr.Result)"
    return [pscustomobject]@{ ExitCode = $p.ExitCode; Output = $text }
}

function Clean-Oem($v) {
    $t = "$v".Trim()
    if (-not $t -or $t -match 'To be filled|O\.E\.M|Default string|System Product Name|System manufacturer|Not Applicable|^None$') { return '' }
    return $t
}

function Format-Size([double]$Bytes) {
    if ($Bytes -ge 1TB) { return ('{0:N2} To' -f ($Bytes / 1TB)) }
    if ($Bytes -ge 1GB) { return ('{0:N0} Go' -f ($Bytes / 1GB)) }
    return ('{0:N0} Mo' -f ($Bytes / 1MB))
}

function Get-RecentEvents([string]$Log, [int]$Days, [hashtable]$Extra) {
    $f = @{ LogName = $Log; StartTime = (Get-Date).AddDays(-$Days) }
    foreach ($k in $Extra.Keys) { $f[$k] = $Extra[$k] }
    try { return @(Get-WinEvent -FilterHashtable $f -ErrorAction Stop) } catch { return @() }
}

# ================================================================= NETTOYAGE - OUTILS COMMUNS
$script:WorkDir = Join-Path $env:ProgramData 'RD-IT-Nettoyage'
if (-not (Test-Path $script:WorkDir)) { New-Item -ItemType Directory -Path $script:WorkDir -Force | Out-Null }
$script:MpCmd = Join-Path $env:ProgramFiles 'Windows Defender\MpCmdRun.exe'

function Invoke-JobWait([scriptblock]$Block, [string]$Label, [object[]]$ArgList = @()) {
    $j = Start-Job -ScriptBlock $Block -ArgumentList $ArgList
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while ($j.State -eq 'Running' -or $j.State -eq 'NotStarted') {
        Set-Status ("{0} - {1} s" -f $Label, [int]$sw.Elapsed.TotalSeconds)
        Start-Sleep -Milliseconds 200
    }
    $out = Receive-Job $j -ErrorAction SilentlyContinue
    Remove-Job $j -Force -ErrorAction SilentlyContinue
    return $out
}

function Get-WebFile([string]$Url, [string]$Dest, [string]$Label) {
    $wc = New-Object Net.WebClient
    $wc.Headers.Add('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) RD-IT-Nettoyage')
    $t = $wc.DownloadFileTaskAsync($Url, $Dest)
    $sw = [Diagnostics.Stopwatch]::StartNew()
    while (-not $t.IsCompleted) {
        $mb = 0; try { if (Test-Path $Dest) { $mb = [math]::Round((Get-Item $Dest).Length / 1MB) } } catch {}
        Set-Status ("{0} - {1} Mo - {2} s" -f $Label, $mb, [int]$sw.Elapsed.TotalSeconds)
        Start-Sleep -Milliseconds 250
    }
    if ($t.IsFaulted) { throw $t.Exception.InnerException }
    return (Test-Path $Dest)
}

function Confirm-Box([string]$Text) {
    return ([System.Windows.Forms.MessageBox]::Show($Text, 'RD IT Nettoyage', 'YesNo', 'Question') -eq 'Yes')
}

# ================================================================= ÉTAPES
function Step-RestorePoint {
    $S = 'Sauvegarde'
    Write-Log "`r`n=== POINT DE RESTAURATION ===" 'TITLE'
    Invoke-Safe $S {
        $r = Invoke-JobWait {
            try {
                Enable-ComputerRestore -Drive "$env:SystemDrive\" -ErrorAction SilentlyContinue
                $k = 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore'
                Set-ItemProperty -Path $k -Name SystemRestorePointCreationFrequency -Value 0 -Type DWord -ErrorAction SilentlyContinue
                Checkpoint-Computer -Description 'RD IT Nettoyage (avant nettoyage)' -RestorePointType MODIFY_SETTINGS -ErrorAction Stop
                'OK'
            } catch { 'ERR:' + $_.Exception.Message }
        } 'Création du point de restauration'
        if ("$r" -eq 'OK') { Add-Result $S 'Point de restauration' 'Créé : retour arrière possible en cas de souci' 'OK' }
        else { Add-Result $S 'Point de restauration' ("Non créé ({0})" -f ("$r" -replace '^ERR:', '')) 'WARN' }
    }
}

function Step-SecurityStatus {
    $S = 'Protection'
    Write-Log "`r`n=== ÉTAT DE LA PROTECTION ===" 'TITLE'
    Invoke-Safe $S {
        $avs = @(Get-CimInstance -Namespace root/SecurityCenter2 -ClassName AntiVirusProduct -ErrorAction SilentlyContinue)
        foreach ($av in $avs) {
            $hex = '{0:X6}' -f [int]$av.productState
            $on = $hex.Substring(2, 2) -in '10', '11'
            $upd = $hex.Substring(4, 2) -eq '00'
            $st = 'OK'; $txt = 'actif, à jour'
            if (-not $on) { $st = 'INFO'; $txt = 'inactif' } elseif (-not $upd) { $st = 'WARN'; $txt = 'actif, définitions PAS à jour' }
            Add-Result $S "Antivirus : $($av.displayName)" $txt $st
        }
        if ($avs.Count -eq 0) { Add-Result $S 'Antivirus' 'Aucun antivirus enregistré' 'FAIL' }
    }
    Invoke-Safe $S {
        $mp = Get-MpComputerStatus -ErrorAction Stop
        $script:DefenderActive = [bool]$mp.AntivirusEnabled -and [bool]$mp.AMServiceEnabled
        if ($script:DefenderActive) {
            $st = 'OK'; if (-not $mp.RealTimeProtectionEnabled) { $st = 'FAIL' }
            Add-Result $S 'Microsoft Defender - protection en temps réel' $(if ($mp.RealTimeProtectionEnabled) { 'Activée' } else { 'DÉSACTIVÉE' }) $st
        } else {
            Add-Result $S 'Microsoft Defender' 'En veille (un autre antivirus est actif) : l''analyse Defender sera remplacée par Microsoft Safety Scanner' 'INFO'
        }
    }
    Invoke-Safe $S {
        $p = Get-MpPreference -ErrorAction Stop
        $ex = @($p.ExclusionPath) + @($p.ExclusionProcess) + @($p.ExclusionExtension) | Where-Object { $_ }
        if ($ex.Count -gt 0) { Add-Result $S 'Exclusions de l''antivirus' ("{0} exclusion(s) : {1}" -f $ex.Count, (($ex | Select-Object -First 5) -join ' ; ')) 'WARN' }
        else { Add-Result $S 'Exclusions de l''antivirus' 'Aucune' 'OK' }
    }
    Invoke-Safe $S {
        $lua = (Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -ErrorAction SilentlyContinue).EnableLUA
        if ($lua -eq 0) { Add-Result $S 'Contrôle de compte (UAC)' 'Désactivé : à réactiver' 'FAIL' } else { Add-Result $S 'Contrôle de compte (UAC)' 'Activé' 'OK' }
    }
}

function Step-Defender([string]$Mode) {
    $S = 'Microsoft Defender'
    Write-Log "`r`n=== ANALYSE MICROSOFT DEFENDER ===" 'TITLE'
    if (-not (Test-Path $script:MpCmd)) { Add-Result $S 'Analyse' 'Microsoft Defender introuvable' 'WARN'; return }
    if ($script:DefenderActive -eq $false) { Add-Result $S 'Analyse' 'Ignorée : Defender est en veille (autre antivirus actif)' 'INFO'; return }
    Invoke-Safe $S {
        $u = Invoke-Hidden $script:MpCmd '-SignatureUpdate' 'Defender : mise à jour des signatures' 60
        if ($u.ExitCode -eq 0) { Add-Result $S 'Mise à jour des signatures' 'Effectuée' 'OK' } else { Add-Result $S 'Mise à jour des signatures' "Échec (code $($u.ExitCode)), analyse avec les signatures actuelles" 'WARN' }
    }
    Invoke-Safe $S {
        $start = Get-Date
        $type = 1; $lbl = 'rapide'; $exp = 300
        if ($Mode -eq 'full') { $type = 2; $lbl = 'complète'; $exp = 3600 }
        Write-Log "  Analyse $lbl en cours (ne pas éteindre le PC)..." 'INFO'
        $r = Invoke-Hidden $script:MpCmd "-Scan -ScanType $type" "Defender : analyse $lbl" $exp
        $det = @(Get-MpThreatDetection -ErrorAction SilentlyContinue | Where-Object { $_.InitialDetectionTime -ge $start.AddMinutes(-1) })
        if ($det.Count -eq 0 -and $r.ExitCode -eq 0) { Add-Result $S "Analyse $lbl" 'Aucune menace détectée' 'OK'; return }
        $threats = @{}
        try { foreach ($t in @(Get-MpThreat -ErrorAction SilentlyContinue)) { $threats["$($t.ThreatID)"] = $t.ThreatName } } catch {}
        try { Remove-MpThreat -ErrorAction SilentlyContinue } catch {}
        $after = @(Get-MpThreat -ErrorAction SilentlyContinue | Where-Object { $_.IsActive })
        $names = @($det | ForEach-Object { $n = $threats["$($_.ThreatID)"]; if (-not $n) { $n = "Menace $($_.ThreatID)" }; $n } | Select-Object -Unique)
        if ($names.Count -eq 0) { $names = @('menace(s) signalée(s) par Defender') }
        if ($after.Count -eq 0) { Add-Result $S "Analyse $lbl" ("{0} menace(s) trouvée(s) et neutralisée(s) : {1}" -f $names.Count, ($names -join ', ')) 'WARN' }
        else { Add-Result $S "Analyse $lbl" ("{0} menace(s) encore active(s) : {1} - lancer l'analyse hors ligne" -f $after.Count, ($names -join ', ')) 'FAIL' }
    }
}

function Step-MSERT([bool]$Full) {
    $S = 'Microsoft Safety Scanner'
    Write-Log "`r`n=== MICROSOFT SAFETY SCANNER ===" 'TITLE'
    Invoke-Safe $S {
        $exe = Join-Path $script:WorkDir 'msert.exe'
        $url = 'https://go.microsoft.com/fwlink/?LinkId=212732'
        if (-not [Environment]::Is64BitOperatingSystem) { $url = 'https://go.microsoft.com/fwlink/?LinkId=212733' }
        $fresh = (Test-Path $exe) -and ((Get-Item $exe).LastWriteTime -gt (Get-Date).AddDays(-3))
        if (-not $fresh) {
            Write-Log '  Téléchargement de la dernière version (~200 Mo)...' 'INFO'
            [void](Get-WebFile $url $exe 'Safety Scanner : téléchargement')
        }
        $log = Join-Path $env:windir 'debug\msert.log'
        $before = 0; if (Test-Path $log) { $before = (Get-Item $log).Length }
        $args2 = '/Q'; $lbl = 'rapide'; $exp = 600
        if ($Full) { $args2 = '/Q /F:Y'; $lbl = 'complète'; $exp = 5400 }
        Write-Log "  Analyse $lbl en cours..." 'INFO'
        $r = Invoke-Hidden $exe $args2 "Safety Scanner : analyse $lbl" $exp
        $txt = ''
        if (Test-Path $log) {
            $fs = [IO.File]::Open($log, 'Open', 'Read', 'ReadWrite')
            try { [void]$fs.Seek($before, 'Begin'); $sr = New-Object IO.StreamReader($fs, [Text.Encoding]::Unicode); $txt = $sr.ReadToEnd() } finally { $fs.Close() }
            if ($txt -notmatch '[A-Za-z]{4}') { $txt = ''; try { $txt = [IO.File]::ReadAllText($log) } catch {}; if ($txt.Length -gt 20000) { $txt = $txt.Substring($txt.Length - 20000) } }
        }
        $found = @([regex]::Matches($txt, 'Threat Detected\s*:\s*(.+)') | ForEach-Object { $_.Groups[1].Value.Trim() } | Select-Object -Unique)
        if ($found.Count -eq 0) { $found = @([regex]::Matches($txt, '(?m)^\s*->\s*(\S.+)$') | Select-Object -First 0) }
        if ($txt -match 'No infection found' -or ($found.Count -eq 0 -and $r.ExitCode -eq 0)) { Add-Result $S "Analyse $lbl" 'Aucune infection trouvée' 'OK' }
        elseif ($found.Count -gt 0) { Add-Result $S "Analyse $lbl" ("{0} menace(s) supprimée(s) : {1}" -f $found.Count, (($found | Select-Object -First 6) -join ', ')) 'WARN' }
        else { Add-Result $S "Analyse $lbl" "Terminée (code $($r.ExitCode)) - détails dans C:\Windows\debug\msert.log" 'INFO' }
    }
}

function Step-AdwCleaner {
    $S = 'AdwCleaner'
    Write-Log "`r`n=== ADWCLEANER (adwares, barres d'outils, pirates de navigateur) ===" 'TITLE'
    Invoke-Safe $S {
        $exe = Join-Path $script:WorkDir 'adwcleaner.exe'
        [void](Get-WebFile 'https://adwcleaner.malwarebytes.com/adwcleaner?channel=release' $exe 'AdwCleaner : téléchargement')
        $logDir = Join-Path $script:WorkDir 'AdwCleaner'
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        $start = Get-Date
        $r = Invoke-Hidden $exe "/eula /clean /noreboot /path `"$logDir`"" 'AdwCleaner : analyse et nettoyage' 180
        $log = Get-ChildItem $logDir -Recurse -Filter '*.txt' -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $start.AddMinutes(-1) } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
        if (-not $log) { $log = Get-ChildItem "$env:SystemDrive\AdwCleaner\Logs" -Filter '*.txt' -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -ge $start.AddMinutes(-1) } | Sort-Object LastWriteTime -Descending | Select-Object -First 1 }
        if ($log) {
            $txt = ''; try { $txt = [IO.File]::ReadAllText($log.FullName) } catch {}
            $n = 0
            if ($txt -match 'Detected:\s*(\d+)') { $n = [int]$Matches[1] }
            else { $n = @([regex]::Matches($txt, '(?mi)^(Deleted|Quarantined|Supprim)')).Count }
            if ($n -gt 0) { Add-Result $S 'Analyse et nettoyage' "$n élément(s) indésirable(s) supprimé(s) (redémarrage conseillé)" 'WARN' }
            else { Add-Result $S 'Analyse et nettoyage' 'Aucun adware détecté' 'OK' }
            $script:AdwLog = $log.FullName
        } else { Add-Result $S 'Analyse et nettoyage' "Terminé (code $($r.ExitCode)), journal introuvable" 'INFO' }
    }
}

# Logiciels légitimes connus qui utilisent des scripts au démarrage (évite les fausses alertes)
$script:TrustedPattern = '(?i)\\VIGI|VIGI PC Client|\\Intel\\|QUEENCREEK|ESRV|\\Program Files( \(x86\))?\\(Intel|NVIDIA|AMD|Realtek|Dell|HP|Lenovo|ASUS|Acer|Logitech|TP-Link)\\'
$script:PupWords = @('Reimage', 'Restoro', 'Fortect', 'PC Accelerate', 'WebCompanion', 'Web Companion', 'ByteFence', 'Segurazo', 'SAntivirus', 'Wave Browser', 'WaveBrowser', 'OneLaunch', 'Shift Browser', 'PC Cleaner', 'PCSpeedMaximizer', 'Driver Support', 'DriverFix', 'Driver Easy', 'Advanced SystemCare', 'MyPC Backup', 'Search Protect', 'Conduit', 'Ask Toolbar', 'Yahoo Toolbar', 'Babylon', 'Hola VPN', 'Total AV', 'TotalAV', 'Opera GX', 'CCleaner Browser', 'Avast Secure Browser', 'AVG Secure Browser', 'PC App Store', 'Mindspark', 'Smart PC Fixer', 'Systweak', 'Outbyte', 'Auslogics', 'WinZip Driver Updater', 'Glary', 'IObit', 'Slimware', 'Iminent', 'Delta Toolbar', 'Snap.do', 'Safe Search', 'Hao123', 'Baidu', '360 Total Security', 'Tencent')

function Step-Checks {
    $S = 'Vérifications'
    Write-Log "`r`n=== VÉRIFICATIONS ANTI-DÉTOURNEMENT ===" 'TITLE'
    Invoke-Safe $S {
        $k = Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings' -ErrorAction SilentlyContinue
        if ($k.ProxyEnable -eq 1 -or $k.AutoConfigURL) {
            $v = @($k.ProxyServer, $k.AutoConfigURL) | Where-Object { $_ }
            Add-Result $S 'Proxy Internet' ("Activé ({0}) : à supprimer sauf si voulu (onglet Réparations)" -f ($v -join ' ')) 'WARN'
        } else { Add-Result $S 'Proxy Internet' 'Aucun' 'OK' }
    }
    Invoke-Safe $S {
        $h = Join-Path $env:windir 'System32\drivers\etc\hosts'
        $lines = @(Get-Content $h -ErrorAction SilentlyContinue | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') -and $_ -notmatch '^(127\.0\.0\.1|::1)\s+localhost$' })
        if ($lines.Count -gt 0) { Add-Result $S 'Fichier hosts' ("{0} redirection(s) : {1}" -f $lines.Count, (($lines | Select-Object -First 3) -join ' | ')) 'WARN' }
        else { Add-Result $S 'Fichier hosts' 'Normal' 'OK' }
    }
    Invoke-Safe $S {
        $pol = @()
        foreach ($root in 'HKLM:', 'HKCU:') {
            foreach ($b in @(@('Google\Chrome', 'Chrome'), @('Microsoft\Edge', 'Edge'), @('BraveSoftware\Brave', 'Brave'), @('Mozilla\Firefox', 'Firefox'))) {
                $p = "$root\SOFTWARE\Policies\$($b[0])"
                if (Test-Path "$p\ExtensionInstallForcelist") {
                    $vals = (Get-ItemProperty "$p\ExtensionInstallForcelist").PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' } | ForEach-Object { "$($_.Value)".Split(';')[0] }
                    $pol += "$($b[1]) : extension(s) imposée(s) $($vals -join ', ')"
                }
                if (Test-Path $p) {
                    $pp = Get-ItemProperty $p -ErrorAction SilentlyContinue
                    foreach ($n in 'HomepageLocation', 'DefaultSearchProviderSearchURL', 'RestoreOnStartupURLs', 'NewTabPageLocation') { if ($pp.$n) { $pol += "$($b[1]) : $n = $($pp.$n)" } }
                }
            }
        }
        if ($pol.Count -gt 0) { Add-Result $S 'Stratégies imposées aux navigateurs' (($pol | Select-Object -First 4) -join ' | ') 'WARN' }
        else { Add-Result $S 'Stratégies imposées aux navigateurs' 'Aucune' 'OK' }
    }
    Invoke-Safe $S {
        $bad = @()
        foreach ($t in @(Get-ScheduledTask -ErrorAction SilentlyContinue | Where-Object { $_.TaskPath -notlike '\Microsoft\*' })) {
            foreach ($a in @($t.Actions)) {
                $cmd = "$($a.Execute) $($a.Arguments)"
                if ("$($t.TaskName) $($t.TaskPath) $($a.WorkingDirectory) $cmd" -match $script:TrustedPattern) { continue }
                if ($cmd -match '(?i)\\AppData\\(Local\\Temp|Roaming)\\[^\\]+\.(exe|vbs|js|bat|cmd|ps1)|-enc(odedcommand)?\s|mshta|wscript|cscript|regsvr32.*http|powershell.*(hidden|downloadstring|iex)') { $bad += "$($t.TaskName) -> $($cmd.Trim())" }
            }
        }
        if ($bad.Count -gt 0) { Add-Result $S 'Tâches planifiées à vérifier' ("{0} : {1}" -f $bad.Count, (($bad | Select-Object -First 3) -join ' | ')) 'WARN' }
        else { Add-Result $S 'Tâches planifiées suspectes' 'Aucune' 'OK' }
    }
    Invoke-Safe $S {
        $bad = @(); $all = 0
        foreach ($k in 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run', 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Run') {
            $p = Get-ItemProperty $k -ErrorAction SilentlyContinue
            if (-not $p) { continue }
            foreach ($pr in $p.PSObject.Properties | Where-Object { $_.Name -notlike 'PS*' }) {
                $all++
                if ("$($pr.Value)" -match $script:TrustedPattern) { continue }
                if ("$($pr.Value)" -match '(?i)\\Temp\\|-enc(odedcommand)?\s|mshta|wscript|cscript|powershell.*hidden|\\AppData\\Roaming\\[^\\]+\.(exe|vbs|js)') { $bad += "$($pr.Name) = $($pr.Value)" }
            }
        }
        if ($bad.Count -gt 0) { Add-Result $S 'Démarrage automatique suspect' ("{0} : {1}" -f $bad.Count, (($bad | Select-Object -First 3) -join ' | ')) 'WARN' }
        else { Add-Result $S 'Démarrage automatique' "$all programme(s) au démarrage, aucun suspect" 'OK' }
    }
    Invoke-Safe $S {
        $apps = @()
        foreach ($k in 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*', 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*') {
            $apps += @(Get-ItemProperty $k -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName } | Select-Object -ExpandProperty DisplayName)
        }
        $hits = @($apps | Where-Object { $n = $_; @($script:PupWords | Where-Object { $n -like "*$_*" }).Count -gt 0 } | Select-Object -Unique)
        if ($hits.Count -gt 0) { Add-Result $S 'Logiciels souvent indésirables' ("{0} : {1} (à désinstaller si le client ne les utilise pas)" -f $hits.Count, ($hits -join ', ')) 'WARN' }
        else { Add-Result $S 'Logiciels souvent indésirables' 'Aucun repéré' 'OK' }
    }
    Invoke-Safe $S {
        $list = @()
        $roots = @(@("$env:LOCALAPPDATA\Google\Chrome\User Data", 'Chrome'), @("$env:LOCALAPPDATA\Microsoft\Edge\User Data", 'Edge'), @("$env:LOCALAPPDATA\BraveSoftware\Brave-Browser\User Data", 'Brave'))
        foreach ($r in $roots) {
            if (-not (Test-Path $r[0])) { continue }
            foreach ($m in @(Get-ChildItem $r[0] -Recurse -Depth 4 -Filter manifest.json -ErrorAction SilentlyContinue | Where-Object { $_.FullName -match '\\Extensions\\[a-p]{32}\\' })) {
                try { $j = [IO.File]::ReadAllText($m.FullName) | ConvertFrom-Json; $n = "$($j.name)"; if ($n -and $n -notlike '__MSG_*') { $list += "$($r[1]) : $n" } } catch {}
            }
        }
        $list = @($list | Select-Object -Unique)
        if ($list.Count -gt 0) { Add-Result $S 'Extensions de navigateur' ("{0} : {1}" -f $list.Count, (($list | Select-Object -First 12) -join ' ; ')) 'INFO' }
        else { Add-Result $S 'Extensions de navigateur' 'Aucune extension tierce repérée' 'OK' }
    }
}

function Step-Temp {
    $S = 'Nettoyage'
    Write-Log "`r`n=== FICHIERS TEMPORAIRES ===" 'TITLE'
    Invoke-Safe $S {
        $freed = Invoke-JobWait {
            param($paths)
            $total = 0
            foreach ($p in $paths) {
                if (-not (Test-Path $p)) { continue }
                foreach ($f in @(Get-ChildItem $p -Recurse -Force -File -ErrorAction SilentlyContinue | Where-Object { $_.LastWriteTime -lt (Get-Date).AddHours(-24) })) {
                    try { $len = $f.Length; Remove-Item $f.FullName -Force -ErrorAction Stop; $total += $len } catch {}
                }
                Get-ChildItem $p -Recurse -Force -Directory -ErrorAction SilentlyContinue | Sort-Object FullName -Descending | ForEach-Object { try { if (-not (Get-ChildItem $_.FullName -Force -ErrorAction Stop)) { Remove-Item $_.FullName -Force -ErrorAction Stop } } catch {} }
            }
            $total
        } 'Suppression des fichiers temporaires' @(, @($env:TEMP, (Join-Path $env:windir 'Temp'), (Join-Path $env:LOCALAPPDATA 'CrashDumps')))
        $mb = [math]::Round(([double]("$freed" -replace '[^\d]', '') ) / 1MB)
        Add-Result $S 'Fichiers temporaires' "$mb Mo libérés" 'OK'
    }
    Invoke-Safe $S { Clear-DnsClientCache -ErrorAction SilentlyContinue; Add-Result $S 'Cache DNS' 'Vidé' 'OK' }
}

# ================================================================= RAPPORT
function Get-Html([string]$s) { return [System.Net.WebUtility]::HtmlEncode("$s") }

function New-CleanReport([string]$Client, [string]$Tech, [string]$Notes, [TimeSpan]$Duration) {
    if (-not (Test-Path $script:ReportDir)) { New-Item -ItemType Directory -Path $script:ReportDir -Force | Out-Null }
    $fails = @($script:Results | Where-Object Status -eq 'FAIL').Count
    $warns = @($script:Results | Where-Object Status -eq 'WARN').Count
    $oks = @($script:Results | Where-Object Status -eq 'OK').Count
    $threat = @($script:Results | Where-Object { $_.Status -in 'WARN', 'FAIL' -and $_.Section -in 'Microsoft Defender', 'Microsoft Safety Scanner', 'AdwCleaner' }).Count
    if ($fails -gt 0) { $verdict = 'Intervention complémentaire nécessaire'; $vcls = 'fail' }
    elseif ($threat -gt 0) { $verdict = 'Menaces trouvées et nettoyées'; $vcls = 'warn' }
    elseif ($warns -gt 0) { $verdict = 'PC sain - quelques points à vérifier'; $vcls = 'warn' }
    else { $verdict = 'PC sain - aucune menace détectée'; $vcls = 'ok' }
    $sb = New-Object Text.StringBuilder
    foreach ($sec in @($script:Results | Select-Object -ExpandProperty Section -Unique)) {
        $items = @($script:Results | Where-Object Section -eq $sec)
        $sf = @($items | Where-Object Status -eq 'FAIL').Count; $sw = @($items | Where-Object Status -eq 'WARN').Count
        $badge = '<span class="b ok">OK</span>'
        if ($sf) { $badge = '<span class="b fail">À traiter</span>' } elseif ($sw) { $badge = '<span class="b warn">À surveiller</span>' }
        [void]$sb.Append("<section><h2>$(Get-Html $sec) $badge</h2><table>")
        foreach ($it in $items) {
            $ic = '<span class="d info">i</span>'
            if ($it.Status -eq 'OK') { $ic = '<span class="d ok">&#10004;</span>' } elseif ($it.Status -eq 'WARN') { $ic = '<span class="d warn">!</span>' } elseif ($it.Status -eq 'FAIL') { $ic = '<span class="d fail">&#10006;</span>' }
            [void]$sb.Append("<tr><td class='ic'>$ic</td><td class='k'>$(Get-Html $it.Item.Trim())</td><td>$(Get-Html $it.Value)</td></tr>")
        }
        [void]$sb.Append('</table></section>')
    }
    $notesHtml = ''
    if ($Notes.Trim()) { $notesHtml = "<section><h2>Observations du technicien</h2><p>$((Get-Html $Notes) -replace "`r?`n", '<br>')</p></section>" }
    $date = Get-Date
    $html = @"
<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Nettoyage $(Get-Html $env:COMPUTERNAME) - $(Get-Html $Client)</title>
<style>
*{box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;background:#eef2f7;margin:0;color:#1d2433}
.wrap{max-width:960px;margin:24px auto;background:#fff;border-radius:14px;box-shadow:0 4px 24px rgba(18,42,82,.12);overflow:hidden}
header{display:flex;align-items:center;gap:20px;background:linear-gradient(135deg,#122a52,#1c3e76);color:#fff;padding:22px 28px}
header img{width:92px;height:92px;border-radius:50%;background:#fff}header h1{margin:0;font-size:26px}header p{margin:4px 0 0;opacity:.85;font-size:13px}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#e3e8f0}.meta div{background:#f7f9fc;padding:12px 16px}
.meta small{display:block;color:#6b7690;font-size:11px;text-transform:uppercase}.meta b{font-size:14px}
.verdict{margin:22px 28px 8px;padding:18px 22px;border-radius:12px;font-size:20px;font-weight:600}.verdict span{display:block;font-size:13px;font-weight:400;color:#4a5568;margin-top:4px}
.verdict.ok{background:#e6f7ec;color:#17733a}.verdict.warn{background:#fff4e0;color:#9a5b00}.verdict.fail{background:#fde8e8;color:#b02323}
section{margin:16px 28px}h2{font-size:17px;color:#122a52;border-bottom:2px solid #e3e8f0;padding-bottom:6px;display:flex;align-items:center;gap:10px}
table{width:100%;border-collapse:collapse;font-size:14px}td{padding:6px 8px;border-bottom:1px solid #f0f2f6;vertical-align:top;word-break:break-word}td.k{width:34%;color:#3b4660;font-weight:600}td.ic{width:30px}
.d{display:inline-block;width:20px;height:20px;border-radius:50%;text-align:center;line-height:20px;font-size:12px;color:#fff;font-weight:700}.d.ok{background:#2fa35a}.d.warn{background:#f0a020}.d.fail{background:#d93636}.d.info{background:#9aa6bd}
.b{font-size:11px;padding:3px 9px;border-radius:20px;font-weight:600}.b.ok{background:#e6f7ec;color:#17733a}.b.warn{background:#fff4e0;color:#9a5b00}.b.fail{background:#fde8e8;color:#b02323}
footer{margin-top:24px;background:#f7f9fc;border-top:1px solid #e3e8f0;padding:16px 28px;font-size:12px;color:#6b7690}
.print{position:fixed;right:20px;bottom:20px;background:#2670d6;color:#fff;border:0;border-radius:24px;padding:12px 20px;font-size:14px;cursor:pointer}
@media print{body{background:#fff}.wrap{box-shadow:none;margin:0}.print{display:none}section{break-inside:avoid}}
</style></head><body><button class="print" onclick="window.print()">Imprimer / PDF</button><div class="wrap">
<header><img src="data:image/png;base64,$($script:LogoB64)" alt=""><div><h1>Rapport de nettoyage et sécurité</h1><p>$($script:Company) &middot; $($script:CompanyInfo)</p></div></header>
<div class="meta"><div><small>Client</small><b>$(Get-Html $Client)</b></div><div><small>Ordinateur</small><b>$(Get-Html $env:COMPUTERNAME)</b></div>
<div><small>Date</small><b>$('{0:dd/MM/yyyy HH:mm}' -f $date)</b></div><div><small>Technicien</small><b>$(Get-Html $Tech)</b></div></div>
<div class="verdict $vcls">$verdict<span>$oks OK &middot; $warns à surveiller &middot; $fails à traiter &middot; durée $([int]$Duration.TotalMinutes) min</span></div>
$notesHtml
$sb
<footer>$($script:Company) &middot; $($script:CompanyInfo)<br>Analyse réalisée avec RD IT Nettoyage (moteurs Microsoft Defender, Microsoft Safety Scanner, Malwarebytes AdwCleaner).</footer>
</div></body></html>
"@
    $safeClient = ($Client -replace '[\\/:*?"<>|]', '_').Trim(); if (-not $safeClient) { $safeClient = 'Client' }
    $file = Join-Path $script:ReportDir ("Nettoyage_{0}_{1}_{2:yyyy-MM-dd_HHmm}.html" -f $safeClient, $env:COMPUTERNAME, $date)
    [IO.File]::WriteAllText($file, $html, (New-Object Text.UTF8Encoding($true)))
    return $file
}

# ================================================================= LANCEMENT
function Start-Clean {
    if ($script:Running) { return }
    if ($script:RbFull.Checked -and -not (Confirm-Box "L'analyse complète peut durer de 1 à 3 heures. Continuer ?")) { return }
    $script:Running = $true; $script:BtnRun.Enabled = $false
    $script:Results.Clear(); $script:LogBox.Clear()
    $start = Get-Date
    Write-Log ("RD IT Nettoyage - {0:dd/MM/yyyy HH:mm}" -f $start) 'TITLE'
    $steps = @()
    if ($script:ChkRestore.Checked) { $steps += 'restore' }
    $steps += 'status'
    if ($script:ChkDefender.Checked) { $steps += 'defender' }
    if ($script:ChkMsert.Checked) { $steps += 'msert' }
    if ($script:ChkAdw.Checked) { $steps += 'adw' }
    if ($script:ChkChecks.Checked) { $steps += 'checks' }
    if ($script:ChkTemp.Checked) { $steps += 'temp' }
    $script:Progress.Maximum = [math]::Max(1, $steps.Count); $script:Progress.Value = 0
    $full = $script:RbFull.Checked
    foreach ($s in $steps) {
        switch ($s) {
            'restore'  { Step-RestorePoint }
            'status'   { Step-SecurityStatus }
            'defender' { if ($full) { Step-Defender 'full' } else { Step-Defender 'quick' } }
            'msert'    { Step-MSERT $full }
            'adw'      { Step-AdwCleaner }
            'checks'   { Step-Checks }
            'temp'     { Step-Temp }
        }
        if ($s -eq 'status' -and $script:DefenderActive -eq $false -and -not $script:ChkMsert.Checked -and $script:ChkDefender.Checked) {
            Write-Log '  Defender en veille : Microsoft Safety Scanner sera utilisé à la place.' 'INFO'
            Step-MSERT $full
        }
        $script:Progress.Value = [math]::Min($script:Progress.Maximum, $script:Progress.Value + 1)
    }
    $dur = (Get-Date) - $start
    Set-Status 'Création du rapport...'
    $file = New-CleanReport $script:TxtClient.Text $script:TxtTech.Text $script:TxtNotes.Text $dur
    $fails = @($script:Results | Where-Object Status -eq 'FAIL').Count
    $warns = @($script:Results | Where-Object Status -eq 'WARN').Count
    $lvl = 'OK'; if ($fails) { $lvl = 'FAIL' } elseif ($warns) { $lvl = 'WARN' }
    Write-Log "`r`n=== TERMINÉ : $fails point(s) à traiter, $warns à surveiller ===" $lvl
    Write-Log "Rapport : $file" 'TITLE'
    Set-Status "Terminé en $([int]$dur.TotalMinutes) min - rapport dans « Rapports RD IT » sur le Bureau"
    $script:LastReport = $file; $script:BtnOpen.Enabled = $true
    Start-Process $file
    $script:BtnRun.Enabled = $true; $script:Running = $false
}

# ================================================================= RÉPARATIONS
function Save-RegBackup([string]$Key, [string]$Name) {
    $f = Join-Path $script:WorkDir ("sauvegarde_{0}_{1:yyyyMMdd_HHmmss}.reg" -f $Name, (Get-Date))
    $null = Invoke-Hidden 'reg.exe' "export `"$Key`" `"$f`" /y" 'Sauvegarde du registre' 5
    return $f
}

$script:Repairs = @(
    ,@('Supprimer le proxy Internet', 'Désactive un proxy imposé par un logiciel malveillant', {
        Save-RegBackup 'HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings' 'proxy' | Out-Null
        $k = 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Internet Settings'
        Set-ItemProperty $k -Name ProxyEnable -Value 0
        Remove-ItemProperty $k -Name ProxyServer, AutoConfigURL -ErrorAction SilentlyContinue
        'Proxy supprimé.'
    })
    ,@('Réinitialiser le fichier hosts', 'Remet le fichier hosts d''origine (copie de sauvegarde conservée)', {
        $h = Join-Path $env:windir 'System32\drivers\etc\hosts'
        Copy-Item $h (Join-Path $script:WorkDir ("hosts_{0:yyyyMMdd_HHmmss}.bak" -f (Get-Date))) -Force
        $def = "# Copyright (c) 1993-2009 Microsoft Corp.`r`n#`r`n# This is a sample HOSTS file used by Microsoft TCP/IP for Windows.`r`n#`r`n# localhost name resolution is handled within DNS itself.`r`n#`t127.0.0.1       localhost`r`n#`t::1             localhost`r`n"
        [IO.File]::WriteAllText($h, $def, [Text.Encoding]::ASCII)
        'Fichier hosts réinitialisé.'
    })
    ,@('Supprimer les stratégies imposées aux navigateurs', 'Retire extensions forcées, page d''accueil et moteur de recherche imposés (Chrome, Edge, Brave, Firefox)', {
        $done = 0
        foreach ($root in 'HKLM', 'HKCU') {
            foreach ($b in 'Google\Chrome', 'Microsoft\Edge', 'BraveSoftware\Brave', 'Mozilla\Firefox') {
                $p = "${root}:\SOFTWARE\Policies\$b"
                if (Test-Path $p) { Save-RegBackup "$root\SOFTWARE\Policies\$b" ($b -replace '\\', '_') | Out-Null; Remove-Item $p -Recurse -Force; $done++ }
            }
        }
        "$done jeu(x) de stratégies supprimé(s). Redémarrez les navigateurs."
    })
    ,@('Supprimer les exclusions de l''antivirus', 'Retire les dossiers et programmes exclus de Microsoft Defender', {
        $p = Get-MpPreference
        foreach ($x in @($p.ExclusionPath)) { if ($x) { Remove-MpPreference -ExclusionPath $x } }
        foreach ($x in @($p.ExclusionProcess)) { if ($x) { Remove-MpPreference -ExclusionProcess $x } }
        foreach ($x in @($p.ExclusionExtension)) { if ($x) { Remove-MpPreference -ExclusionExtension $x } }
        'Exclusions supprimées.'
    })
    ,@('Réactiver le contrôle de compte (UAC)', 'Remet la protection UAC (redémarrage nécessaire)', {
        Set-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System' -Name EnableLUA -Value 1 -Type DWord
        'UAC réactivé. Redémarrez le PC.'
    })
    ,@('Réparer la connexion réseau', 'Vide le DNS, réinitialise Winsock et TCP/IP (redémarrage nécessaire)', {
        $null = Invoke-Hidden 'ipconfig.exe' '/flushdns' 'Vidage DNS' 5
        $null = Invoke-Hidden 'netsh.exe' 'winsock reset' 'Réinitialisation Winsock' 10
        $null = Invoke-Hidden 'netsh.exe' 'int ip reset' 'Réinitialisation TCP/IP' 10
        'Réseau réinitialisé. Redémarrez le PC.'
    })
    ,@('Analyse hors ligne Microsoft Defender', 'Redémarre le PC et analyse avant Windows (rootkits, menaces tenaces) - environ 15 min', {
        Start-MpWDOScan
        'Le PC va redémarrer pour l''analyse hors ligne.'
    })
    ,@('Ouvrir Sécurité Windows', 'Historique des menaces et quarantaine', { Start-Process 'windowsdefender://threat'; '' })
    ,@('Désinstaller des programmes', 'Ouvre la liste des applications installées', { Start-Process 'ms-settings:appsfeatures'; '' })
    ,@('Programmes au démarrage', 'Gestionnaire des tâches > Démarrage', { Start-Process taskmgr.exe '/7 /startup'; '' })
)

# ================================================================= INTERFACE
$form = New-Object Windows.Forms.Form
$form.Text = 'RD IT Nettoyage'
$form.Size = New-Object Drawing.Size(1080, 760)
$form.MinimumSize = New-Object Drawing.Size(960, 640)
$form.StartPosition = 'CenterScreen'
$form.BackColor = $cBg
$form.Font = New-Object Drawing.Font('Segoe UI', 9.5)
try { $logo = Get-LogoImage; $form.Icon = [Drawing.Icon]::FromHandle(([Drawing.Bitmap]$logo).GetHicon()) } catch {}

$head = New-Object Windows.Forms.Panel
$head.Dock = 'Top'; $head.Height = 92; $head.BackColor = $cNavy
$pic = New-Object Windows.Forms.PictureBox
$pic.Size = New-Object Drawing.Size(72, 72); $pic.Location = New-Object Drawing.Point(18, 10); $pic.SizeMode = 'Zoom'; $pic.BackColor = $cNavy
try { $pic.Image = $logo } catch {}
$t1 = New-Object Windows.Forms.Label
$t1.Text = 'RD IT Nettoyage'; $t1.ForeColor = [Drawing.Color]::White; $t1.Font = New-Object Drawing.Font('Segoe UI Semibold', 20); $t1.AutoSize = $true; $t1.Location = New-Object Drawing.Point(102, 14)
$t2 = New-Object Windows.Forms.Label
$t2.Text = 'Virus, malwares, adwares  ·  RD IT INFORMATIQUE  ·  06.95.95.40.56  ·  rd-it-informatique.com'
$t2.ForeColor = [Drawing.Color]::FromArgb(180, 200, 235); $t2.AutoSize = $true; $t2.Location = New-Object Drawing.Point(106, 56)
$head.Controls.AddRange(@($pic, $t1, $t2))

$bottom = New-Object Windows.Forms.Panel
$bottom.Dock = 'Bottom'; $bottom.Height = 44; $bottom.BackColor = [Drawing.Color]::White
$script:Progress = New-Object Windows.Forms.ProgressBar
$script:Progress.Location = New-Object Drawing.Point(14, 12); $script:Progress.Size = New-Object Drawing.Size(260, 20)
$script:StatusLbl = New-Object Windows.Forms.Label
$script:StatusLbl.Location = New-Object Drawing.Point(290, 13); $script:StatusLbl.AutoSize = $true; $script:StatusLbl.Text = 'Prêt.'
$bottom.Controls.AddRange(@($script:Progress, $script:StatusLbl))

$tabs = New-Object Windows.Forms.TabControl
$tabs.Dock = 'Fill'; $tabs.Padding = New-Object Drawing.Point(16, 6); $tabs.Font = New-Object Drawing.Font('Segoe UI', 10)

# ---------- Onglet Nettoyage
$tabMain = New-Object Windows.Forms.TabPage
$tabMain.Text = 'Analyse et nettoyage'; $tabMain.BackColor = $cBg
$left = New-Object Windows.Forms.Panel
$left.Dock = 'Left'; $left.Width = 340

function New-Lbl($text, $y, [switch]$Bold) {
    $l = New-Object Windows.Forms.Label
    $l.Text = $text; $l.AutoSize = $true; $l.Location = New-Object Drawing.Point(14, $y)
    if ($Bold) { $l.Font = New-Object Drawing.Font('Segoe UI Semibold', 10.5); $l.ForeColor = $cNavy }
    return $l
}
function New-Txt($y, $h = 26, [switch]$Multi) {
    $t = New-Object Windows.Forms.TextBox
    $t.Location = New-Object Drawing.Point(14, $y); $t.Size = New-Object Drawing.Size(306, $h)
    if ($Multi) { $t.Multiline = $true; $t.ScrollBars = 'Vertical' }
    return $t
}
function New-Chk($text, $y, [bool]$On = $true) {
    $c = New-Object Windows.Forms.CheckBox
    $c.Text = $text; $c.Checked = $On; $c.AutoSize = $true; $c.Location = New-Object Drawing.Point(18, $y)
    return $c
}

$left.Controls.Add((New-Lbl 'Client' 8 -Bold))
$script:TxtClient = New-Txt 32; $left.Controls.Add($script:TxtClient)
$left.Controls.Add((New-Lbl 'Technicien' 62 -Bold))
$script:TxtTech = New-Txt 86; $script:TxtTech.Text = 'Ronan Denis'; $left.Controls.Add($script:TxtTech)
$left.Controls.Add((New-Lbl 'Étapes' 120 -Bold))
$script:ChkRestore  = New-Chk 'Point de restauration avant nettoyage' 146
$script:ChkDefender = New-Chk 'Analyse Microsoft Defender (+ mise à jour)' 170
$script:ChkMsert    = New-Chk 'Microsoft Safety Scanner (2e avis, ~200 Mo)' 194 $false
$script:ChkAdw      = New-Chk 'AdwCleaner (adwares, pirates de navigateur)' 218
$script:ChkChecks   = New-Chk 'Vérifications (proxy, hosts, tâches, extensions…)' 242
$script:ChkTemp     = New-Chk 'Suppression des fichiers temporaires' 266
$left.Controls.AddRange(@($script:ChkRestore, $script:ChkDefender, $script:ChkMsert, $script:ChkAdw, $script:ChkChecks, $script:ChkTemp))
$left.Controls.Add((New-Lbl 'Type d''analyse' 298 -Bold))
$script:RbQuick = New-Object Windows.Forms.RadioButton
$script:RbQuick.Text = 'Rapide (10-20 min)'; $script:RbQuick.Checked = $true; $script:RbQuick.AutoSize = $true; $script:RbQuick.Location = New-Object Drawing.Point(18, 322)
$script:RbFull = New-Object Windows.Forms.RadioButton
$script:RbFull.Text = 'Complète (1-3 h)'; $script:RbFull.AutoSize = $true; $script:RbFull.Location = New-Object Drawing.Point(180, 322)
$left.Controls.AddRange(@($script:RbQuick, $script:RbFull))
$left.Controls.Add((New-Lbl 'Observations (dans le rapport)' 354 -Bold))
$script:TxtNotes = New-Txt 378 64 -Multi; $left.Controls.Add($script:TxtNotes)

$script:BtnRun = New-Object Windows.Forms.Button
$script:BtnRun.Text = 'Lancer le nettoyage'
$script:BtnRun.Location = New-Object Drawing.Point(14, 454); $script:BtnRun.Size = New-Object Drawing.Size(306, 44)
$script:BtnRun.FlatStyle = 'Flat'; $script:BtnRun.FlatAppearance.BorderSize = 0
$script:BtnRun.BackColor = $cBlue; $script:BtnRun.ForeColor = [Drawing.Color]::White
$script:BtnRun.Font = New-Object Drawing.Font('Segoe UI Semibold', 11.5)
$script:BtnRun.Add_Click({ Start-Clean })
$script:BtnOpen = New-Object Windows.Forms.Button
$script:BtnOpen.Text = 'Ouvrir le rapport'; $script:BtnOpen.Enabled = $false
$script:BtnOpen.Location = New-Object Drawing.Point(14, 504); $script:BtnOpen.Size = New-Object Drawing.Size(150, 32)
$script:BtnOpen.Add_Click({ if ($script:LastReport) { Start-Process $script:LastReport } })
$btnFolder = New-Object Windows.Forms.Button
$btnFolder.Text = 'Dossier des rapports'
$btnFolder.Location = New-Object Drawing.Point(170, 504); $btnFolder.Size = New-Object Drawing.Size(150, 32)
$btnFolder.Add_Click({ if (-not (Test-Path $script:ReportDir)) { New-Item -ItemType Directory -Path $script:ReportDir -Force | Out-Null }; Start-Process explorer.exe $script:ReportDir })
$left.Controls.AddRange(@($script:BtnRun, $script:BtnOpen, $btnFolder))

$script:LogBox = New-Object Windows.Forms.RichTextBox
$script:LogBox.Dock = 'Fill'; $script:LogBox.ReadOnly = $true
$script:LogBox.BackColor = [Drawing.Color]::FromArgb(22, 28, 40); $script:LogBox.ForeColor = [Drawing.Color]::Gainsboro
$script:LogBox.Font = New-Object Drawing.Font('Consolas', 10); $script:LogBox.BorderStyle = 'None'
$logWrap = New-Object Windows.Forms.Panel
$logWrap.Dock = 'Fill'; $logWrap.Padding = New-Object Windows.Forms.Padding(0, 12, 12, 12)
$logWrap.Controls.Add($script:LogBox)
$tabMain.Controls.Add($logWrap)
$tabMain.Controls.Add($left)

# ---------- Onglet Réparations
$tabRep = New-Object Windows.Forms.TabPage
$tabRep.Text = 'Réparations'; $tabRep.BackColor = $cBg
$flow = New-Object Windows.Forms.FlowLayoutPanel
$flow.Dock = 'Fill'; $flow.Padding = New-Object Windows.Forms.Padding(14); $flow.AutoScroll = $true
foreach ($rp in $script:Repairs) {
    $b = New-Object Windows.Forms.Button
    $b.Size = New-Object Drawing.Size(320, 78); $b.Margin = New-Object Windows.Forms.Padding(8)
    $b.Text = "$($rp[0])`r`n$($rp[1])"; $b.TextAlign = 'MiddleLeft'; $b.Padding = New-Object Windows.Forms.Padding(10, 0, 0, 0)
    $b.FlatStyle = 'Flat'; $b.BackColor = [Drawing.Color]::White; $b.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(205, 214, 230)
    $b.Tag = $rp
    $b.Add_Click({
        param($sender, $e)
        $rp2 = $sender.Tag
        if (-not (Confirm-Box ("{0} ?`r`n`r`n{1}" -f $rp2[0], $rp2[1]))) { return }
        try { $msg = & $rp2[2]; if ("$msg") { [System.Windows.Forms.MessageBox]::Show("$msg", 'RD IT Nettoyage') | Out-Null } }
        catch { [System.Windows.Forms.MessageBox]::Show("Erreur : $($_.Exception.Message)", 'RD IT Nettoyage') | Out-Null }
    })
    $flow.Controls.Add($b)
}
$tabRep.Controls.Add($flow)

# ---------- Onglet Outils
$tabTools = New-Object Windows.Forms.TabPage
$tabTools.Text = 'Autres outils'; $tabTools.BackColor = $cBg
$flow2 = New-Object Windows.Forms.FlowLayoutPanel
$flow2.Dock = 'Fill'; $flow2.Padding = New-Object Windows.Forms.Padding(14); $flow2.AutoScroll = $true
$links = @(
    @('Malwarebytes', 'Anti-malware complet (version gratuite)', 'winget:Malwarebytes.Malwarebytes'),
    @('Autoruns (Microsoft)', 'Tout ce qui démarre avec Windows', 'winget:Microsoft.Sysinternals.Autoruns'),
    @('Process Explorer (Microsoft)', 'Processus en cours, vérification VirusTotal', 'winget:Microsoft.Sysinternals.ProcessExplorer'),
    @('ESET Online Scanner', 'Second avis gratuit (page officielle)', 'https://www.eset.com/fr/home/online-scanner/'),
    @('Kaspersky Virus Removal Tool', 'Scanner gratuit à la demande (page officielle)', 'https://www.kaspersky.fr/downloads/free-virus-removal-tool'),
    @('Emsisoft Emergency Kit', 'Scanner portable gratuit (page officielle)', 'https://www.emsisoft.com/fr/home/emergency-kit/'),
    @('VirusTotal', 'Analyser un fichier suspect en ligne', 'https://www.virustotal.com/gui/home/upload')
)
foreach ($ln in $links) {
    $b = New-Object Windows.Forms.Button
    $b.Size = New-Object Drawing.Size(320, 78); $b.Margin = New-Object Windows.Forms.Padding(8)
    $b.Text = "$($ln[0])`r`n$($ln[1])"; $b.TextAlign = 'MiddleLeft'; $b.Padding = New-Object Windows.Forms.Padding(10, 0, 0, 0)
    $b.FlatStyle = 'Flat'; $b.BackColor = [Drawing.Color]::White; $b.FlatAppearance.BorderColor = [Drawing.Color]::FromArgb(205, 214, 230)
    $b.Tag = $ln[2]
    $b.Add_Click({
        param($sender, $e)
        $tg = "$($sender.Tag)"
        if ($tg.StartsWith('winget:')) {
            $wg = (Get-Command winget.exe -ErrorAction SilentlyContinue).Source
            if (-not $wg) { $wg = Join-Path $env:LOCALAPPDATA 'Microsoft\WindowsApps\winget.exe' }
            Start-Process cmd.exe ("/k title Installation & `"{0}`" install --id {1} -e --accept-package-agreements --accept-source-agreements & echo. & echo Termine." -f $wg, $tg.Substring(7))
        } else { Start-Process $tg }
    })
    $flow2.Controls.Add($b)
}
$tabTools.Controls.Add($flow2)

$tabs.TabPages.AddRange(@($tabMain, $tabRep, $tabTools))
$form.Controls.Add($tabs)
$form.Controls.Add($bottom)
$form.Controls.Add($head)
$form.Add_FormClosing({ param($s, $e) if ($script:Running) { $r = [System.Windows.Forms.MessageBox]::Show('Une analyse est en cours. Quitter quand même ?', 'RD IT Nettoyage', 'YesNo'); if ($r -ne 'Yes') { $e.Cancel = $true } else { [Environment]::Exit(0) } } })
$form.Add_Shown({ $form.Activate(); $script:TxtClient.Focus() })

Write-Log 'Bienvenue dans RD IT Nettoyage.' 'TITLE'
Write-Log 'Renseignez le client, choisissez les étapes puis cliquez sur « Lancer le nettoyage ».'
Write-Log 'Les menaces trouvées sont mises en quarantaine automatiquement. Les points suspects (proxy, hosts…)'
Write-Log 'sont seulement signalés : corrigez-les ensuite dans l''onglet « Réparations ».'
[void]$form.ShowDialog()
