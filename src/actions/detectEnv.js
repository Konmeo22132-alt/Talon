import { exec } from 'child_process';
import { promisify } from 'util';

export const type = 'detect_env';

const run = promisify(exec);

async function version(cmd) {
    try {
        const { stdout } = await run(cmd, { shell: 'cmd.exe', timeout: 5000 });
        return stdout.trim().split('\n')[0];
    } catch {
        return null;
    }
}

export async function handler() {
    const [node, npm, python, pip, git] = await Promise.all([
        version('node --version'),
        version('npm --version'),
        version('python --version'),
        version('pip --version'),
        version('git --version'),
    ]);

    return {
        ok: true,
        data: { node, npm, python, pip, git },
        artifacts: [],
        error: null,
    };
}
