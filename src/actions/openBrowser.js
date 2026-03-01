import { exec } from 'child_process';

export const type = 'open_browser';

export async function handler(args) {
    const { url } = args;
    if (!url) throw new Error('missing arg: url');

    return new Promise((resolve, reject) => {
        exec(`start "" "${url}"`, { shell: 'cmd.exe' }, (err) => {
            if (err) return reject(err);
            resolve({ ok: true, data: { url }, artifacts: [], error: null });
        });
    });
}
