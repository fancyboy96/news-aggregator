# Feature Requests

## ~~1. Dark Mode Toggle~~
~~**Problem:** The app currently uses a light theme (`bg-gray-100`, white cards). Reading text-heavy content like news on a bright screen can be straining, especially in low light.~~
~~**Solution:** Add a toggle switch in the header. Use Tailwind's `dark:` variant classes to invert colors (e.g., dark slate background, light gray text) for a more comfortable reading experience.~~

## 2. Search History / Recent Queries
**Problem:** Users often repeat the same searches to check for updates on a topic. Retyping queries and resetting filters is tedious.
**Solution:** Save successful search queries to the browser's `localStorage`. Display the 5 most recent searches as clickable "chips" or a dropdown under the search bar for one-click access.

## 3. "Read Later" Bookmarks
**Problem:** The current "Selection" mode is designed for generating a digest, which is ephemeral. Users might want to save an article to read later without keeping the tab open.
**Solution:** Add a small "Bookmark" icon to each article card. Saved articles would be stored in `localStorage` and accessible via a "Saved Articles" tab or modal, persisting even after the browser is closed.

## ~~4. Geography/Country Specific Search Parameters~~
~~**Problem:** Current search functionality is limited to keywords. Users may want to filter news by specific regions (Europe, Americas, Oceania, Asia) or specific countries to get more relevant local news.~~
~~**Solution:** Add UI filters for Continents/Regions and Specific Countries. Update the API query to include these parameters (e.g., `country` param for NewsAPI).~~

## 5. Keyboard Shortcuts
**Problem:** Power users prefer navigating without leaving the keyboard.
**Solution:** Add shortcuts like `/` to focus search, `Esc` to clear filters, or `j`/`k` to navigate through articles.

## ~~6. Skeleton Loading States~~
~~**Problem:** The current spinning loader feels generic and doesn't indicate the layout of the content to come.~~
~~**Solution:** Replace the spinner with "skeleton" cards (gray pulsing shapes) that match the article card layout for better perceived performance.~~

## ~~7. PWA Support (Progressive Web App)~~
~~**Problem:** Users cannot install the app on their devices or read content offline.~~
~~**Solution:** Add a `manifest.json` and service worker to enable installation and offline caching.~~

## 8. Category Filtering
**Problem:** Users often want to browse specific topics (e.g., "Technology", "Business", "Sports") without typing specific keywords.
**Solution:** Add a "Category" dropdown. Most providers (NewsAPI, NewsData, GNews, TheNewsAPI) support standard categories. Marketaux supports "Industries".

## 9. Sentiment Analysis Filter
**Problem:** Financial and crypto traders often want to filter for "Positive" or "Negative" news to gauge market sentiment.
**Solution:** Implement a Sentiment toggle. Supported by NewsData, TheNewsAPI, and Marketaux.

## 10. Source Type Filtering
**Problem:** Users may want to distinguish between major publishers (CNN, BBC) and independent blogs or press releases.
**Solution:** Add a "Source Type" filter. NewsData supports "AI Tags", Marketaux supports "Entity Types". Could be normalized across providers.

# Backend / Admin Features

## 11. Automated API Quota Alerting
**Problem:** If the app becomes popular, we might hit API rate limits unexpectedly, breaking the app for users.
**Solution:** Implement a backend service (e.g., a scheduled cron job or a check on every Nth request) that monitors API usage headers. If credits drop below a threshold (e.g., 10%), send an email or Slack alert to the admin.
