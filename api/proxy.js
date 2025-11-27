export const config = {
  runtime: 'edge',
};

export default async function handler(request) {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  
  // Get the API key from the request (query param)
  const apiKey = searchParams.get('apiKey');
  
  if (!apiKey) {
    return new Response(JSON.stringify({ status: 'error', message: 'API Key missing' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Construct the NewsAPI URL
  // We forward all query params that came in
  const newsApiUrl = new URL('https://newsapi.org/v2/everything');
  searchParams.forEach((value, key) => {
    newsApiUrl.searchParams.append(key, value);
  });

  try {
    const response = await fetch(newsApiUrl.toString(), {
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
