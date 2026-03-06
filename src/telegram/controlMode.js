import * as mouse from '../utils/mouse.js';
import screenshotDesktop from 'screenshot-desktop';
import sharp from 'sharp';
import { drawGridOverlay } from '../grid/overlay.js';

const MOVE_PX = 40;

const state = {
    active: false,
    chatId: null,
    lastMsgId: null,
};

export function isActive() {
    return state.active;
}

export function activate(chatId) {
    state.active = true;
    state.chatId = chatId;
    state.lastMsgId = null;
}

export function deactivate() {
    state.active = false;
    state.chatId = null;
    state.lastMsgId = null;
}

function createCursorSvg(x, y, imgWidth, imgHeight) {
    const cx = Math.min(Math.max(x, 0), imgWidth - 1);
    const cy = Math.min(Math.max(y, 0), imgHeight - 1);

    return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${imgHeight}">
    <defs>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="1" dy="1" stdDeviation="1" flood-color="black" flood-opacity="0.5"/>
      </filter>
    </defs>
    <g transform="translate(${cx},${cy})" filter="url(#shadow)">
      <path d="M 0,0 L 0,21 L 5,16 L 10,24 L 13,22 L 8,14 L 14,14 Z"
            fill="white" stroke="black" stroke-width="1.2"/>
    </g>
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
                { text: '\u2B06', callback_data: 'ctrl:move_up' },
            ],
            [
                { text: '\u2B05', callback_data: 'ctrl:move_left' },
                { text: '\uD83D\uDDB1', callback_data: 'ctrl:click' },
                { text: '\u27A1', callback_data: 'ctrl:move_right' },
            ],
            [
                { text: '\u2B07', callback_data: 'ctrl:move_down' },
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

async function deleteOldMessage(bot, chatId) {
    if (state.lastMsgId) {
        await bot.deleteMessage(chatId, state.lastMsgId).catch(() => { });
        state.lastMsgId = null;
    }
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
            await bot.deleteMessage(chatId, messageId).catch(() => { });
            return;
    }

    await bot.answerCallbackQuery(callbackQuery.id);

    const newPos = await mouse.getPosition();
    const frame = await captureFrame(newPos.x, newPos.y);

    await bot.deleteMessage(chatId, messageId).catch(() => { });

    const sent = await bot.sendPhoto(chatId, frame, {
        caption: `(${newPos.x}, ${newPos.y})`,
        reply_markup: buildKeyboard(),
    });
    state.lastMsgId = sent.message_id;
}

export async function sendControlFrame(bot, chatId) {
    await deleteOldMessage(bot, chatId);
    const pos = await mouse.getPosition();
    const frame = await captureFrame(pos.x, pos.y);
    const sent = await bot.sendPhoto(chatId, frame, {
        caption: `Che do dieu khien (${pos.x}, ${pos.y})`,
        reply_markup: buildKeyboard(),
    });
    state.lastMsgId = sent.message_id;
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
