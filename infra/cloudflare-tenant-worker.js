// Cloudflare Worker for *.stellaruc.com (route: *.stellaruc.com/*, and stellaruc.com/* if desired).
//
// Every customer workspace is {slug}.stellaruc.com. The app (Netlify) does not need a domain alias
// per customer: this Worker forwards each request to the app's origin and tells it which host the
// customer actually used, in x-ai4cc-forwarded-host (see lib/tenantHost.ts effectiveHost()).
// The shared x-ai4cc-edge-key must equal AI4CC_EDGE_SECRET on the Netlify site, so a caller who
// reaches the origin directly cannot pick a tenant host. Tenant membership is still verified
// server-side on every request; this header only selects which workspace the user is signing in to.
//
// Worker variables (Settings > Variables): ORIGIN_URL (e.g. https://stellaruc-prod.netlify.app or
// the app's own custom domain), EDGE_SECRET (secret).

export default {
  async fetch(request, env) {
    const incoming = new URL(request.url);
    const origin = new URL(env.ORIGIN_URL);

    const target = new URL(incoming.pathname + incoming.search, origin);
    const headers = new Headers(request.headers);
    headers.set('x-ai4cc-forwarded-host', incoming.host);
    headers.set('x-ai4cc-edge-key', env.EDGE_SECRET);

    const upstream = await fetch(target, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual',
    });

    // Keep redirects on the customer's own host instead of leaking the origin host.
    const response = new Response(upstream.body, upstream);
    const location = response.headers.get('location');
    if (location) {
      try {
        const loc = new URL(location, origin);
        if (loc.host === origin.host) {
          loc.host = incoming.host;
          loc.protocol = 'https:';
          response.headers.set('location', loc.toString());
        }
      } catch {
        // leave non-URL locations untouched
      }
    }
    return response;
  },
};
