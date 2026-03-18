/**
 * Shared proxy URL-building logic used by both:
 *   - api/proxy.js  (Vercel Edge Function, uses process.env)
 *   - vite.config.js (local dev middleware, uses loadEnv result)
 *
 * @param {URLSearchParams} searchParams - Incoming request search params
 * @param {function(string): string|undefined} getEnv - Env var getter, e.g. key => process.env[key]
 * @returns {{ apiUrl: URL|null, errorMessage: string|null }}
 */
export function buildProxyUrl(searchParams, getEnv) {
    const provider = searchParams.get('provider') || 'newsapi';

    if (provider === 'newsdata') {
        const apiKey = getEnv('NEWSDATA_KEY');
        if (!apiKey) return { apiUrl: null, errorMessage: 'Server configuration error: NewsData API Key missing' };

        const apiUrl = new URL('https://newsdata.io/api/1/news');
        searchParams.forEach((value, key) => {
            if (key !== 'apiKey' && key !== 'provider' && value) {
                // NewsData free tier limit is 10
                apiUrl.searchParams.append(key, key === 'size' && parseInt(value) > 10 ? '10' : value);
            }
        });
        apiUrl.searchParams.append('apikey', apiKey);
        return { apiUrl, errorMessage: null };
    }

    if (provider === 'gnews') {
        const apiKey = getEnv('GNEWS_API_KEY');
        if (!apiKey) return { apiUrl: null, errorMessage: 'Server configuration error: GNews API Key missing' };

        const q = searchParams.get('q');
        const apiUrl = new URL(q ? 'https://gnews.io/api/v4/search' : 'https://gnews.io/api/v4/top-headlines');
        searchParams.forEach((value, key) => {
            if (key !== 'apiKey' && key !== 'provider' && value) apiUrl.searchParams.append(key, value);
        });
        apiUrl.searchParams.append('apikey', apiKey);
        return { apiUrl, errorMessage: null };
    }

    if (provider === 'thenewsapi') {
        const apiKey = getEnv('THENEWSAPI_KEY');
        if (!apiKey) return { apiUrl: null, errorMessage: 'Server configuration error: TheNewsAPI Key missing' };

        const apiUrl = new URL('https://api.thenewsapi.com/v1/news/all');
        searchParams.forEach((value, key) => {
            if (key !== 'apiKey' && key !== 'provider' && value) {
                apiUrl.searchParams.append(key === 'q' ? 'search' : key, value);
            }
        });
        apiUrl.searchParams.append('api_token', apiKey);
        return { apiUrl, errorMessage: null };
    }

    if (provider === 'marketaux') {
        const apiKey = getEnv('MARKETAUX_API_TOKEN');
        if (!apiKey) return { apiUrl: null, errorMessage: 'Server configuration error: Marketaux API Token missing' };

        const apiUrl = new URL('https://api.marketaux.com/v1/news/all');
        searchParams.forEach((value, key) => {
            if (key !== 'apiKey' && key !== 'provider' && value) {
                apiUrl.searchParams.append(key === 'q' ? 'search' : key, value);
            }
        });
        apiUrl.searchParams.append('api_token', apiKey);
        return { apiUrl, errorMessage: null };
    }

    if (provider === 'gdelt') {
        // GDELT DOC API — free, no API key required
        const apiUrl = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
        searchParams.forEach((value, key) => {
            if (key !== 'provider' && value) apiUrl.searchParams.append(key, value);
        });
        return { apiUrl, errorMessage: null };
    }

    // Default: NewsAPI.org
    const apiKey = getEnv('NEWSAPI_KEY');
    if (!apiKey) return { apiUrl: null, errorMessage: 'Server configuration error: NewsAPI Key missing' };

    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const domains = searchParams.get('domains');

    let endpoint = 'everything';
    let excludeKeys = [];

    if (category || (!q && !domains)) {
        endpoint = 'top-headlines';
        excludeKeys = ['from', 'to', 'domains', 'excludeDomains', 'sortBy', 'searchIn'];
    } else {
        endpoint = 'everything';
        excludeKeys = ['country', 'category'];
    }

    const apiUrl = new URL(`https://newsapi.org/v2/${endpoint}`);
    searchParams.forEach((value, key) => {
        if (key !== 'provider' && key !== 'apiKey' && value && !excludeKeys.includes(key)) {
            apiUrl.searchParams.append(key, value);
        }
    });
    apiUrl.searchParams.append('apiKey', apiKey);
    return { apiUrl, errorMessage: null };
}
