import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.join(__dirname, '..', '..', 'data', '_mouse.ps1');

const PS_SCRIPT = `
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
`;

let scriptReady = false;

async function ensureScript() {
    if (scriptReady) return;
    await fs.writeFile(SCRIPT_PATH, PS_SCRIPT, 'utf-8');
    scriptReady = true;
}

async function invoke(args) {
    await ensureScript();
    const { stdout } = await execFileAsync('powershell', [
        '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH, ...args,
    ], { timeout: 8000 });
    return stdout.trim();
}

export async function moveTo(x, y) {
    await invoke(['-Action', 'move', '-X', String(x), '-Y', String(y)]);
}

export async function click(button = 'left', x, y) {
    const args = ['-Action', 'click', '-Button', button];
    if (x !== undefined && y !== undefined) {
        args.push('-X', String(x), '-Y', String(y));
    } else {
        const pos = await getPosition();
        args.push('-X', String(pos.x), '-Y', String(pos.y));
    }
    await invoke(args);
}

export async function getPosition() {
    const out = await invoke(['-Action', 'pos']);
    const [x, y] = out.split(',').map(Number);
    return { x, y };
}

export async function scrollWheel(amount) {
    await invoke(['-Action', 'scroll', '-Delta', String(amount * 120)]);
}

export async function typeText(text) {
    await invoke(['-Action', 'type', '-Text', text]);
}
