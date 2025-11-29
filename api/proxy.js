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
      if (key !== 'apiKey' && key !== 'provider') {
        apiUrl.searchParams.append(key, value);
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

    // https://gnews.io/api/v4/search?q=example&apikey=API_KEY
    apiUrl = new URL('https://gnews.io/api/v4/search');

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'apiKey' && key !== 'provider') {
        // Map common params if necessary, or just forward
        apiUrl.searchParams.append(key, value);
      }
    });

    // GNews expects 'apikey'
    apiUrl.searchParams.append('apikey', apiKey);

  } else {
    // NewsAPI.org API (Default)
    apiKey = process.env.NEWSAPI_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ status: 'error', message: 'Server configuration error: NewsAPI Key missing' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    apiUrl = new URL('https://newsapi.org/v2/everything');

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'provider' && key !== 'apiKey') {
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
