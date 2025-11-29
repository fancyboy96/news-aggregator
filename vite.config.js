import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        // Configuration options
        server: {
            open: true,
            configureServer(server) {
                server.middlewares.use('/api/proxy', async (req, res, next) => {
                    try {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        const searchParams = url.searchParams;
                        const provider = searchParams.get('provider') || 'newsapi';

                        let apiKey;
                        let apiUrl;

                        if (provider === 'newsdata') {
                            apiKey = env.NEWSDATA_KEY;
                            if (!apiKey) throw new Error('NewsData API Key missing');
                            apiUrl = new URL('https://newsdata.io/api/1/news');
                            searchParams.forEach((value, key) => {
                                if (key !== 'apiKey' && key !== 'provider') apiUrl.searchParams.append(key, value);
                            });
                            apiUrl.searchParams.append('apikey', apiKey);
                        } else if (provider === 'gnews') {
                            apiKey = env.GNEWS_API_KEY;
                            if (!apiKey) throw new Error('GNews API Key missing');
                            apiUrl = new URL('https://gnews.io/api/v4/search');
                            searchParams.forEach((value, key) => {
                                if (key !== 'apiKey' && key !== 'provider') apiUrl.searchParams.append(key, value);
                            });
                            apiUrl.searchParams.append('apikey', apiKey);
                        } else if (provider === 'thenewsapi') {
                            apiKey = env.THENEWSAPI_KEY;
                            if (!apiKey) throw new Error('TheNewsAPI Key missing');
                            apiUrl = new URL('https://api.thenewsapi.com/v1/news/all');
                            searchParams.forEach((value, key) => {
                                if (key !== 'apiKey' && key !== 'provider') {
                                    if (key === 'q') apiUrl.searchParams.append('search', value);
                                    else apiUrl.searchParams.append(key, value);
                                }
                            });
                            apiUrl.searchParams.append('api_token', apiKey);
                        } else if (provider === 'marketaux') {
                            apiKey = env.MARKETAUX_API_TOKEN;
                            if (!apiKey) throw new Error('Marketaux API Token missing');
                            apiUrl = new URL('https://api.marketaux.com/v1/news/all');
                            searchParams.forEach((value, key) => {
                                if (key !== 'apiKey' && key !== 'provider') {
                                    if (key === 'q') apiUrl.searchParams.append('search', value);
                                    else apiUrl.searchParams.append(key, value);
                                }
                            });
                            apiUrl.searchParams.append('api_token', apiKey);
                        } else {
                            apiKey = env.NEWSAPI_KEY;
                            if (!apiKey) throw new Error('NewsAPI Key missing');
                            apiUrl = new URL('https://newsapi.org/v2/everything');
                            searchParams.forEach((value, key) => {
                                if (key !== 'provider' && key !== 'apiKey') apiUrl.searchParams.append(key, value);
                            });
                            apiUrl.searchParams.append('apiKey', apiKey);
                        }

                        const response = await fetch(apiUrl.toString(), {
                            headers: { 'User-Agent': 'NewsAggregator/1.0' }
                        });

                        // --- Server-Side Logging for API Usage (Local) ---
                        const usageHeaders = {};
                        const headerKeys = [
                            'x-ratelimit-remaining',
                            'x-ratelimit-limit',
                            'x-quota-remaining',
                            'x-quota-limit',
                            'x-usagelimit-remaining',
                            'x-usagelimit-limit'
                        ];

                        headerKeys.forEach(key => {
                            if (response.headers.has(key)) {
                                usageHeaders[key] = response.headers.get(key);
                            }
                        });

                        if (Object.keys(usageHeaders).length > 0) {
                            console.log(`[API Usage] Provider: ${provider}`, JSON.stringify(usageHeaders));
                        }
                        // -----------------------------------------

                        const data = await response.json();
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify(data));
                    } catch (error) {
                        console.error('Proxy Error:', error);
                        res.statusCode = 500;
                        res.setHeader('Content-Type', 'application/json');
                        res.end(JSON.stringify({ status: 'error', message: error.message }));
                    }
                });
            }
        },
        plugins: [
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
                manifest: {
                    name: 'Currents News Aggregator',
                    short_name: 'Currents',
                    description: 'A modern, distraction-free news aggregator.',
                    theme_color: '#ffffff',
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png'
                        }
                    ]
                }
            })
        ]
    };
});
