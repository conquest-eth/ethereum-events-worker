import { fetchGlobalDO, handleOptions, pathFromURL } from './utils/request';

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: ExecutionContext,
  ): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }
    try {
      const { patharray } = pathFromURL(request.url);
      switch (patharray[0]) {
        case '':
          // TODO debug UI onoy, main site would be a static website served elsewhere
          return new Response('hello');
        case 'events':
          return fetchGlobalDO(env.ETHEREUM_EVENTS, request);
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (err) {
      return new Response((err as any).toString());
    }
  },
};