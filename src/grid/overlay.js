import sharp from 'sharp';
import config from '../config.js';
import { colLetter } from './parser.js';

export async function drawGridOverlay(imageBuffer) {
    const meta = await sharp(imageBuffer).metadata();
    const { width, height } = meta;
    const cellW = width / config.grid.cols;
    const cellH = height / config.grid.rows;

    const parts = [];

    for (let c = 0; c <= config.grid.cols; c++) {
        const x = Math.round(c * cellW);
        parts.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="rgba(0,255,0,0.45)" stroke-width="1"/>`);
        if (c < config.grid.cols) {
            parts.push(`<text x="${Math.round(c * cellW + cellW / 2)}" y="14" text-anchor="middle" fill="#0f0" font-size="11" font-family="Consolas,monospace">${colLetter(c)}</text>`);
        }
    }

    for (let r = 0; r <= config.grid.rows; r++) {
        const y = Math.round(r * cellH);
        parts.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="rgba(0,255,0,0.45)" stroke-width="1"/>`);
        if (r < config.grid.rows) {
            parts.push(`<text x="3" y="${Math.round(r * cellH + cellH / 2 + 4)}" fill="#0f0" font-size="10" font-family="Consolas,monospace">${r + 1}</text>`);
        }
    }

    const svg = Buffer.from(
        `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${parts.join('')}</svg>`
    );

    return sharp(imageBuffer)
        .composite([{ input: svg, top: 0, left: 0 }])
        .png()
        .toBuffer();
}
