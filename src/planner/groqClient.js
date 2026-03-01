import Groq from 'groq-sdk';
import config from '../config.js';
import SYSTEM_PROMPT from './systemPrompt.js';

const groq = new Groq({ apiKey: config.groq.apiKey });

const DEFAULTS = {
    mode: 'answer',
    answer: null,
    action: null,
    confidence: 0.5,
    notes: null,
};

const MAX_HISTORY = 30;
const conversationHistory = [];

export function addToHistory(role, content) {
    conversationHistory.push({ role, content });
    while (conversationHistory.length > MAX_HISTORY) {
        conversationHistory.shift();
    }
}

export function getHistory() {
    return [...conversationHistory];
}

async function callGroq(messages, temperature = 0.4, maxTokens = 1024) {
    const completion = await groq.chat.completions.create({
        model: config.groq.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
    });
    return completion.choices[0]?.message?.content || '{}';
}

export async function plan(userMessage) {
    addToHistory('user', userMessage);

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
    ];

    const raw = await callGroq(messages);

    try {
        const parsed = JSON.parse(raw);
        const result = { ...DEFAULTS, ...parsed };
        addToHistory('assistant', raw);
        return result;
    } catch (err) {
        console.error('[planner] parse error: %s', err.message);
        const fallback = {
            ...DEFAULTS,
            answer: 'Xin loi, minh gap loi khi xu ly. Ban thu lai nhe!',
            confidence: 0,
        };
        addToHistory('assistant', JSON.stringify(fallback));
        return fallback;
    }
}

export async function planNext(actionType, actionResult) {
    const resultSummary = JSON.stringify(actionResult.data || {}, null, 0).slice(0, 2000);
    const status = actionResult.ok ? 'thanh_cong' : 'that_bai';
    const errorDetail = actionResult.error?.detail || '';

    const resultMsg = `[KET QUA ACTION: ${actionType}]
Trang thai: ${status}${errorDetail ? `\nLoi: ${errorDetail}` : ''}
Du lieu tra ve:
${resultSummary}

BAT BUOC: Neu du lieu da du de tra loi nguoi dung, hay tra mode "answer" voi cau tra loi DAY DU bang tieng Viet, BAO GOM du lieu cu the tu tren.
Neu can them thong tin, tra mode "action" voi action tiep theo.
KHONG DUOC tra loi chung chung. PHAI trinh bay du lieu cu the.`;

    addToHistory('assistant', `[Dang thuc hien ${actionType}...]`);
    addToHistory('user', resultMsg);

    const messages = [
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
    ];

    const raw = await callGroq(messages, 0.4, 2048);

    try {
        const parsed = JSON.parse(raw);
        const result = { ...DEFAULTS, ...parsed };
        addToHistory('assistant', raw);
        return result;
    } catch {
        return { ...DEFAULTS, answer: 'Xong roi!' };
    }
}

export async function summarizeResult(actionType, result) {
    const dataStr = JSON.stringify(result.data || {}, null, 0).slice(0, 1200);
    const status = result.ok ? 'thanh_cong' : 'that_bai';
    const errorDetail = result.error?.detail || '';

    const prompt = `Action: ${actionType}
Status: ${status}
${errorDetail ? `Error: ${errorDetail}` : ''}
Data: ${dataStr}

Hay tao cau tra loi tieng Viet tu nhien, than thien. Trinh bay ket qua cu the neu co. Chi tra JSON: { "answer": "..." }`;

    try {
        const raw = await callGroq([
            { role: 'system', content: 'Ban la Talon. Chi tra JSON: { "answer": "..." }. Tieng Viet tu nhien.' },
            { role: 'user', content: prompt },
        ], 0.5);
        const parsed = JSON.parse(raw);
        return parsed.answer || 'Xong roi!';
    } catch {
        return result.ok ? 'Xong roi!' : `Loi: ${errorDetail || 'khong ro'}`;
    }
}
