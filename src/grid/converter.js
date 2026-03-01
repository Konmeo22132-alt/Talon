import config from '../config.js';
import screenshot from 'screenshot-desktop';
import sharp from 'sharp';

let screenDimensions = null;

export async function getScreenDimensions() {
    if (screenDimensions) return screenDimensions;

    const buffer = await screenshot({ format: 'png' });
    const meta = await sharp(buffer).metadata();
    screenDimensions = { width: meta.width, height: meta.height };
    return screenDimensions;
}

export function resetDimensionCache() {
    screenDimensions = null;
}

export async function regionToPixels(region, ratio = {}) {
    const { width, height } = await getScreenDimensions();
    const cellW = width / config.grid.cols;
    const cellH = height / config.grid.rows;

    const x = Math.round(region.startCol * cellW);
    const y = Math.round(region.startRow * cellH);
    const endX = Math.round((region.endCol + 1) * cellW);
    const endY = Math.round((region.endRow + 1) * cellH);
    const w = endX - x;
    const h = endY - y;

    const rx = typeof ratio.x === 'number' ? ratio.x : 0.5;
    const ry = typeof ratio.y === 'number' ? ratio.y : 0.5;

    return {
        x, y, width: w, height: h,
        clickX: Math.round(x + w * rx),
        clickY: Math.round(y + h * ry),
    };
}
