import { parseRegion } from '../grid/parser.js';
import { regionToPixels } from '../grid/converter.js';
import * as mouse from '../utils/mouse.js';

export const type = 'grid_click';

export async function handler(args) {
    const { region, ratio, button = 'left' } = args;
    if (!region) throw new Error('missing arg: region');

    const parsed = parseRegion(region);
    const pixels = await regionToPixels(parsed, ratio);

    await mouse.click(button, pixels.clickX, pixels.clickY);

    return {
        ok: true,
        data: { region, x: pixels.clickX, y: pixels.clickY, button },
        artifacts: [],
        error: null,
    };
}
