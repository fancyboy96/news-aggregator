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
            excludeDomains
        } = options;

        const params = new URLSearchParams();
        params.append('q', query);
        params.append('page', page); // NewsData uses cursor-based pagination usually, but proxy handles basic page mapping if possible, or we just send page number and hope proxy handles it or API ignores it. (Actually NewsData uses 'page' parameter for cursor, so page number won't work directly without cursor management. For now we pass page, but NewsData pagination is complex. Let's stick to basic.)
        params.append('provider', 'newsdata');

        if (language) params.append('language', language);
        if (country) params.append('country', country);
        if (pageSize) params.append('size', pageSize);
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
