import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class NewsDataProvider extends NewsProvider {
    constructor() {
        super('newsdata');
    }

    async fetch(query, options = {}) {
        const {
            language,
            sortBy,
            domains,
            excludeDomains,
            isLoadMore // NewsData pagination is tricky, skipping for load more in MVP
        } = options;

        if (isLoadMore) return { totalResults: 0, articles: [] };

        const params = new URLSearchParams();
        params.append('q', query);
        params.append('provider', 'newsdata');

        if (language) params.append('language', language);
        if (domains) params.append('domain', domains);
        if (excludeDomains) params.append('excludedomain', excludeDomains);

        // Sorting Mapping
        if (sortBy === 'relevancy' || sortBy === 'popularity') {
            params.append('sort', 'relevancy');
        }

        const url = '/api/proxy';
        const data = await fetchWithRetry(`${url}?${params.toString()}`);

        if (data.status === 'error') {
            throw new Error(data.results?.message || data.message || 'API Error');
        }

        return {
            totalResults: data.totalResults,
            articles: (data.results || []).map(article => this.normalize(article))
        };
    }

    normalize(item) {
        return super.normalize({
            source: { name: item.source_id || 'NewsData' },
            author: item.creator ? item.creator[0] : null,
            title: item.title,
            description: item.description,
            url: item.link,
            urlToImage: item.image_url,
            publishedAt: item.pubDate,
            content: item.content
        });
    }
}
