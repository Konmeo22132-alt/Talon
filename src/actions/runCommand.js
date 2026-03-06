import { exec } from 'child_process';
import { promisify } from 'util';

const run = promisify(exec);

export const type = 'run_command';

const BLOCKED = [
    /rm\s+-rf\s+\//i,
    /format\s+[a-z]:/i,
    /del\s+\/s\s+\/q\s+c:\\/i,
    /shutdown/i,
    /reg\s+(add|delete)/i,
    /net\s+user/i,
    /schtasks/i,
];

export async function handler(args) {
    const { command, timeout = 30000 } = args;
    if (!command) throw new Error('missing arg: command');

    for (const pattern of BLOCKED) {
        if (pattern.test(command)) {
            throw new Error(`blocked: ${command}`);
        }
    }

    try {
        const { stdout, stderr } = await run(command, {
            shell: 'cmd.exe',
            timeout: Math.min(timeout, 60000),
            maxBuffer: 1024 * 512,
        });

        return {
            ok: true,
            data: {
                command,
                stdout: stdout.trim().slice(0, 2000),
                stderr: stderr.trim().slice(0, 500),
            },
            artifacts: [],
            error: null,
        };
    } catch (err) {
        return {
            ok: false,
            data: { command },
            artifacts: [],
            error: { code: 'CMD_ERROR', detail: err.message.slice(0, 500) },
        };
    }
}
