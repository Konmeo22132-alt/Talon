param([string]$Name)

$ErrorActionPreference = 'SilentlyContinue'

# 1. Start Menu shortcuts
$dirs = @(
    "$env:APPDATA\Microsoft\Windows\Start Menu\Programs",
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs"
)
foreach ($dir in $dirs) {
    $lnk = Get-ChildItem $dir -Recurse -Filter '*.lnk' |
        Where-Object { $_.BaseName -like "*$Name*" } |
        Select-Object -First 1
    if ($lnk) {
        Start-Process $lnk.FullName
        Write-Output "OK:$($lnk.BaseName)"
        exit 0
    }
}

# 2. Get-StartApps (UWP / Store apps)
$app = Get-StartApps | Where-Object { $_.Name -like "*$Name*" } | Select-Object -First 1
if ($app) {
    Start-Process "shell:AppsFolder\$($app.AppID)"
    Write-Output "OK:$($app.Name)"
    exit 0
}

# 3. LocalAppData exe search
$exe = Get-ChildItem "$env:LOCALAPPDATA" -Recurse -Filter '*.exe' -Depth 3 |
    Where-Object { $_.BaseName -like "*$Name*" } |
    Select-Object -First 1
if ($exe) {
    Start-Process $exe.FullName
    Write-Output "OK:$($exe.BaseName)"
    exit 0
}

Write-Output "NOTFOUND"
exit 1
