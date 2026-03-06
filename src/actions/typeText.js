import * as mouse from '../utils/mouse.js';

export const type = 'type_text';

export async function handler(args) {
    const { text } = args;
    if (!text) throw new Error('missing arg: text');

    await mouse.typeText(text);

    return {
        ok: true,
        data: { text },
        artifacts: [],
        error: null,
    };
}
