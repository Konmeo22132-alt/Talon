import TelegramBot from 'node-telegram-bot-api';
import config from '../config.js';
import { plan, planNext, addToHistory, summarizeResult } from '../planner/groqClient.js';
import { initActions, executeAction } from '../actions/registry.js';
import * as controlMode from './controlMode.js';
import fs from 'fs/promises';

let bot;
const MAX_STEPS = 6;

const THINKING_PHRASES = [
    'De minh xem nao...',
    'Minh dang suy nghi...',
    'Cho minh mot chut nhe...',
    'Hmm, de minh tim hieu...',
    'Minh dang xu ly...',
    'Doi minh chut...',
    'De minh kiem tra nhe...',
];

function randomThinking() {
    return THINKING_PHRASES[Math.floor(Math.random() * THINKING_PHRASES.length)];
}

function isOwner(msg) {
    return msg.from?.id === config.telegram.ownerId;
}

async function editStatus(chatId, messageId, text) {
    try {
        await bot.editMessageText(text, { chat_id: chatId, message_id: messageId });
    } catch { /* message unchanged */ }
}

async function handleMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text?.trim();

    if (!isOwner(msg)) {
        console.log('[bot] rejected user %d', msg.from?.id);
        return;
    }

    if (msg.document || msg.photo) {
        addToHistory('user', '[Nguoi dung gui file/anh]');
        await bot.sendMessage(chatId, 'Minh nhan duoc file roi. Ban muon minh lam gi voi no?');
        return;
    }

    if (!text) return;

    const statusMsg = await bot.sendMessage(chatId, randomThinking());
    const msgId = statusMsg.message_id;

    try {
        const result = await plan(text);
        console.log('[bot] plan: mode=%s action=%s confidence=%s',
            result.mode, result.action?.type || 'none', result.confidence);

        switch (result.mode) {
            case 'answer':
            case 'clarify':
                await editStatus(chatId, msgId, result.answer || '...');
                break;

            case 'action':
                if (!result.action?.type) {
                    await editStatus(chatId, msgId, 'Minh khong hieu lam. Ban noi ro hon duoc khong?');
                    break;
                }

                if (result.answer) {
                    await editStatus(chatId, msgId, result.answer);
                }
                await executeLoop(chatId, result.action.type, result.action.args, msgId);
                break;

            default:
                await editStatus(chatId, msgId, result.answer || '...');
        }
    } catch (err) {
        console.error('[bot] error: %s', err.message);
        await editStatus(chatId, msgId, 'Oi, co loi xay ra roi. Ban thu lai nhe!');
    }
}

function detectMissingTool(result) {
    if (result.ok) return null;
    const detail = (result.error?.detail || '').toLowerCase();
    const stdout = (result.data?.stdout || '').toLowerCase();
    const stderr = (result.data?.stderr || '').toLowerCase();
    const combined = detail + stdout + stderr;

    const patterns = [
        /is not recognized as an internal/,
        /not recognized/,
        /is not a recognized/,
        /command not found/,
        /'(\S+)' is not recognized/,
        /no module named (\S+)/,
    ];

    for (const p of patterns) {
        if (p.test(combined)) return true;
    }
    return false;
}

async function executeLoop(chatId, actionType, args, statusMsgId) {
    const context = {
        controlMode: {
            activate: () => {
                controlMode.activate(chatId);
                controlMode.sendControlFrame(bot, chatId);
            },
            deactivate: () => controlMode.deactivate(),
        },
    };

    let currentType = actionType;
    let currentArgs = args;

    for (let step = 0; step < MAX_STEPS; step++) {
        console.log('[bot] executing %s', currentType);
        await bot.sendChatAction(chatId, 'typing');

        const result = await executeAction(currentType, currentArgs, context);

        if (currentType === 'run_command' && detectMissingTool(result)) {
            const cmd = currentArgs.command || '';
            const toolName = cmd.split(/\s+/)[0];
            console.log('[bot] tool not found: %s, attempting pip install', toolName);
            await bot.sendChatAction(chatId, 'typing');

            const installResult = await executeAction('run_command', {
                command: `pip install ${toolName}`,
                timeout: 60000,
            }, context);

            if (installResult.ok) {
                console.log('[bot] installed %s, retrying command', toolName);
                const retryResult = await executeAction(currentType, currentArgs, context);
                if (retryResult.ok) {
                    await handleStepResult(chatId, statusMsgId, currentType, retryResult, context, step);
                    return;
                }
            }
        }

        for (const artifact of result.artifacts || []) {
            if (artifact.kind === 'image') {
                try {
                    const buffer = await fs.readFile(artifact.path);
                    await bot.sendPhoto(chatId, buffer);
                } catch (err) {
                    console.error('[bot] artifact send failed: %s', err.message);
                }
            }
        }

        if (currentType === 'serp_search' && result.ok) {
            const imgUrl = result.data?.result?.image
                || result.data?.results?.[0]?.image;
            if (imgUrl) {
                try {
                    await bot.sendPhoto(chatId, imgUrl);
                } catch {
                    try {
                        const imgRes = await fetch(imgUrl, { signal: AbortSignal.timeout(10000) });
                        if (imgRes.ok) {
                            const arrBuf = await imgRes.arrayBuffer();
                            await bot.sendPhoto(chatId, Buffer.from(arrBuf));
                        }
                    } catch (err) {
                        console.error('[bot] image send failed: %s', err.message);
                    }
                }
            }
        }

        const silent = ['screenshot', 'control_mode_on', 'control_mode_off'];
        if (silent.includes(currentType)) {
            addToHistory('assistant', `[${currentType} xong]`);
            return;
        }

        await bot.sendChatAction(chatId, 'typing');
        const next = await planNext(currentType, result);
        console.log('[bot] next: mode=%s action=%s', next.mode, next.action?.type || 'none');

        if (next.mode === 'action' && next.action?.type) {
            if (next.answer) {
                await editStatus(chatId, statusMsgId, next.answer);
            }
            currentType = next.action.type;
            currentArgs = next.action.args;
            continue;
        }

        const finalText = next.answer || await summarizeResult(currentType, result);
        await editStatus(chatId, statusMsgId, finalText);
        addToHistory('assistant', `[Ket qua: ${finalText.slice(0, 200)}]`);
        return;
    }

    await editStatus(chatId, statusMsgId, 'Minh da tim het nhung thong tin co the. Hy vong giup duoc ban!');
}

async function handleStepResult(chatId, statusMsgId, actionType, result, context, step) {
    for (const artifact of result.artifacts || []) {
        if (artifact.kind === 'image') {
            try {
                const buffer = await fs.readFile(artifact.path);
                await bot.sendPhoto(chatId, buffer);
            } catch { /* skip */ }
        }
    }

    await bot.sendChatAction(chatId, 'typing');
    const next = await planNext(actionType, result);

    if (next.mode === 'action' && next.action?.type) {
        return;
    }

    const finalText = next.answer || await summarizeResult(actionType, result);
    await editStatus(chatId, statusMsgId, finalText);
    addToHistory('assistant', `[Ket qua: ${finalText.slice(0, 200)}]`);
}

export async function startBot() {
    await initActions();

    bot = new TelegramBot(config.telegram.token, { polling: true });

    controlMode.setupControlCallbacks(bot);

    bot.on('message', handleMessage);

    bot.on('polling_error', (err) => {
        console.error('[bot] polling error: %s', err.message);
    });

    console.log('[bot] online, waiting for messages');
}
