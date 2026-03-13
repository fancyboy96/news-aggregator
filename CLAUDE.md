# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start local dev server (opens browser automatically)
npm run build    # Build for production into dist/
npm run preview  # Preview the production build locally
```

There are no tests configured (`npm test` exits with an error).

## Environment Setup

Copy `.env.example` to `.env` and add API keys. The dev server proxy reads from `.env` automatically via Vite's `loadEnv`. Supported keys:

```
NEWSAPI_KEY=
NEWSDATA_KEY=
GNEWS_API_KEY=
THENEWSAPI_KEY=
MARKETAUX_API_TOKEN=
```

## Architecture

This is a Vite + vanilla JS (ES6 modules) + Tailwind CSS app with PWA support. It's branded "Currents" internally. There is no framework — all DOM manipulation is manual.

### Data Flow

1. User submits search → `main.js:performSearch()` gathers filter inputs
2. Calls `fetchNews()` in `api.js` for each selected provider **in parallel**
3. Each provider's adapter in `src/js/adapters/` constructs the query and hits `/api/proxy` (which keeps API keys server-side)
4. Results are merged, deduplicated (by normalized URL and title), and optionally sorted in `main.js:mergeResults()`
5. `ui.js:renderResults()` renders the article cards into the DOM

### Key Files

- `src/js/main.js` — App entry point: event listeners, `performSearch()`, `mergeResults()`, selection mode
- `src/js/store.js` — Simple pub/sub state store (no framework). Holds `articles`, `query`, `currentPage`, selection state
- `src/js/api.js` — `fetchNews(providerName, query, options)` dispatcher + `fetchWithRetry()` with exponential backoff
- `src/js/adapters/base.js` — `NewsProvider` base class; all adapters extend it and implement `fetch()` + `normalize()`
- `src/js/adapters/*.js` — One file per provider (newsapi, newsdata, gnews, thenewsapi, marketaux)
- `src/js/ui.js` — All DOM rendering and UI state (theme, loading, error, article cards)
- `src/js/utils.js` — `generateDigest()` (returns `{text, html}`), clipboard copy with rich-text fallbacks, notifications
- `src/js/components/country-selector.js` — Multi-select country component
- `api/proxy.js` — **Vercel Edge Function** that proxies requests to all five providers, injecting API keys from env vars
- `vite.config.js` — Dev server middleware that **mirrors `api/proxy.js`** exactly for local development

### Adding a New Provider

1. Create `src/js/adapters/yournewprovider.js` extending `NewsProvider`
2. Implement `fetch(query, options)` to call `/api/proxy?provider=yournewprovider&...` and return `{ articles, totalResults }`
3. Implement `normalize(rawArticle)` to map the provider's shape to the standard article schema
4. Register the adapter in `src/js/api.js`
5. Add the proxy logic to both `api/proxy.js` and the dev middleware in `vite.config.js`
6. Add the env var to `.env.example`

### Proxy Duplication

The API proxy logic is intentionally duplicated between `api/proxy.js` (Vercel Edge Function) and `vite.config.js` (local dev middleware). When changing proxy behavior for a provider, update **both** files.

### Article Schema (normalized)

```js
{
  source: { name: string },
  author: string | null,
  title: string,
  description: string | null,
  url: string,
  urlToImage: string | null,
  publishedAt: ISO string,
  content: string | null,
  apiSource: string  // provider name
}
```

## Deployment

Deployed on Vercel. The `api/proxy.js` Edge Function runs server-side to avoid CORS issues and keep API keys out of the browser. Set the env vars (`NEWSAPI_KEY`, etc.) in the Vercel project settings.
