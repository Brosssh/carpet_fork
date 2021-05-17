// Loosely adapted from https://developers.cloudflare.com/workers/examples/cors-header-proxy.
async function handleRequest(request) {
  const url = new URL(request.url);
  let proxiedURL = url.searchParams.get('url');
  let requestOrigin = request.headers.get('Origin');

  if (proxiedURL == null) {
    // If not requesting a URL through the url param, proxy the corresponding
    // path at https://wasmegg.netlify.app.
    url.host = 'wasmegg.netlify.app';
    request = new Request(url.toString(), request);
    request.headers.set('Origin', url.origin);
    return await fetch(request);
  }

  let proxiedOrigin = new URL(proxiedURL).origin;
  if (
    proxiedOrigin !== 'http://www.auxbrain.com' &&
    proxiedOrigin !== 'http://afx-2-dot-auxbrainhome.appspot.com' &&
    proxiedOrigin !== 'https://afx-2-dot-auxbrainhome.appspot.com'
  ) {
    return new Response(null, {
      status: 403,
      statusText: 'Forbidden',
    });
  }

  request = new Request(proxiedURL, request);
  request.headers.set('Origin', proxiedOrigin);
  let response = await fetch(request);

  // Recreate the response and set CORS headers.
  response = new Response(response.body, response);
  response.headers.set(
    'Access-Control-Allow-Origin',
    accessControlAllowOriginHeader(requestOrigin)
  );
  response.headers.append('Vary', 'Origin');
  return response;
}

function handleOptions(request) {
  const headers = request.headers;
  if (
    headers.get('Origin') !== null &&
    headers.get('Access-Control-Request-Method') !== null &&
    headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    const origin = headers.get('Origin');
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': accessControlAllowOriginHeader(origin),
        'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
        'Access-Control-Allow-Headers': headers.get('Access-Control-Request-Headers'),
        'Access-Control-Max-Age': '86400',
      },
    });
  } else {
    // Handle standard OPTIONS request.
    return new Response(null, {
      headers: {
        Allow: 'GET, HEAD, POST, OPTIONS',
      },
    });
  }
}

function accessControlAllowOriginHeader(origin) {
  return isAllowedOrigin(origin) ? origin : 'https://wasmegg.netlify.app';
}

function isAllowedOrigin(origin) {
  return (
    origin?.match(/^https:\/\/([0-9a-f]+--)?wasmegg.netlify.app$/) ||
    origin?.match(/^https:\/\/([0-9a-f]+--)?eicoop.netlify.app$/) ||
    origin?.match(/^http:\/\/localhost(:\d+)?$/) ||
    origin?.match(/^http:\/\/127\.0\.0\.1(:\d+)?$/) ||
    origin?.match(/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/)
  );
}

addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method === 'OPTIONS') {
    event.respondWith(handleOptions(request));
  } else if (request.method === 'GET' || request.method === 'HEAD' || request.method === 'POST') {
    event.respondWith(handleRequest(request));
  } else {
    event.respondWith(
      new Response(null, {
        status: 405,
        statusText: 'Method Not Allowed',
      })
    );
  }
});
