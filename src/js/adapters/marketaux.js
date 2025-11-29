import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class MarketauxProvider extends NewsProvider {
    constructor() {
        super('marketaux');
    }

    async fetch(query, options = {}) {
        const {
            page = 1,
            language,
            sortBy, // Marketaux doesn't support sorting in free tier easily, but we'll check
            pageSize, // Marketaux uses 'limit'
            domains,
            excludeDomains
        } = options;

        const params = new URLSearchParams();
        params.append('q', query); // Proxy maps 'q' to 'search'
        params.append('page', page);
        params.append('provider', 'marketaux');

        if (language) params.append('language', language);
        if (pageSize) params.append('limit', pageSize);
        if (domains) params.append('domains', domains);
        if (excludeDomains) params.append('exclude_domains', excludeDomains);

        // Sorting: Marketaux documentation is sparse on sorting for free tier, 
        // but typically financial APIs sort by published_at or relevance.
        // We'll leave it default for now.

        const url = '/api/proxy';
        const data = await fetchWithRetry(`${url}?${params.toString()}`);

        if (data.error) {
            throw new Error(data.error.message || 'Marketaux Error');
        }

        // Check for meta/data structure
        if (!data.data) {
            if (data.status === 'error') throw new Error(data.message);
            return { totalResults: 0, articles: [] };
        }

        return {
            totalResults: data.meta ? data.meta.found : 0,
            articles: (data.data || []).map(article => this.normalize(article))
        };
    }

    normalize(item) {
        return super.normalize({
            source: { name: item.source || 'Marketaux' },
            author: null,
            title: item.title,
            description: item.description || item.snippet,
            url: item.url,
            urlToImage: item.image_url,
            publishedAt: item.published_at,
            content: item.snippet
        });
    }
}
