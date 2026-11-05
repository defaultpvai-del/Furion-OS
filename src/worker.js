export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get('content-type') || '';
    if (!type.includes('text/html')) return response;
    let html = await response.text();
    if (!html.includes('/v62.js')) {
      html = html.replace('</body>', '<script src="/v62.js?v=62"></script></body>');
    }
    if (!html.includes('/wizard.js')) {
      html = html.replace('</body>', '<script src="/wizard.js?v=1"></script></body>');
    }
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('cache-control', 'no-cache');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
};