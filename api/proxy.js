import { buildProxyUrl } from './proxy-core.js';

export const config = {
  runtime: 'edge',
};

// Simple in-memory rate limiter (per Edge Function instance).
// Limits each IP to RATE_LIMIT_MAX requests per RATE_LIMIT_WINDOW ms.
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // requests per window

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;
  const timestamps = (rateLimitMap.get(ip) || []).filter(t => t > windowStart);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return timestamps.length > RATE_LIMIT_MAX;
}

export default async function handler(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  if (isRateLimited(ip)) {
    return new Response(JSON.stringify({ status: 'error', message: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json', 'Retry-After': '60' },
    });
  }

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const provider = searchParams.get('provider') || 'newsapi';

  const { apiUrl, errorMessage } = buildProxyUrl(searchParams, key => process.env[key]);

  if (errorMessage) {
    return new Response(JSON.stringify({ status: 'error', message: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: { 'User-Agent': 'NewsAggregator/1.0' }
    });

    // --- Server-Side Logging for API Usage ---
    const usageHeaders = {};
    const headerKeys = [
      'x-ratelimit-remaining', 'x-ratelimit-limit',
      'x-quota-remaining',     'x-quota-limit',
      'x-usagelimit-remaining','x-usagelimit-limit'
    ];
    headerKeys.forEach(key => {
      if (response.headers.has(key)) usageHeaders[key] = response.headers.get(key);
    });
    if (Object.keys(usageHeaders).length > 0) {
      console.log(`[API Usage] Provider: ${provider}`, JSON.stringify(usageHeaders));
    }
    // -----------------------------------------

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
