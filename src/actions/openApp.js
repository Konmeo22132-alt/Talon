import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import config from '../config.js';

const run = promisify(exec);
const PS_SCRIPT = path.join(config.paths.data, '_openApp.ps1');

export const type = 'open_app';

const DIRECT = {
    notepad: 'notepad', 'notepad++': 'notepad++',
    chrome: 'chrome', 'google chrome': 'chrome',
    firefox: 'firefox', explorer: 'explorer',
    cmd: 'cmd', terminal: 'wt', 'windows terminal': 'wt',
    calculator: 'calc', calc: 'calc',
    paint: 'mspaint', snip: 'SnippingTool',
    word: 'WINWORD', excel: 'EXCEL', powerpoint: 'POWERPNT',
    task_manager: 'taskmgr', taskmgr: 'taskmgr',
    vscode: 'code', code: 'code', 'visual studio code': 'code',
};

export async function handler(args) {
    const { name } = args;
    if (!name) throw new Error('missing arg: name');

    const lower = name.toLowerCase().trim();

    if (DIRECT[lower]) {
        try {
            await run(`start "" "${DIRECT[lower]}"`, { shell: 'cmd.exe', timeout: 5000 });
            return { ok: true, data: { name, resolved: DIRECT[lower] }, artifacts: [], error: null };
        } catch { /* continue to PS script */ }
    }

    try {
        const cmd = `powershell -NoProfile -ExecutionPolicy Bypass -File "${PS_SCRIPT}" -Name "${lower}"`;
        console.log('[open_app] running: %s', cmd);
        const { stdout } = await run(cmd, { timeout: 15000 });
        const out = stdout.trim();
        console.log('[open_app] output: %s', out);
        if (out.startsWith('OK:')) {
            const resolved = out.slice(3);
            return { ok: true, data: { name, resolved }, artifacts: [], error: null };
        }
    } catch (err) {
        console.error('[open_app] ps error: %s', err.message);
    }

    try {
        await run(`start "" "${name}"`, { shell: 'cmd.exe', timeout: 5000 });
        return { ok: true, data: { name, resolved: name }, artifacts: [], error: null };
    } catch { /* continue */ }

    throw new Error(`not_found: ${name}`);
}
