import config from '../config.js';

export const type = 'web_search';

async function searchWithApi(query, limit) {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.set('engine', 'google');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', config.searchApi.key);
    url.searchParams.set('hl', 'vi');
    url.searchParams.set('gl', 'vn');

    const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`searchapi_http_${res.status}`);

    const data = await res.json();
    const organic = data.organic_results || [];

    return organic.slice(0, limit).map(r => ({
        title: r.title,
        url: r.link,
        snippet: r.snippet,
    }));
}

async function searchWithDDG(query, limit) {
    const encoded = encodeURIComponent(query);

    const res = await fetch('https://html.duckduckgo.com/html/', {
        method: 'POST',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `q=${encoded}`,
        signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) throw new Error(`ddg_http_${res.status}`);

    const html = await res.text();
    const results = [];
    const regex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

    let match;
    while ((match = regex.exec(html)) !== null && results.length < limit) {
        const href = match[1];
        const title = match[2].replace(/<[^>]+>/g, '').trim();

        let snippet = '';
        const sMatch = snippetRegex.exec(html);
        if (sMatch) snippet = sMatch[1].replace(/<[^>]+>/g, '').trim();

        if (title && href) {
            let cleanUrl = href;
            try {
                const u = new URL(href);
                if (u.searchParams.has('uddg')) cleanUrl = decodeURIComponent(u.searchParams.get('uddg'));
            } catch { /* keep */ }
            results.push({ title, url: cleanUrl, snippet });
        }
    }

    return results;
}

export async function handler(args) {
    const { query, limit = 5 } = args;
    if (!query) throw new Error('missing arg: query');

    let results;

    if (config.searchApi.key) {
        try {
            results = await searchWithApi(query, limit);
        } catch (err) {
            console.error('[web_search] searchapi failed: %s, falling back to ddg', err.message);
            results = await searchWithDDG(query, limit);
        }
    } else {
        results = await searchWithDDG(query, limit);
    }

    return {
        ok: true,
        data: { query, count: results.length, results },
        artifacts: [],
        error: null,
    };
}
