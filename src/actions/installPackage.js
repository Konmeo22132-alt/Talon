import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';

export const type = 'install_package';

const run = promisify(exec);

const INSTALLERS = {
    npm: (name) => `npm install ${name}`,
    pip: (name) => `pip install ${name}`,
};

function resolveProjectDir(dir) {
    if (!dir) return os.homedir();
    if (path.isAbsolute(dir)) return dir;
    return path.join(os.homedir(), dir);
}

async function detectEcosystem(name, projectDir) {
    try {
        const { stdout } = await run('dir /b package.json', { cwd: projectDir, shell: 'cmd.exe' });
        if (stdout.trim()) return 'npm';
    } catch { /* no package.json */ }

    try {
        const { stdout } = await run('dir /b requirements.txt', { cwd: projectDir, shell: 'cmd.exe' });
        if (stdout.trim()) return 'pip';
    } catch { /* no requirements.txt */ }

    return 'npm';
}

export async function handler(args) {
    const { ecosystem = 'auto', name, project_dir } = args;
    if (!name) throw new Error('missing arg: name');

    const cwd = resolveProjectDir(project_dir);
    const eco = ecosystem === 'auto'
        ? await detectEcosystem(name, cwd)
        : ecosystem;

    const cmd = INSTALLERS[eco];
    if (!cmd) throw new Error(`unsupported_ecosystem: ${eco}`);

    const { stdout } = await run(cmd(name), {
        cwd,
        shell: 'cmd.exe',
        timeout: 120000,
    });

    return {
        ok: true,
        data: { ecosystem: eco, name, output: stdout.slice(0, 500) },
        artifacts: [],
        error: null,
    };
}
