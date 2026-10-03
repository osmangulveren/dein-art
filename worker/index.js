// The dein.art site on Cloudflare: static pages from prototype/, plus a small API.
// GET  /api/views?ids=a,b,c      -> { a: 12, b: 0, c: 3 }
// POST /api/views/:id            -> { id, views }   (one watch)
// GET  /api/claims?address=0x…   -> { claimed, at, message, signature }
// POST /api/claims  { message, signature }  -> stores a page claim after checking the signature
// GET  /api/download?url=…&name=…  -> a free Wikimedia Commons file, sent as a download
// Everything lives in one Durable Object with SQLite storage, so every visitor sees the same data.
import { DurableObject } from 'cloudflare:workers';
import { verifyMessage } from 'ethers';

const ID = /^[a-z0-9-]{1,64}$/;

export class ViewCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS views (id TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)');
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS claims (address TEXT PRIMARY KEY, message TEXT NOT NULL, signature TEXT NOT NULL, at INTEGER NOT NULL)');
  }
  claimOf(address) {
    const row = [...this.ctx.storage.sql.exec('SELECT message, signature, at FROM claims WHERE address = ?', address)][0];
    return row ? { claimed: true, ...row } : { claimed: false };
  }
  saveClaim(address, message, signature) {
    this.ctx.storage.sql.exec('INSERT INTO claims (address, message, signature, at) VALUES (?, ?, ?, ?) ON CONFLICT(address) DO NOTHING', address, message, signature, Date.now());
    return this.claimOf(address);
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
    if (url.pathname === '/api/claims' && request.method === 'GET') {
      const address = (url.searchParams.get('address') || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(address)) return json({ error: 'bad address' }, 400);
      return json(await counter.claimOf(address));
    }
    if (url.pathname === '/api/claims' && request.method === 'POST') {
      // A claim counts only if the message names the wallet and that wallet signed it.
      let body; try { body = await request.json(); } catch { return json({ error: 'bad body' }, 400); }
      const { message, signature } = body || {};
      if (typeof message !== 'string' || typeof signature !== 'string' || message.length > 2000 || !message.startsWith('dein.art: claim this artist page')) return json({ error: 'not a dein.art claim' }, 400);
      const named = (message.match(/^Wallet: (0x[0-9a-fA-F]{40})$/m) || [])[1];
      let signer; try { signer = verifyMessage(message, signature).toLowerCase(); } catch { return json({ error: 'bad signature' }, 400); }
      if (!named || signer !== named.toLowerCase()) return json({ error: 'signature does not match the wallet' }, 403);
      return json(await counter.saveClaim(signer, message, signature));
    }
    // Free files from Wikimedia Commons, served as a download from dein.art itself, so the visitor stays on the site.
    if (url.pathname === '/api/download' && request.method === 'GET') {
      let src; try { src = new URL(url.searchParams.get('url') || ''); } catch { return json({ error: 'bad url' }, 400); }
      if (src.protocol !== 'https:' || src.hostname !== 'upload.wikimedia.org') return json({ error: 'not an allowed source' }, 403);
      const name = (url.searchParams.get('name') || src.pathname.split('/').pop()).replace(/[^\w.\- ()]+/g, '_').slice(0, 120);
      const r = await fetch(src.toString(), { headers: { 'User-Agent': 'dein-art/0.1 (https://github.com/osmangulveren/dein-art)' } });
      if (!r.ok) return json({ error: 'source answered ' + r.status }, 502);
      return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'public, max-age=86400' } });
    }
    const one = url.pathname.match(/^\/api\/views\/([a-z0-9-]{1,64})$/);
    if (one && request.method === 'POST') return json({ id: one[1], views: await counter.add(one[1]) });
    return json({ error: 'not found' }, 404);
  },
};
