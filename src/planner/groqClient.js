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
    const dataSlice = JSON.stringify(actionResult.data || {}, null, 0).slice(0, 800);
    const status = actionResult.ok ? 'ok' : 'fail';
    const errorDetail = actionResult.error?.detail || '';

    const msg = `[${actionType} => ${status}] ${errorDetail ? `Loi: ${errorDetail}` : ''} Data: ${dataSlice}
Can them action nua khong? Neu du thong tin, tra mode "answer" (answer=null). Neu can them, tra mode "action".`;

    addToHistory('assistant', `[thuc hien ${actionType}]`);
    addToHistory('user', msg);

    const raw = await callGroq([
        { role: 'system', content: SYSTEM_PROMPT },
        ...conversationHistory,
    ], 0.3, 512);

    try {
        const parsed = JSON.parse(raw);
        addToHistory('assistant', raw);
        return { ...DEFAULTS, ...parsed };
    } catch {
        return { ...DEFAULTS, mode: 'answer', answer: null };
    }
}

function buildDataFallback(actionType, result) {
    const d = result.data || {};

    if (!result.ok) {
        return `Co loi khi thuc hien ${actionType}: ${result.error?.detail || 'khong ro nguyen nhan'}`;
    }

    switch (actionType) {
        case 'grid_ocr':
            return d.text
                ? `Van ban doc duoc (do chinh xac ${Math.round(d.confidence || 0)}%):\n${d.text}`
                : 'Khong doc duoc van ban nao tu vung nay.';

        case 'get_file_list':
            if (!d.files?.length) return `Thu muc ${d.directory || ''} trong.`;
            return `${d.count || d.files.length} file trong ${d.directory || ''}:\n${d.files.map(f => `- ${f.name || f}`).join('\n')}`;

        case 'detect_env':
            return Object.entries(d).map(([k, v]) => `${k}: ${v || 'khong tim thay'}`).join('\n');

        case 'web_search':
        case 'serp_search':
            if (!d.results?.length) return `Khong tim thay ket qua cho "${d.query || ''}"`;
            return `Ket qua tim kiem "${d.query || ''}":\n${d.results.map((r, i) =>
                `${i + 1}. ${r.title}${r.url ? ` - ${r.url}` : ''}${r.snippet ? `\n   ${r.snippet}` : ''}`
            ).join('\n')}`;

        case 'fetch_url':
            return d.content
                ? `Noi dung tu ${d.url || 'trang web'}:\n${d.content.slice(0, 1500)}`
                : `Da doc ${d.url || 'trang web'} nhung khong lay duoc noi dung.`;

        case 'run_command':
            return d.stdout || d.stderr || `Da chay: ${d.command || ''}`;

        case 'open_app':
            return `Da mo ${d.name || 'ung dung'}.`;
        case 'open_browser':
            return `Da mo trinh duyet voi ${d.url || 'url'}.`;
        case 'grid_click':
            return `Da click vao vung ${d.region || ''}.`;
        case 'type_text':
            return `Da nhap "${d.text || ''}".`;
        case 'download_file':
            return `Da tai ${d.filename || 'file'} ve ${d.dest || ''}.`;
        case 'move_file':
            return `Da di chuyen ${d.filename || 'file'}.`;
        case 'install_package':
            return `Da cai dat ${d.name || 'package'}.`;

        default:
            return JSON.stringify(d, null, 2).slice(0, 500);
    }
}

export async function summarizeResult(actionType, result) {
    const fallbackText = buildDataFallback(actionType, result);

    const prompt = `Bạn là Talon. Viết lại nội dung bên dưới thành câu tiếng Việt CÓ DẤU, tự nhiên, thân thiện. Giữ nguyên TOÀN BỘ dữ liệu, KHÔNG bỏ thông tin nào.

Nội dung gốc:
${fallbackText}

Trả JSON: { "answer": "câu viết lại có dấu" }`;

    try {
        const raw = await callGroq([
            { role: 'system', content: 'Viết lại thành tiếng Việt CÓ DẤU tự nhiên. Giữ TOÀN BỘ dữ liệu. Trả JSON: { "answer": "..." }' },
            { role: 'user', content: prompt },
        ], 0.6, 2048);
        const parsed = JSON.parse(raw);
        if (parsed.answer && parsed.answer.length > 10) {
            return parsed.answer;
        }
    } catch (err) {
        console.error('[summarize] groq error: %s', err.message);
    }

    return fallbackText;
}
