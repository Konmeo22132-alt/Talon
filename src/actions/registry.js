import { fileURLToPath } from 'url';
import { readdir } from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const handlers = new Map();

async function loadActions() {
    const files = await readdir(__dirname);

    for (const file of files) {
        if (file === 'registry.js' || !file.endsWith('.js')) continue;

        try {
            const mod = await import(`./${file}`);
            if (mod.type && typeof mod.handler === 'function') {
                handlers.set(mod.type, mod.handler);
            }
        } catch (err) {
            console.error('[actions] failed to load %s: %s', file, err.message);
        }
    }

    console.log('[actions] loaded: %s', [...handlers.keys()].join(', '));
}

export async function initActions() {
    await loadActions();
}

export async function executeAction(type, args = {}, context = {}) {
    const handler = handlers.get(type);

    if (!handler) {
        return {
            ok: false,
            data: null,
            artifacts: [],
            error: { code: 'UNKNOWN_ACTION', detail: type },
        };
    }

    try {
        return await handler(args, context);
    } catch (err) {
        console.error('[actions] %s failed: %s', type, err.message);
        return {
            ok: false,
            data: null,
            artifacts: [],
            error: { code: 'EXEC_ERROR', detail: err.message },
        };
    }
}
