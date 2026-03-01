import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const type = 'get_file_list';

const DIR_MAP = {
    downloads: path.join(os.homedir(), 'Downloads'),
    documents: path.join(os.homedir(), 'Documents'),
    desktop: path.join(os.homedir(), 'Desktop'),
};

export async function handler(args) {
    const { directory = 'downloads', limit = 50 } = args;

    const base = DIR_MAP[directory.toLowerCase()];
    if (!base) {
        throw new Error(`unsupported_dir: ${directory}`);
    }

    const entries = await fs.readdir(base, { withFileTypes: true });

    const files = await Promise.all(
        entries.slice(0, limit).map(async (entry) => {
            const fullPath = path.join(base, entry.name);
            try {
                const stat = await fs.stat(fullPath);
                return {
                    name: entry.name,
                    isDir: entry.isDirectory(),
                    size: stat.size,
                    modified: stat.mtime.toISOString(),
                };
            } catch {
                return { name: entry.name, isDir: entry.isDirectory(), size: 0, modified: null };
            }
        })
    );

    return {
        ok: true,
        data: { directory, count: files.length, files },
        artifacts: [],
        error: null,
    };
}
