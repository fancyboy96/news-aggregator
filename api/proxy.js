export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Get the provider from the request
  const provider = searchParams.get('provider') || 'newsapi'; // Default to newsapi

  let apiKey;
  let apiUrl;

  if (provider === 'newsdata') {
    // NewsData.io API
    apiKey = process.env.NEWSDATA_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ status: 'error', message: 'Server configuration error: NewsData API Key missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // https://newsdata.io/api/1/news?apikey=YOUR_API_KEY&q=pizza
    apiUrl = new URL('https://newsdata.io/api/1/news');

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'apiKey' && key !== 'provider' && value) {
        // NewsData free tier limit is 10
        if (key === 'size' && parseInt(value) > 10) {
          apiUrl.searchParams.append(key, '10');
        } else {
          apiUrl.searchParams.append(key, value);
        }
      }
    });
    // NewsData.io expects 'apikey' (lowercase)
    apiUrl.searchParams.append('apikey', apiKey);

  } else if (provider === 'gnews') {
    // GNews API
    apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ status: 'error', message: 'Server configuration error: GNews API Key missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const q = searchParams.get('q');
    if (q) {
      apiUrl = new URL('https://gnews.io/api/v4/search');
    } else {
      apiUrl = new URL('https://gnews.io/api/v4/top-headlines');
    }

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'apiKey' && key !== 'provider' && value) {
        apiUrl.searchParams.append(key, value);
      }
    });

    // GNews expects 'apikey'
    apiUrl.searchParams.append('apikey', apiKey);

  } else if (provider === 'thenewsapi') {
    // TheNewsAPI
    apiKey = process.env.THENEWSAPI_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ status: 'error', message: 'Server configuration error: TheNewsAPI Key missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // https://api.thenewsapi.com/v1/news/all?api_token=API_TOKEN&search=btc
    apiUrl = new URL('https://api.thenewsapi.com/v1/news/all');

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'apiKey' && key !== 'provider' && value) {
        if (key === 'q') {
          apiUrl.searchParams.append('search', value);
        } else {
          apiUrl.searchParams.append(key, value);
        }
      }
    });

    // TheNewsAPI expects 'api_token'
    apiUrl.searchParams.append('api_token', apiKey);

  } else if (provider === 'marketaux') {
    // Marketaux
    apiKey = process.env.MARKETAUX_API_TOKEN;
    if (!apiKey) {
      return new Response(JSON.stringify({ status: 'error', message: 'Server configuration error: Marketaux API Token missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // https://api.marketaux.com/v1/news/all?api_token=API_TOKEN&search=btc
    apiUrl = new URL('https://api.marketaux.com/v1/news/all');

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'apiKey' && key !== 'provider' && value) {
        if (key === 'q') {
          apiUrl.searchParams.append('search', value);
        } else {
          apiUrl.searchParams.append(key, value);
        }
      }
    });

    // Marketaux expects 'api_token'
    apiUrl.searchParams.append('api_token', apiKey);

  } else {
    // NewsAPI.org API (Default)
    apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ status: 'error', message: 'Server configuration error: NewsAPI Key missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const category = searchParams.get('category');
    const q = searchParams.get('q');
    const domains = searchParams.get('domains');

    // Logic to choose endpoint
    let endpoint = 'everything';
    let excludeKeys = [];

    if (category) {
      endpoint = 'top-headlines';
      // top-headlines ignores: from, to, domains, excludeDomains, sortBy, searchIn
      excludeKeys = ['from', 'to', 'domains', 'excludeDomains', 'sortBy', 'searchIn'];
    } else if (!q && !domains) {
      // No query and no domains -> must use top-headlines (e.g. just country)
      endpoint = 'top-headlines';
      excludeKeys = ['from', 'to', 'domains', 'excludeDomains', 'sortBy', 'searchIn'];
    } else {
      // Default to everything
      endpoint = 'everything';
      // everything ignores: country, category
      excludeKeys = ['country', 'category'];
    }

    apiUrl = new URL(`https://newsapi.org/v2/${endpoint}`);

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'provider' && key !== 'apiKey' && value && !excludeKeys.includes(key)) {
        apiUrl.searchParams.append(key, value);
      }
    });
    // NewsAPI expects 'apiKey'
    apiUrl.searchParams.append('apiKey', apiKey);
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        'User-Agent': 'NewsAggregator/1.0' // NewsAPI requires a User-Agent
      }
    });

    // --- Server-Side Logging for API Usage ---
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

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        // Add CORS headers just in case, though same-origin is default
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
