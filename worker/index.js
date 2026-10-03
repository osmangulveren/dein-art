// The dein.art site on Cloudflare: static pages from prototype/, plus a small API for view counts.
// GET  /api/views?ids=a,b,c   -> { a: 12, b: 0, c: 3 }
// POST /api/views/:id         -> { id, views }   (one watch)
// Counts live in one Durable Object with SQLite storage, so every visitor sees the same numbers.
import { DurableObject } from 'cloudflare:workers';

const ID = /^[a-z0-9-]{1,64}$/;

export class ViewCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS views (id TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)');
  }
  read(ids) {
    const out = Object.fromEntries(ids.map(id => [id, 0]));
    if (!ids.length) return out;
    for (const row of this.ctx.storage.sql.exec(`SELECT id, n FROM views WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)) out[row.id] = row.n;
    return out;
  }
  add(id) {
    return this.ctx.storage.sql.exec('INSERT INTO views (id, n) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1 RETURNING n', id).one().n;
  }
}

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const counter = env.VIEWS.get(env.VIEWS.idFromName('all'));
    if (url.pathname === '/api/views' && request.method === 'GET') {
      const ids = [...new Set((url.searchParams.get('ids') || '').split(','))].filter(id => ID.test(id)).slice(0, 60);
      return json(await counter.read(ids));
    }
    const one = url.pathname.match(/^\/api\/views\/([a-z0-9-]{1,64})$/);
    if (one && request.method === 'POST') return json({ id: one[1], views: await counter.add(one[1]) });
    return json({ error: 'not found' }, 404);
  },
};
