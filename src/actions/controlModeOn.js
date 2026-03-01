export const type = 'control_mode_on';

export async function handler(_args, context) {
    if (context?.controlMode) {
        context.controlMode.activate();
    }
    return { ok: true, data: {}, artifacts: [], error: null };
}
