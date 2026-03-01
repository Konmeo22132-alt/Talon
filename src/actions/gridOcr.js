import screenshotDesktop from 'screenshot-desktop';
import sharp from 'sharp';
import Tesseract from 'tesseract.js';
import { parseRegion } from '../grid/parser.js';
import { regionToPixels } from '../grid/converter.js';

export const type = 'grid_ocr';

export async function handler(args) {
    const { region, lang = 'eng', psm = 6 } = args;
    if (!region) throw new Error('missing arg: region');

    const parsed = parseRegion(region);
    const pixels = await regionToPixels(parsed);

    const buffer = await screenshotDesktop({ format: 'png' });
    const cropped = await sharp(buffer)
        .extract({
            left: pixels.x,
            top: pixels.y,
            width: pixels.width,
            height: pixels.height,
        })
        .png()
        .toBuffer();

    const result = await Tesseract.recognize(cropped, lang, {
        tessedit_pageseg_mode: String(psm),
    });

    return {
        ok: true,
        data: { region, text: result.data.text.trim(), confidence: result.data.confidence },
        artifacts: [],
        error: null,
    };
}
