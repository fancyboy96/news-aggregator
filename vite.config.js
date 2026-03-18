import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { buildProxyUrl } from './api/proxy-core.js';

// Simple in-memory rate limiter for local dev proxy.
const devRateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window

function isDevRateLimited(ip) {
    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;
    const timestamps = (devRateLimitMap.get(ip) || []).filter(t => t > windowStart);
    timestamps.push(now);
    devRateLimitMap.set(ip, timestamps);
    return timestamps.length > RATE_LIMIT_MAX;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        // Configuration options
        server: {
            open: true,
            configureServer(server) {
                server.middlewares.use('/api/proxy', async (req, res, next) => {
                    const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
                        .toString().split(',')[0].trim();
                    if (isDevRateLimited(ip)) {
                        res.statusCode = 429;
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader('Retry-After', '60');
                        res.end(JSON.stringify({ status: 'error', message: 'Too many requests' }));
                        return;
                    }
                    try {
                        const url = new URL(req.url, `http://${req.headers.host}`);
                        const searchParams = url.searchParams;
                        const provider = searchParams.get('provider') || 'newsapi';

                        const { apiUrl, errorMessage } = buildProxyUrl(searchParams, key => env[key]);
                        if (errorMessage) throw new Error(errorMessage);

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
