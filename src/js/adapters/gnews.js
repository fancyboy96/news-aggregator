import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class GNewsProvider extends NewsProvider {
    constructor() {
        super('gnews');
    }

    async fetch(query, options = {}) {
        const {
            page = 1,
            language,
            country, // GNews supports 'country'
            sortBy, // GNews supports 'publishedAt', 'relevance'
            pageSize, // GNews uses 'max'
            from,
            to,
            domains,
            excludeDomains
        } = options;

        const params = new URLSearchParams();
        params.append('q', query);
        params.append('page', page);
        params.append('provider', 'gnews');

        if (language) params.append('lang', language); // GNews uses 'lang'
        if (country) {
            // GNews typically supports one country. Take the first one.
            const firstCountry = country.split(',')[0];
            params.append('country', firstCountry);
        }
        if (pageSize) params.append('max', pageSize);

        // Date formatting
        if (from) {
            params.append('from', new Date(from).toISOString());
        } else {
            // Default to 1 month ago
            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            params.append('from', oneMonthAgo.toISOString());
        }

        if (to) params.append('to', new Date(to).toISOString());

        // Sort mapping
        if (sortBy === 'relevancy' || sortBy === 'popularity') {
            params.append('sortby', 'relevance');
        } else {
            params.append('sortby', 'publishedAt');
        }

        const url = '/api/proxy';
        const data = await fetchWithRetry(`${url}?${params.toString()}`);

        if (data.errors) {
            const msg = Array.isArray(data.errors) ? data.errors[0] : 'GNews API Error';
            throw new Error(msg);
        }

        if (data.status === 'error') {
            throw new Error(data.message || 'API Error');
        }

        return {
            totalResults: data.totalArticles,
            articles: (data.articles || []).map(article => this.normalize(article)).filter(Boolean)
        };
    }

    normalize(item) {
        if (!item || typeof item !== 'object') return null;
        return super.normalize({
            source: { name: (item.source && item.source.name) || 'GNews' },
            author: null,
            title: item.title || 'No Title',
            description: item.description || null,
            url: item.url || '#',
            urlToImage: item.image || null,
            publishedAt: item.publishedAt || new Date().toISOString(),
            content: item.content || null
        });
    }
}
