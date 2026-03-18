import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class TheNewsApiProvider extends NewsProvider {
    constructor() {
        super('thenewsapi');
    }

    async fetch(query, options = {}) {
        const {
            page = 1,
            language,
            country, // TheNewsAPI uses 'locale'
            sortBy,
            pageSize, // TheNewsAPI uses 'limit'
            domains,
            excludeDomains
        } = options;

        const params = new URLSearchParams();
        params.append('q', query); // Proxy maps 'q' to 'search'
        params.append('page', page);
        params.append('provider', 'thenewsapi');

        if (language) params.append('language', language);
        if (country) params.append('locale', country); // Map country to locale
        if (pageSize) params.append('limit', pageSize);
        if (domains) params.append('domains', domains);
        if (excludeDomains) params.append('exclude_domains', excludeDomains);

        // Sort mapping
        // TheNewsAPI supports: relevance, published_at, popularity
        if (sortBy === 'relevancy') {
            params.append('sort', 'relevance');
        } else if (sortBy === 'popularity') {
            params.append('sort', 'popularity');
        } else {
            params.append('sort', 'published_at');
        }

        const url = '/api/proxy';
        const data = await fetchWithRetry(`${url}?${params.toString()}`);

        if (data.error) {
            throw new Error(data.error.message || 'TheNewsAPI Error');
        }

        // Check for meta/data structure
        if (!data.data) {
            // Fallback or error if structure is unexpected
            if (data.status === 'error') throw new Error(data.message);
            return { totalResults: 0, articles: [] };
        }

        return {
            totalResults: data.meta ? data.meta.found : 0,
            articles: (data.data || []).map(article => this.normalize(article)).filter(Boolean)
        };
    }

    normalize(item) {
        if (!item || typeof item !== 'object') return null;
        return super.normalize({
            source: { name: item.source || 'TheNewsAPI' },
            author: null,
            title: item.title || 'No Title',
            description: item.description || item.snippet || null,
            url: item.url || '#',
            urlToImage: item.image_url || null,
            publishedAt: item.published_at || new Date().toISOString(),
            content: item.snippet || null
        });
    }
}
