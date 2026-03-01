import screenshotDesktop from 'screenshot-desktop';
import path from 'path';
import fs from 'fs/promises';
import config from '../config.js';
import { drawGridOverlay } from '../grid/overlay.js';

export const type = 'screenshot';

export async function handler() {
    const buffer = await screenshotDesktop({ format: 'png' });
    const withGrid = await drawGridOverlay(buffer);

    const filename = `screenshot_${Date.now()}.png`;
    const filepath = path.join(config.paths.data, filename);
    await fs.writeFile(filepath, withGrid);

    return {
        ok: true,
        data: { filename },
        artifacts: [{ kind: 'image', path: filepath }],
        error: null,
    };
}
