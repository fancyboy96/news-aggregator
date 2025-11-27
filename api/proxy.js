export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;

  // Get the API key and provider from the request
  const apiKey = searchParams.get('apiKey');
  const provider = searchParams.get('provider') || 'newsapi'; // Default to newsapi

  if (!apiKey) {
    return new Response(JSON.stringify({ status: 'error', message: 'API Key missing' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let apiUrl;

  if (provider === 'newsdata') {
    // NewsData.io API
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

  } else {
    // NewsAPI.org API (Default)
    apiUrl = new URL('https://newsapi.org/v2/everything');

    // Forward params
    searchParams.forEach((value, key) => {
      if (key !== 'provider') { // NewsAPI expects 'apiKey' which is already in searchParams
        apiUrl.searchParams.append(key, value);
      }
    });
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
