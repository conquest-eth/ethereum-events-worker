export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

export function handleOptions(request: Request) {
  if (
    request.headers.get('Origin') !== null &&
    request.headers.get('Access-Control-Request-Method') !== null &&
    request.headers.get('Access-Control-Request-Headers') !== null
  ) {
    // Handle CORS pre-flight request.
    return new Response(null, {
      headers: corsHeaders,
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

export function fetchGlobalDO(
  DO: DurableObjectNamespace,
  request: Request,
  path?: string,
) {
  let doID = DO.idFromName('_GLOBAL_');
  let durableObject = DO.get(doID);
  if (path) {
    const newURL = new URL(request.url);
    newURL.pathname = path;
    request = new Request(newURL.toString(), request);
  }
  return durableObject.fetch(request);
}

export function createJSONResponse(
  data: any,
  options?: { status: number },
): Response {
  return new Response(JSON.stringify(data), {
    headers: {
      ...corsHeaders,
      'content-type': 'application/json;charset=UTF-8',
    },
    status: options?.status,
  });
}

export function pathFromURL(urlAsString: string) {
  const url = new URL(urlAsString);
  const pathname = url.pathname;
  const patharray = pathname
    .slice(1, pathname.endsWith('/') ? pathname.length - 1 : undefined)
    .split('/');
  return { url, pathname, patharray };
}

export function parseGETParams(urlAsString: string): {
  [key: string]: number | string;
} {
  const { searchParams } = new URL(urlAsString);
  const params = Array.from(searchParams.entries()).reduce(
    (prev: { [key: string]: string | number }, curr) => {
      let value: string | number = parseInt(curr[1]);
      if (isNaN(value)) {
        value = curr[1];
      }
      prev[curr[0]] = value;
      return prev;
    },
    {},
  );
  return params;
}