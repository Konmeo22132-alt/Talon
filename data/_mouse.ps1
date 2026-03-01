
param([string]$Action, [int]$X = 0, [int]$Y = 0, [string]$Button = "left", [int]$Delta = 0, [string]$Text = "")
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class WinInput {
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int X, int Y);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT lpPoint);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, int dx, int dy, int d, IntPtr e);
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X; public int Y; }
}
"@
switch ($Action) {
    "move"   { [WinInput]::SetCursorPos($X, $Y) }
    "click"  {
        [WinInput]::SetCursorPos($X, $Y)
        Start-Sleep -Milliseconds 30
        switch ($Button) {
            "left"   { [WinInput]::mouse_event(0x0002,0,0,0,[IntPtr]::Zero); [WinInput]::mouse_event(0x0004,0,0,0,[IntPtr]::Zero) }
            "right"  { [WinInput]::mouse_event(0x0008,0,0,0,[IntPtr]::Zero); [WinInput]::mouse_event(0x0010,0,0,0,[IntPtr]::Zero) }
            "middle" { [WinInput]::mouse_event(0x0020,0,0,0,[IntPtr]::Zero); [WinInput]::mouse_event(0x0040,0,0,0,[IntPtr]::Zero) }
        }
    }
    "scroll" { [WinInput]::mouse_event(0x0800,0,0,$Delta,[IntPtr]::Zero) }
    "pos"    {
        $p = New-Object WinInput+POINT
        [WinInput]::GetCursorPos([ref]$p) | Out-Null
        Write-Output "$($p.X),$($p.Y)"
    }
    "type"   {
        Add-Type -AssemblyName System.Windows.Forms
        [System.Windows.Forms.SendKeys]::SendWait($Text)
    }
}
