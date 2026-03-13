import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class NewsDataProvider extends NewsProvider {
    constructor() {
        super('newsdata');
    }

    async fetch(query, options = {}) {
        const {
            language,
            country, // NewsData supports 'country'
            pageSize, // NewsData uses 'size' (max 10 free)
            domains,
            excludeDomains,
            category,
            cursor // NewsData cursor token for pagination
        } = options;

        const params = new URLSearchParams();
        params.append('q', query);
        // NewsData uses cursor-based pagination — pass the cursor token if we have one
        if (cursor) params.append('page', cursor);

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
            articles: (data.results || []).map(article => this.normalize(article)),
            nextCursor: data.nextPage || null
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
