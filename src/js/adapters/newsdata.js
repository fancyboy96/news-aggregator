import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class NewsDataProvider extends NewsProvider {
    constructor() {
        super('newsdata');
    }

    async fetch(query, options = {}) {
        const {
            page = 1,
            language,
            country, // NewsData supports 'country'
            sortBy, // NewsData doesn't support sorting in free tier easily, but we'll check
            pageSize, // NewsData uses 'size' (max 10 free)
            domains,
            excludeDomains,
            category
        } = options;

        const params = new URLSearchParams();
        params.append('q', query);
        // NewsData uses cursor-based pagination. 'page' must be a cursor string, not a number.
        // We cannot use page numbers. For now, we omit 'page' unless we implement cursor logic.
        if (typeof page === 'string') params.append('page', page);

        params.append('provider', 'newsdata');

        if (language) params.append('language', language);
        if (country) params.append('country', country);
        if (pageSize) params.append('size', pageSize);
        if (domains) params.append('domain', domains);
        if (excludeDomains) params.append('excludedomain', excludeDomains);
        if (category) params.append('category', category);

        // Sorting: NewsData free tier has limited sorting. 'relevancy' might be paid-only or restricted.
        // We omit 'sort' to use default (published_desc) to avoid 422 errors.

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
