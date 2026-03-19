/**
 * Base class for News Provider Adapters
 */
export class NewsProvider {
    constructor(name) {
        this.name = name;
    }

    /**
     * Fetch articles from the provider
     * @param {string} query - Search query
     * @param {object} options - Additional options (page, filters, etc.)
     * @returns {Promise<Array>} - Normalized list of articles
     */
    async fetch(query, options = {}) {
        throw new Error('fetch() must be implemented by subclass');
    }

    /**
     * Normalize a single article to the standard format
     * @param {object} rawArticle 
     * @returns {object}
     */
    normalize(rawArticle) {
        if (!rawArticle || typeof rawArticle !== 'object') return null;
        const result = {
            source: { name: this.name },
            author: null,
            title: 'No Title',
            description: null,
            url: '#',
            urlToImage: null,
            publishedAt: new Date().toISOString(),
            content: null,
            apiSource: this.name,
            ...rawArticle
        };
        // Ensure publishedAt is a valid date; invalid values break sort logic
        if (isNaN(new Date(result.publishedAt).getTime())) {
            result.publishedAt = new Date().toISOString();
        }
        return result;
    }
}
