export const type = 'fetch_url';

async function fetchWithJina(url, maxLength) {
    const jinaUrl = `https://r.jina.ai/${url}`;

    const res = await fetch(jinaUrl, {
        headers: {
            'Accept': 'text/plain',
            'User-Agent': 'TalonBot/1.0',
        },
        signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) throw new Error(`jina_http_${res.status}`);

    const text = await res.text();
    return text.slice(0, maxLength);
}

async function fetchDirect(url, maxLength) {
    const res = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/json,text/plain,*/*',
        },
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`http_${res.status}`);

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        const json = await res.json();
        return { type: 'json', content: JSON.stringify(json, null, 2).slice(0, maxLength), title: '', description: '' };
    }

    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const metaDesc = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i);
    const description = metaDesc ? metaDesc[1].trim() : '';

    const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<nav[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer[\s\S]*?<\/footer>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);

    return { type: 'html', content: text, title, description };
}

export async function handler(args) {
    const { url, max_length = 3000 } = args;
    if (!url) throw new Error('missing arg: url');

    let content;

    try {
        const text = await fetchWithJina(url, max_length);
        content = { type: 'jina', content: text, title: '', description: '' };
    } catch (err) {
        console.error('[fetch_url] jina failed: %s, trying direct', err.message);
        content = await fetchDirect(url, max_length);
    }

    return {
        ok: true,
        data: { url, ...content },
        artifacts: [],
        error: null,
    };
}
