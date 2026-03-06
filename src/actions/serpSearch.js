import config from '../config.js';

export const type = 'serp_search';

const ENGINE_MAP = {
    web: 'google',
    images: 'google_images',
    news: 'google_news',
    videos: 'google_videos',
    shopping: 'google_shopping',
};

const imageCache = {
    query: null,
    results: [],
    index: 0,
};

function extractResults(data, searchType, limit) {
    switch (searchType) {
        case 'images':
            return (data.images_results || []).slice(0, limit).map(r => ({
                title: r.title,
                image: r.original,
                thumbnail: r.thumbnail,
                source: r.source,
            }));

        case 'news':
            return (data.news_results || []).slice(0, limit).map(r => ({
                title: r.title,
                url: r.link,
                source: r.source,
                date: r.date,
                snippet: r.snippet,
            }));

        case 'videos':
            return (data.video_results || []).slice(0, limit).map(r => ({
                title: r.title,
                url: r.link,
                thumbnail: r.thumbnail,
                channel: r.channel,
            }));

        case 'shopping':
            return (data.shopping_results || []).slice(0, limit).map(r => ({
                title: r.title,
                price: r.price,
                url: r.link,
                source: r.source,
            }));

        default:
            return (data.organic_results || []).slice(0, limit).map(r => ({
                title: r.title,
                url: r.link,
                snippet: r.snippet,
            }));
    }
}

export async function handler(args) {
    const { query, type: searchType = 'web', limit = 10, hl = 'vi', gl = 'vn', next = false } = args;
    if (!query) throw new Error('missing arg: query');

    if (searchType === 'images' && next && imageCache.query === query && imageCache.results.length > 0) {
        imageCache.index = (imageCache.index + 1) % imageCache.results.length;
        const picked = imageCache.results[imageCache.index];
        return {
            ok: true,
            data: {
                query,
                type: 'images',
                current: imageCache.index + 1,
                total: imageCache.results.length,
                result: picked,
            },
            artifacts: [],
            error: null,
        };
    }

    if (!config.serpApi.key) {
        throw new Error('SERPAPI_API_KEY chua duoc cau hinh. Them vao .env de su dung serp_search.');
    }

    const engine = ENGINE_MAP[searchType] || 'google';

    const url = new URL('https://serpapi.com/search.json');
    url.searchParams.set('api_key', config.serpApi.key);
    url.searchParams.set('engine', engine);
    url.searchParams.set('q', query);
    url.searchParams.set('hl', hl);
    url.searchParams.set('gl', gl);

    const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) throw new Error(`serpapi_http_${res.status}`);

    const data = await res.json();
    const results = extractResults(data, searchType, limit);

    if (searchType === 'images' && results.length > 0) {
        imageCache.query = query;
        imageCache.results = results;
        imageCache.index = 0;

        return {
            ok: true,
            data: {
                query,
                type: 'images',
                current: 1,
                total: results.length,
                result: results[0],
            },
            artifacts: [],
            error: null,
        };
    }

    return {
        ok: true,
        data: { query, type: searchType, count: results.length, results },
        artifacts: [],
        error: null,
    };
}
