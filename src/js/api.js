import { els } from './ui.js';

export async function fetchWithRetry(url, retries = 3, backoff = 300) {
    try {
        const response = await fetch(url);

        // Handle HTTP errors explicitly
        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                throw new Error(`API Key Error (${response.status})`);
            }
            if (response.status === 429) {
                throw new Error('Rate limit reached. Please try again later.');
            }
            if (response.status === 426) {
                throw new Error('NewsAPI does not allow requests from the file system (file://). Please run this app on a local server (e.g. localhost).');
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        if (retries > 0 && !error.message.includes('API Key Error')) {
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(url, retries - 1, backoff * 2);
        }
        throw error;
    }
}

export async function fetchNewsApi(query, page = 1) {
    // Gather parameters
    const sortBy = els.sortByInput.value;
    const language = els.languageInput.value;
    const pageSize = els.pageSizeInput.value;
    const from = els.fromInput.value;
    const to = els.toInput.value;
    const domains = els.domainsInput.value.trim();
    const excludeDomains = els.excludeDomainsInput.value.trim();

    // Get checked "searchIn" values
    const searchIn = Array.from(document.querySelectorAll('input[name="searchIn"]:checked'))
        .map(cb => cb.value)
        .join(',');

    // Construct URL
    const params = new URLSearchParams();
    params.append('q', query);
    params.append('page', page);

    let url = '/api/proxy';
    params.append('provider', 'newsapi');

    if (sortBy) params.append('sortBy', sortBy);
    if (language) params.append('language', language);
    if (pageSize) params.append('pageSize', pageSize);
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (domains) params.append('domains', domains);
    if (excludeDomains) params.append('excludeDomains', excludeDomains);
    if (searchIn && searchIn !== 'title,description,content') params.append('searchIn', searchIn);

    const data = await fetchWithRetry(`${url}?${params.toString()}`);

    if (data.status === 'error') {
        throw new Error(data.message || 'API Error');
    }

    return data;
}

export async function fetchNewsData(query) {
    // NewsData.io mapping
    const language = els.languageInput.value;
    const sortBy = els.sortByInput.value;
    // NewsData uses 'size' instead of 'pageSize', max 50 for paid, 10 for free. We'll request what user asked but it might be capped.
    // NewsData domains are 'domain' parameter.
    const domains = els.domainsInput.value.trim();
    const excludeDomains = els.excludeDomainsInput.value.trim();

    const params = new URLSearchParams();
    params.append('q', query); // 'q' is same
    // params.append('full_content', '1'); // Removed: Paid-only feature causing 422 on free plans

    let url = '/api/proxy';
    params.append('provider', 'newsdata');

    if (language) params.append('language', language);
    if (domains) params.append('domain', domains);
    if (excludeDomains) params.append('excludedomain', excludeDomains);

    // Sorting Mapping
    // NewsData supports: pubdateasc, relevancy, source. Default is newest (pubdatedesc equivalent).
    if (sortBy === 'relevancy' || sortBy === 'popularity') {
        params.append('sort', 'relevancy');
    }
    // If sortBy is 'publishedAt' (Newest), we do nothing as it's the default.

    const data = await fetchWithRetry(`${url}?${params.toString()}`);

    if (data.status === 'error') {
        throw new Error(data.results?.message || data.message || 'API Error');
    }

    // Normalize to NewsAPI format
    return {
        status: 'ok',
        totalResults: data.totalResults,
        articles: (data.results || []).map(item => ({
            source: { name: item.source_id || 'NewsData' },
            author: item.creator ? item.creator[0] : null,
            title: item.title,
            description: item.description,
            url: item.link,
            urlToImage: item.image_url,
            publishedAt: item.pubDate,
            content: item.content
        }))
    };
}

export async function fetchGNews(query, page = 1) {
    // GNews mapping
    const language = els.languageInput.value;
    const sortBy = els.sortByInput.value;
    // GNews uses 'max' for page size (default 10, max 100)
    const pageSize = els.pageSizeInput.value;
    // GNews uses 'from' and 'to' in ISO 8601 format (e.g. 2022-08-21T16:27:09Z)
    const from = els.fromInput.value;
    const to = els.toInput.value;
    // GNews uses 'in' to specify where to search (title, description, content)

    const params = new URLSearchParams();
    params.append('q', query);
    params.append('page', page);

    let url = '/api/proxy';
    params.append('provider', 'gnews');

    if (language) params.append('lang', language);
    if (pageSize) params.append('max', pageSize);

    // Date formatting if needed. GNews takes "2023-01-01T00:00:00Z"
    if (from) {
        params.append('from', new Date(from).toISOString());
    } else {
        // GNews Free Plan limit: 1 month. Default to 1 month ago to avoid "historical data" errors with relevance sort.
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        params.append('from', oneMonthAgo.toISOString());
    }

    if (to) params.append('to', new Date(to).toISOString());

    // Sort mapping
    // GNews supports: publishedAt (default), relevance
    if (sortBy === 'relevancy' || sortBy === 'popularity') {
        params.append('sortby', 'relevance');
    } else {
        params.append('sortby', 'publishedAt');
    }

    console.log('Fetching GNews with params:', params.toString());

    const data = await fetchWithRetry(`${url}?${params.toString()}`);

    console.log('GNews Raw Response:', data);

    if (data.errors) {
        const msg = Array.isArray(data.errors) ? data.errors[0] : 'GNews API Error';
        throw new Error(msg);
    }

    if (data.status === 'error') {
        const msg = data.message || 'API Error';
        throw new Error(msg);
    }

    // Normalize to NewsAPI format
    return {
        status: 'ok',
        totalResults: data.totalArticles,
        articles: (data.articles || []).map(item => ({
            source: { name: (item.source && item.source.name) || 'GNews' },
            author: null, // GNews doesn't always provide author in the same way
            title: item.title,
            description: item.description,
            url: item.url,
            urlToImage: item.image,
            publishedAt: item.publishedAt,
            content: item.content
        }))
    };
}
