import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const type = 'move_file';

const DIR_MAP = {
    downloads: path.join(os.homedir(), 'Downloads'),
    documents: path.join(os.homedir(), 'Documents'),
    desktop: path.join(os.homedir(), 'Desktop'),
};

export async function handler(args) {
    const { from_dir, filename, to_dir } = args;
    if (!from_dir || !filename || !to_dir) {
        throw new Error('missing args: from_dir, filename, to_dir');
    }

    const srcBase = DIR_MAP[from_dir.toLowerCase()];
    const dstBase = DIR_MAP[to_dir.toLowerCase()];
    if (!srcBase) throw new Error(`unsupported_src: ${from_dir}`);
    if (!dstBase) throw new Error(`unsupported_dst: ${to_dir}`);

    const srcPath = path.join(srcBase, filename);
    const dstPath = path.join(dstBase, filename);

    await fs.access(srcPath);
    await fs.rename(srcPath, dstPath);

    return {
        ok: true,
        data: { filename, from: from_dir, to: to_dir },
        artifacts: [],
        error: null,
    };
}
