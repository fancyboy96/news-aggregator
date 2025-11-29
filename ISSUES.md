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

## 4. Geography/Country Specific Search Parameters
**Problem:** Current search functionality is limited to keywords. Users may want to filter news by specific regions (Europe, Americas, Oceania, Asia) or specific countries to get more relevant local news.
**Solution:** Add UI filters for Continents/Regions and Specific Countries. Update the API query to include these parameters (e.g., `country` param for NewsAPI).
