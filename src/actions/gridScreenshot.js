import screenshotDesktop from 'screenshot-desktop';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';
import config from '../config.js';
import { parseRegion } from '../grid/parser.js';
import { regionToPixels } from '../grid/converter.js';

export const type = 'grid_screenshot';

export async function handler(args) {
    const { region, padding = 0 } = args;
    if (!region) throw new Error('missing arg: region');

    const parsed = parseRegion(region);
    const pixels = await regionToPixels(parsed);

    const buffer = await screenshotDesktop({ format: 'png' });
    const meta = await sharp(buffer).metadata();

    const left = Math.max(0, pixels.x - padding);
    const top = Math.max(0, pixels.y - padding);
    const w = Math.min(pixels.width + padding * 2, meta.width - left);
    const h = Math.min(pixels.height + padding * 2, meta.height - top);

    const cropped = await sharp(buffer)
        .extract({ left, top, width: w, height: h })
        .png()
        .toBuffer();

    const filename = `grid_${region.replace('-', '_')}_${Date.now()}.png`;
    const filepath = path.join(config.paths.data, filename);
    await fs.writeFile(filepath, cropped);

    return {
        ok: true,
        data: { region, width: w, height: h },
        artifacts: [{ kind: 'image', path: filepath }],
        error: null,
    };
}
