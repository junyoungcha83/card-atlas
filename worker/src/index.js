// 카드도감 이미지 API (R2). 읽기 공개, 쓰기는 X-Edit-Token 인증.
//  GET    /api/img          → 업로드된 slot 목록
//  GET    /api/img/:slot    → 이미지 바이트(공개)
//  PUT    /api/img/:slot    → 업로드(인증) · 8MB 제한
//  DELETE /api/img/:slot    → 삭제(인증)
const MAX = 8 * 1024 * 1024;

function cors() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Edit-Token',
    'Access-Control-Max-Age': '86400',
  };
}
function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { ...cors(), 'Content-Type': 'application/json; charset=utf-8' } });
}
const okSlot = s => /^[A-Za-z0-9_-]{1,64}$/.test(s);

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });

    if (url.pathname === '/api/img' || url.pathname.startsWith('/api/img/')) {
      const slot = url.pathname === '/api/img' ? '' : decodeURIComponent(url.pathname.slice('/api/img/'.length));

      // 목록(공개)
      if (req.method === 'GET' && !slot) {
        const list = await env.IMG.list({ prefix: 'img/' });
        const items = (list.objects || []).map(o => ({
          slot: o.key.slice(4),
          type: (o.httpMetadata && o.httpMetadata.contentType) || '',
          size: o.size,
          updated_at: o.uploaded ? new Date(o.uploaded).toISOString() : '',
        }));
        return json({ items });
      }

      // 개별 이미지(공개)
      if (req.method === 'GET' && slot) {
        if (!okSlot(slot)) return new Response('Bad slot', { status: 400, headers: cors() });
        const obj = await env.IMG.get('img/' + slot);
        if (!obj) return new Response('Not Found', { status: 404, headers: cors() });
        return new Response(obj.body, {
          headers: {
            ...cors(),
            'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'application/octet-stream',
            'Cache-Control': 'public, max-age=300',
          },
        });
      }

      // 쓰기(인증)
      const token = req.headers.get('X-Edit-Token') || '';
      if (!env.EDIT_TOKEN || token !== env.EDIT_TOKEN) return json({ error: 'unauthorized' }, 401);
      if (!okSlot(slot)) return json({ error: 'bad_slot' }, 400);

      if (req.method === 'PUT') {
        const buf = await req.arrayBuffer();
        if (buf.byteLength > MAX) return json({ error: 'too_large', limit: MAX, size: buf.byteLength }, 413);
        const type = req.headers.get('Content-Type') || 'image/jpeg';
        await env.IMG.put('img/' + slot, buf, { httpMetadata: { contentType: type } });
        return json({ ok: true, slot, size: buf.byteLength });
      }
      if (req.method === 'DELETE') {
        await env.IMG.delete('img/' + slot);
        return json({ ok: true });
      }
      return json({ error: 'method_not_allowed' }, 405);
    }

    if (url.pathname === '/' || url.pathname === '/api/health') return json({ ok: true, service: 'card-atlas-img-api' });
    return new Response('Not Found', { status: 404, headers: cors() });
  },
};
