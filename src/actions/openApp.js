import { exec } from 'child_process';
import { promisify } from 'util';

const run = promisify(exec);

export const type = 'open_app';

const APP_ALIASES = {
    discord: 'Discord',
    zalo: 'Zalo',
    chrome: 'chrome',
    firefox: 'firefox',
    notepad: 'notepad',
    'notepad++': 'notepad++',
    vscode: 'code',
    code: 'code',
    'visual studio code': 'code',
    spotify: 'Spotify',
    telegram: 'Telegram',
    steam: 'Steam',
    word: 'WINWORD',
    excel: 'EXCEL',
    powerpoint: 'POWERPNT',
    explorer: 'explorer',
    cmd: 'cmd',
    terminal: 'wt',
    'windows terminal': 'wt',
    task_manager: 'taskmgr',
    calculator: 'calc',
    paint: 'mspaint',
    snip: 'SnippingTool',
};

async function findAppPath(name) {
    const lower = name.toLowerCase().trim();
    const alias = APP_ALIASES[lower];
    if (alias) return alias;

    try {
        const { stdout } = await run(
            `powershell -NoProfile -Command "Get-StartApps | Where-Object { $_.Name -like '*${lower}*' } | Select-Object -First 1 -ExpandProperty AppID"`,
            { shell: 'cmd.exe', timeout: 8000 }
        );
        const appId = stdout.trim();
        if (appId) return appId;
    } catch { /* fallback */ }

    return name;
}

export async function handler(args) {
    const { name } = args;
    if (!name) throw new Error('missing arg: name');

    const resolved = await findAppPath(name);

    return new Promise((resolve, reject) => {
        exec(`start "" "${resolved}"`, { shell: 'cmd.exe' }, (err) => {
            if (err) {
                exec(`powershell -NoProfile -Command "Start-Process '${resolved}'"`, { shell: 'cmd.exe' }, (err2) => {
                    if (err2) return reject(new Error(`not_found: ${name}`));
                    resolve({ ok: true, data: { name, resolved }, artifacts: [], error: null });
                });
                return;
            }
            resolve({ ok: true, data: { name, resolved }, artifacts: [], error: null });
        });
    });
}
