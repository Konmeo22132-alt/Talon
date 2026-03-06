export const type = 'control_mode_off';

export async function handler(_args, context) {
    if (context?.controlMode) {
        context.controlMode.deactivate();
    }
    return { ok: true, data: {}, artifacts: [], error: null };
}
