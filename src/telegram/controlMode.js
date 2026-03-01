import * as mouse from '../utils/mouse.js';
import screenshotDesktop from 'screenshot-desktop';
import sharp from 'sharp';
import { drawGridOverlay } from '../grid/overlay.js';

const MOVE_PX = 40;
const CURSOR_SIZE = 20;

const state = {
    active: false,
    chatId: null,
};

export function isActive() {
    return state.active;
}

export function activate(chatId) {
    state.active = true;
    state.chatId = chatId;
}

export function deactivate() {
    state.active = false;
    state.chatId = null;
}

function createCursorSvg(x, y, imgWidth, imgHeight) {
    const cx = Math.min(Math.max(x, 0), imgWidth);
    const cy = Math.min(Math.max(y, 0), imgHeight);
    const s = CURSOR_SIZE;

    return Buffer.from(`<svg width="${imgWidth}" height="${imgHeight}">
    <line x1="${cx}" y1="${cy - s}" x2="${cx}" y2="${cy + s}" stroke="red" stroke-width="3"/>
    <line x1="${cx - s}" y1="${cy}" x2="${cx + s}" y2="${cy}" stroke="red" stroke-width="3"/>
    <circle cx="${cx}" cy="${cy}" r="${s - 4}" fill="none" stroke="red" stroke-width="2"/>
    <circle cx="${cx}" cy="${cy}" r="3" fill="red"/>
  </svg>`);
}

async function captureFrame(cursorX, cursorY) {
    const buffer = await screenshotDesktop({ format: 'png' });
    const withGrid = await drawGridOverlay(buffer);
    const meta = await sharp(withGrid).metadata();

    const cursorSvg = createCursorSvg(cursorX, cursorY, meta.width, meta.height);

    return sharp(withGrid)
        .composite([{ input: cursorSvg, top: 0, left: 0 }])
        .png()
        .toBuffer();
}

function buildKeyboard() {
    return {
        inline_keyboard: [
            [
                { text: 'Up', callback_data: 'ctrl:move_up' },
            ],
            [
                { text: 'Left', callback_data: 'ctrl:move_left' },
                { text: 'Click', callback_data: 'ctrl:click' },
                { text: 'Right', callback_data: 'ctrl:move_right' },
            ],
            [
                { text: 'Down', callback_data: 'ctrl:move_down' },
            ],
            [
                { text: 'R-Click', callback_data: 'ctrl:rclick' },
                { text: 'Scroll+', callback_data: 'ctrl:scroll_up' },
                { text: 'Scroll-', callback_data: 'ctrl:scroll_down' },
            ],
            [
                { text: 'Thoat', callback_data: 'ctrl:exit' },
            ],
        ],
    };
}

async function handleControlCallback(bot, callbackQuery) {
    const action = callbackQuery.data.replace('ctrl:', '');
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;

    const pos = await mouse.getPosition();

    switch (action) {
        case 'move_up':
            await mouse.moveTo(pos.x, Math.max(0, pos.y - MOVE_PX));
            break;
        case 'move_down':
            await mouse.moveTo(pos.x, pos.y + MOVE_PX);
            break;
        case 'move_left':
            await mouse.moveTo(Math.max(0, pos.x - MOVE_PX), pos.y);
            break;
        case 'move_right':
            await mouse.moveTo(pos.x + MOVE_PX, pos.y);
            break;
        case 'click':
            await mouse.click('left');
            break;
        case 'rclick':
            await mouse.click('right');
            break;
        case 'scroll_up':
            await mouse.scrollWheel(3);
            break;
        case 'scroll_down':
            await mouse.scrollWheel(-3);
            break;
        case 'exit':
            deactivate();
            await bot.answerCallbackQuery(callbackQuery.id, { text: 'Da tat che do dieu khien' });
            await bot.deleteMessage(chatId, messageId);
            return;
    }

    await bot.answerCallbackQuery(callbackQuery.id);

    const newPos = await mouse.getPosition();
    const frame = await captureFrame(newPos.x, newPos.y);

    try {
        await bot.editMessageMedia(
            {
                type: 'photo',
                media: 'attach://frame',
                caption: `Chuot: (${newPos.x}, ${newPos.y})`,
            },
            { chat_id: chatId, message_id: messageId, reply_markup: buildKeyboard() },
            { frame: { value: frame, options: { filename: 'frame.png', contentType: 'image/png' } } }
        );
    } catch {
        await bot.deleteMessage(chatId, messageId).catch(() => { });
        await bot.sendPhoto(chatId, frame, {
            caption: `Chuot: (${newPos.x}, ${newPos.y})`,
            reply_markup: buildKeyboard(),
        });
    }
}

export async function sendControlFrame(bot, chatId) {
    const pos = await mouse.getPosition();
    const frame = await captureFrame(pos.x, pos.y);
    await bot.sendPhoto(chatId, frame, {
        caption: `Che do dieu khien. Chuot: (${pos.x}, ${pos.y})`,
        reply_markup: buildKeyboard(),
    });
}

export function setupControlCallbacks(bot) {
    bot.on('callback_query', async (query) => {
        if (!query.data?.startsWith('ctrl:')) return;
        if (!state.active) {
            await bot.answerCallbackQuery(query.id, { text: 'Che do dieu khien chua bat' });
            return;
        }
        try {
            await handleControlCallback(bot, query);
        } catch (err) {
            console.error('[control] callback error: %s', err.message);
            await bot.answerCallbackQuery(query.id, { text: 'Loi' }).catch(() => { });
        }
    });
}
