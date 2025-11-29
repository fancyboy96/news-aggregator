import { NewsProvider } from './base.js';
import { fetchWithRetry } from '../api.js';

export class NewsApiProvider extends NewsProvider {
    constructor() {
        super('newsapi');
    }

    async fetch(query, options = {}) {
        const {
            page = 1,
            sortBy,
            language,
            country, // NewsAPI supports 'country'
            pageSize,
            from,
            to,
            domains,
            excludeDomains,
            searchIn,
            category
        } = options;

        const params = new URLSearchParams();
        if (query) params.append('q', query);
        params.append('page', page);
        params.append('provider', 'newsapi');

        if (sortBy) params.append('sortBy', sortBy);
        if (language) params.append('language', language);
        if (country) {
            // NewsAPI only supports one country code for top-headlines.
            // If multiple are selected (comma-separated), take the first one.
            const firstCountry = country.split(',')[0];
            params.append('country', firstCountry);
        } else {
            // Default to US for top-headlines if no country specified, as it often yields better results
            params.append('country', 'us');
        }
        if (pageSize) params.append('pageSize', pageSize);
        if (from) params.append('from', from);
        if (to) params.append('to', to);
        if (domains) params.append('domains', domains);
        if (excludeDomains) params.append('excludeDomains', excludeDomains);
        if (excludeDomains) params.append('excludeDomains', excludeDomains);
        if (searchIn && searchIn !== 'title,description,content') params.append('searchIn', searchIn);
        if (category) params.append('category', category);

        const url = '/api/proxy';
        const data = await fetchWithRetry(`${url}?${params.toString()}`);

        if (data.status === 'error') {
            throw new Error(data.message || 'API Error');
        }

        return {
            totalResults: data.totalResults,
            articles: (data.articles || []).map(article => this.normalize(article))
        };
    }

    normalize(article) {
        return super.normalize({
            source: article.source,
            author: article.author,
            title: article.title,
            description: article.description,
            url: article.url,
            urlToImage: article.urlToImage,
            publishedAt: article.publishedAt,
            content: article.content
        });
    }
}
