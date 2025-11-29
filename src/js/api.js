import { NewsApiProvider } from './adapters/newsapi.js';
import { NewsDataProvider } from './adapters/newsdata.js';
import { GNewsProvider } from './adapters/gnews.js';
import { TheNewsApiProvider } from './adapters/thenewsapi.js';
import { MarketauxProvider } from './adapters/marketaux.js';

// Initialize providers
const providers = {
    newsapi: new NewsApiProvider(),
    newsdata: new NewsDataProvider(),
    gnews: new GNewsProvider(),
    thenewsapi: new TheNewsApiProvider(),
    marketaux: new MarketauxProvider()
};

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

/**
 * Unified fetch function
 * @param {string} providerName 
 * @param {string} query 
 * @param {object} options 
 * @returns {Promise<object>}
 */
export async function fetchNews(providerName, query, options) {
    const provider = providers[providerName];
    if (!provider) {
        throw new Error(`Unknown provider: ${providerName}`);
    }
    return await provider.fetch(query, options);
}

