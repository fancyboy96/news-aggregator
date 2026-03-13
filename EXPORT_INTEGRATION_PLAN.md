# Export & Integration — Implementation Plan

Features to build so Currents becomes a hub, not just a search tool.

---

## 1. Markdown Export

**What:** A "Copy as Markdown" button alongside the existing "Copy to Clipboard" button in the digest section.

**Why:** Users who write in Notion, Obsidian, Bear, or Roam can paste directly into their notes without reformatting.

**Format:**
```markdown
# News Digest — AI Regulation
*Generated: Friday, March 14, 2026*

---

### EU Moves to Tighten AI Rules Ahead of Summit
**Source:** Reuters · reuters.com · *3h ago*
> The European Commission is preparing a sweeping update to the AI Act...
[Read more →](https://reuters.com/...)

---
```

**Implementation:**
- Add a `markdown` property to the return value of `generateDigest()` in `src/js/utils.js`
- Add a second button `id="copyMarkdownBtn"` in the digest section header in `index.html`
- Wire up in `main.js` — same clipboard flow as the existing copy button
- No backend required

---

## 2. Shareable Feed URL

**What:** A "Share" button that copies a clean, human-readable URL for the current search state.

**Why:** The URL state already exists — this just surfaces it. Users can share a curated feed link in Slack, email, or bookmarks.

**URL format:** `https://currents.app/?q=AI+regulation&provider=newsapi,gnews&language=en&sortBy=relevancy`

**Implementation:**
- Add a share button to the action bar (next to "Create Email Digest")
- On click: copy `window.location.href` to clipboard and show a toast
- Optionally show a small popover with the URL displayed so users can inspect it
- No backend required

---

## 3. Scheduled Email Digest

**What:** Users enter their email + a preferred time (e.g. "8:00 AM daily") and receive their saved search as a formatted digest.

**Why:** Turns the app into a daily briefing service — the highest-retention use case.

**Implementation:**
- New Vercel Edge Function: `api/schedule-digest.js`
  - Accepts `{ email, query, filters, time, timezone }`
  - Stores subscription in **Vercel KV** (or Upstash Redis)
- New Vercel Cron job (`vercel.json` `crons` config) that runs hourly
  - Reads due subscriptions, fetches news, generates HTML digest, sends via **Resend** (or SendGrid)
- UI: a "Schedule Daily Briefing" button in the digest section that opens a small modal
- Dependencies to add: `resend` (or `@sendgrid/mail`), `@vercel/kv`

---

## 4. Notion Export

**What:** A "Send to Notion" button that pushes selected articles into a Notion database.

**Why:** Power users who maintain a Notion knowledge base want articles captured automatically with metadata.

**Schema:** Each article → a Notion page with Title, URL, Source, Published Date, Description, and a "Topic" tag.

**Implementation:**
- OAuth flow: user connects their Notion workspace (Notion OAuth 2.0)
  - Or simpler: user pastes their Notion Integration Token + Database ID in a settings panel
- New Edge Function: `api/notion-export.js`
  - Accepts `{ articles, databaseId, token }`
  - Calls Notion API `POST /v1/pages` for each article
- UI: "Export to Notion" button in the digest section header
- No new npm dependencies (Notion API is REST-based)

---

## 5. RSS Feed Generation

**What:** A `/api/rss?q=...&language=en` endpoint that returns a valid RSS 2.0 feed for any search query.

**Why:** Users who use RSS readers (Reeder, NetNewsWire, Feedly) can subscribe to any Currents search as a live feed.

**Implementation:**
- New Edge Function: `api/rss.js`
  - Accepts the same query params as the main search
  - Fetches from providers server-side (reuses proxy logic)
  - Returns `Content-Type: application/rss+xml` with valid RSS 2.0 XML
- UI: a small RSS icon button in the action bar that links to `/api/rss?{current params}`
- No new dependencies (RSS is plain XML string generation)

---

## 6. Slack / Teams Webhook

**What:** Users configure a webhook URL and can click "Send to Slack" to post the current digest as a formatted message.

**Why:** Teams monitoring a topic (e.g. a comms team tracking brand mentions) can push briefings to a channel without leaving the app.

**Slack format:** Uses Block Kit — headline as bold text, each article as a section with source + link.

**Implementation:**
- Settings panel (localStorage): user pastes a Slack Incoming Webhook URL
- New utility function `sendToSlack(articles, query, webhookUrl)` in `src/js/utils.js`
  - Builds a Block Kit payload
  - POSTs directly to the webhook URL from the browser (Slack webhooks accept cross-origin requests)
- UI: "Send to Slack" button in the digest section header (only shown if webhook is configured)
- No backend required — Slack webhooks are CORS-enabled

---

## Priority Order

| Priority | Feature | Effort | Backend needed |
|----------|---------|--------|---------------|
| 1 | Markdown Export | Low | No |
| 2 | Shareable Feed URL | Low | No |
| 3 | Slack Webhook | Medium | No |
| 4 | RSS Feed | Medium | Yes (Edge Function) |
| 5 | Scheduled Email | High | Yes (KV + Cron + email) |
| 6 | Notion Export | High | Yes (OAuth or token) |
