import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { pipeline } from 'stream/promises';
import { createWriteStream } from 'fs';

export const type = 'download_file';

const DIR_MAP = {
    downloads: path.join(os.homedir(), 'Downloads'),
    documents: path.join(os.homedir(), 'Documents'),
    desktop: path.join(os.homedir(), 'Desktop'),
};

export async function handler(args) {
    const { url, dest_dir = 'downloads', dest_name } = args;
    if (!url) throw new Error('missing arg: url');

    const base = DIR_MAP[dest_dir.toLowerCase()];
    if (!base) throw new Error(`unsupported_dir: ${dest_dir}`);

    const filename = dest_name || path.basename(new URL(url).pathname) || `download_${Date.now()}`;
    const filepath = path.join(base, filename);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`http_${res.status}`);

    await pipeline(res.body, createWriteStream(filepath));
    const stat = await fs.stat(filepath);

    return {
        ok: true,
        data: { filename, path: filepath, size: stat.size },
        artifacts: [],
        error: null,
    };
}
