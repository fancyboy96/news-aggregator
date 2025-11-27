# News Aggregator

A modern, responsive web application that allows users to search for news articles using the [NewsAPI](https://newsapi.org/), filter results with precision, and generate email-ready digests.

## Features

*   **Powerful Search**: Search for news articles by keyword or phrase.
*   **Advanced Filters**: Fine-tune your results with:
    *   **Sort By**: Relevancy, Popularity, or Newest.
    *   **Language**: Filter by major languages (English, Spanish, French, etc.).
    *   **Date Range**: Specify start and end dates.
    *   **Domains**: Include or exclude specific news sources.
    *   **Search Fields**: Restrict search to Title, Description, or Content.
*   **Email Digest**: Automatically generates a clean, plain-text summary of your search results, perfect for newsletters or daily briefings.
*   **Responsive Design**: Built with Tailwind CSS for a seamless experience on mobile and desktop.
*   **Secure & Private**: Your API key is stored locally in your browser (LocalStorage) and never sent to our servers (except to proxy the request).

## Getting Started

### Prerequisites

*   A free API Key from [NewsAPI.org](https://newsapi.org/).
*   [Node.js](https://nodejs.org/) (optional, for local development server).

### Installation

1.  Clone the repository:
    ```bash
    git clone https://github.com/fancyboy96/news-aggregator.git
    cd news-aggregator
    ```

2.  **Option A: Open directly (Limited)**
    *   You can simply open `index.html` in your browser.
    *   *Note*: Some browsers may block API requests from `file://` URLs due to CORS policies.

3.  **Option B: Local Server (Recommended)**
    *   If you have Python installed: `python3 -m http.server`
    *   If you have Node.js installed: `npx serve`
    *   Open `http://localhost:8000` (or the port shown).

### Usage

1.  **Enter API Key**: On first load, you will be prompted to enter your NewsAPI key. This is saved in your browser.
2.  **Search**: Enter a topic (e.g., "Artificial Intelligence") and hit Search.
3.  **Filter**: Click the "Filters" button to access advanced options like date ranges and domain filtering.
4.  **Digest**: Scroll down to the "Email Digest Preview" section to see a text summary. Click "Generate & Copy to Clipboard" to use it.

## Deployment

This project is set up to be easily deployed on Vercel.

1.  Install Vercel CLI: `npm i -g vercel`
2.  Run `vercel` in the project directory.

The `api/proxy.js` file is configured as an Edge Function to handle API requests in production, avoiding CORS issues.

## Technologies

*   **HTML5 & JavaScript (ES6+)**
*   **Tailwind CSS** (via CDN)
*   **Vercel Edge Functions** (for API proxying)