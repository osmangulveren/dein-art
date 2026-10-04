// The dein.art site on Cloudflare: static pages from prototype/, plus a small API.
//
// Counters and claims
//   GET  /api/views?ids=a,b,c        -> { a: 12, b: 0, c: 3 }
//   POST /api/views/:id              -> { id, views }   (one watch, or one download)
//   GET  /api/claims?address=0x…     -> { claimed, at, message, signature }
//   POST /api/claims { message, signature }   stores a page claim after checking the signature
//
// What creators share (real uploads)
//   POST   /api/uploads { session, files: [{ name, type, size }] }  -> { token, chunk, files: [{ id, chunks }] }
//   PUT    /api/uploads/:id/:n        one piece of a file (header x-upload-token), at most CHUNK bytes
//   POST   /api/items { session, token, items: [...] }               -> { items }   publishes them to the marketplace
//   GET    /api/items                 -> everything published, newest first
//   DELETE /api/items/:id { session } removes an item and its files (its owner, or an admin)
//   GET    /api/files/:id             the file itself; ?dl=1 sends it as a download
//   POST   /api/titles { session, title }   a credit: a title and the people who made it
//   GET    /api/titles                -> every title added
//   DELETE /api/titles/:id { session }
//
//   GET  /api/download?url=…&name=…   a free Wikimedia Commons or Freesound file, sent as a download
//
// A "session" is the sign-in message a wallet signed in the browser, with its signature: the server checks the
// signature itself, so nobody can publish or delete in someone else's name.
// Everything lives in one Durable Object with SQLite storage (files are kept in pieces of CHUNK bytes), so every visitor
// sees the same data. Larger libraries belong on Cloudflare R2; the storage calls are kept together to make that move small.
import { DurableObject } from 'cloudflare:workers';
import { verifyMessage } from 'ethers';

const ID = /^[a-z0-9-]{1,64}$/;
const CHUNK = 1_000_000;                    // bytes per stored piece (a row holds at most 2 MB)
const MAX_FILE = 25_000_000;                // one file
const MAX_OWNER = 250_000_000;              // everything one wallet has stored
const MAX_ALL = 4_000_000_000;              // everything stored (the free plan holds 5 GB)
const MAX_FILES_A_DAY = 80;                 // per wallet
const ADMINS = ['0xe803aad78e6eabcde6f820d2c64cf83402eddbe2'];   // may remove anything
const CATS = ['Footage', 'Music', 'Sound effects', 'Photos & images', 'Templates', 'Scripts & documents'];
// what a browser may show in place; everything else is only ever sent as a download
const INLINE = /^(image\/(jpeg|png|webp|gif|avif)|audio\/(mpeg|mp4|wav|x-wav|ogg|flac|webm|aac)|video\/(mp4|webm|quicktime))$/;

const hex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, '0')).join('');
const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, n);
const fail = (error, status = 400) => ({ error, status });

// Who is asking: the wallet that signed a dein.art sign-in message, if the signature holds and the message is recent.
function signer(session) {
  const { message, signature } = session || {};
  if (typeof message !== 'string' || typeof signature !== 'string' || message.length > 1200 || !message.includes('Sign in to dein.art')) return null;
  const named = (message.split('\n')[1] || '').trim(), issued = Date.parse((message.match(/^Issued At: (.+)$/m) || [])[1] || '');
  if (!/^0x[0-9a-fA-F]{40}$/.test(named) || !issued || Date.now() - issued > 60 * 864e5 || issued - Date.now() > 864e5) return null;
  try { return verifyMessage(message, signature).toLowerCase() === named.toLowerCase() ? named.toLowerCase() : null; } catch { return null; }
}

export class ViewCounter extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    const sql = ctx.storage.sql;
    sql.exec('CREATE TABLE IF NOT EXISTS views (id TEXT PRIMARY KEY, n INTEGER NOT NULL DEFAULT 0)');
    sql.exec('CREATE TABLE IF NOT EXISTS claims (address TEXT PRIMARY KEY, message TEXT NOT NULL, signature TEXT NOT NULL, at INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, owner TEXT NOT NULL, token TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL, size INTEGER NOT NULL, chunks INTEGER NOT NULL, item TEXT, pub INTEGER NOT NULL DEFAULT 0, at INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS chunks (file TEXT NOT NULL, i INTEGER NOT NULL, data BLOB NOT NULL, PRIMARY KEY (file, i))');
    sql.exec('CREATE TABLE IF NOT EXISTS items (id TEXT PRIMARY KEY, owner TEXT NOT NULL, json TEXT NOT NULL, at INTEGER NOT NULL)');
    sql.exec('CREATE TABLE IF NOT EXISTS titles (id TEXT PRIMARY KEY, owner TEXT NOT NULL, json TEXT NOT NULL, at INTEGER NOT NULL)');
  }
  rows(q, ...args) { return [...this.ctx.storage.sql.exec(q, ...args)]; }

  /* ---------- counters and claims ---------- */
  claimOf(address) {
    const row = this.rows('SELECT message, signature, at FROM claims WHERE address = ?', address)[0];
    return row ? { claimed: true, ...row } : { claimed: false };
  }
  saveClaim(message, signature) {
    // A claim counts only if the message names the wallet and that wallet signed it.
    if (typeof message !== 'string' || typeof signature !== 'string' || message.length > 2000 || !message.startsWith('dein.art: claim this artist page')) return fail('not a dein.art claim');
    const named = (message.match(/^Wallet: (0x[0-9a-fA-F]{40})$/m) || [])[1];
    let who; try { who = verifyMessage(message, signature).toLowerCase(); } catch { return fail('bad signature'); }
    if (!named || who !== named.toLowerCase()) return fail('signature does not match the wallet', 403);
    this.ctx.storage.sql.exec('INSERT INTO claims (address, message, signature, at) VALUES (?, ?, ?, ?) ON CONFLICT(address) DO NOTHING', who, message, signature, Date.now());
    return this.claimOf(who);
  }
  read(ids) {
    const out = Object.fromEntries(ids.map(id => [id, 0]));
    if (!ids.length) return out;
    for (const row of this.rows(`SELECT id, n FROM views WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids)) out[row.id] = row.n;
    return out;
  }
  add(id) {
    return this.ctx.storage.sql.exec('INSERT INTO views (id, n) VALUES (?, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1 RETURNING n', id).one().n;
  }

  /* ---------- uploads: a file arrives in pieces, then is published as part of an item ---------- */
  startUpload(session, files) {
    const owner = signer(session); if (!owner) return fail('log in with your wallet first', 401);
    if (!Array.isArray(files) || !files.length || files.length > 40) return fail('between 1 and 40 files');
    const list = files.map(f => ({ name: clip(f && f.name, 140).replace(/[\\/]/g, '_') || 'file', type: clip(f && f.type, 80).toLowerCase() || 'application/octet-stream', size: Number(f && f.size) }));
    if (list.some(f => !Number.isInteger(f.size) || f.size < 1 || f.size > MAX_FILE)) return fail(`a file can be up to ${MAX_FILE / 1e6} MB`);
    const now = Date.now(), sum = q => this.rows(q.q, ...q.a)[0].n || 0;
    // unfinished uploads older than a day are cleared, so they do not count against anyone
    for (const row of this.rows('SELECT id FROM files WHERE item IS NULL AND at < ?', now - 864e5)) this.dropFile(row.id);
    const adding = list.reduce((n, f) => n + f.size, 0);
    if (sum({ q: 'SELECT COUNT(*) AS n FROM files WHERE owner = ? AND at > ?', a: [owner, now - 864e5] }) + list.length > MAX_FILES_A_DAY) return fail('that is a lot for one day; try again tomorrow', 429);
    if (sum({ q: 'SELECT SUM(size) AS n FROM files WHERE owner = ?', a: [owner] }) + adding > MAX_OWNER) return fail(`one wallet can keep up to ${MAX_OWNER / 1e6} MB here; remove something first`, 413);
    if (sum({ q: 'SELECT SUM(size) AS n FROM files', a: [] }) + adding > MAX_ALL) return fail('the shared storage is full for now', 507);
    const token = hex(24);
    return { token, chunk: CHUNK, files: list.map(f => {
      const id = hex(12), chunks = Math.ceil(f.size / CHUNK);
      this.ctx.storage.sql.exec('INSERT INTO files (id, owner, token, name, type, size, chunks, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', id, owner, token, f.name, f.type, f.size, chunks, now);
      return { id, chunks };
    }) };
  }
  putChunk(id, i, token, data) {
    const f = this.rows('SELECT token, size, chunks, item FROM files WHERE id = ?', id)[0];
    if (!f || f.token !== token) return fail('unknown upload', 403);
    if (f.item) return fail('already published', 409);
    if (!Number.isInteger(i) || i < 0 || i >= f.chunks) return fail('no such piece');
    const want = i === f.chunks - 1 ? f.size - CHUNK * (f.chunks - 1) : CHUNK;
    if (data.byteLength !== want) return fail(`piece ${i} should be ${want} bytes`);
    this.ctx.storage.sql.exec('INSERT INTO chunks (file, i, data) VALUES (?, ?, ?) ON CONFLICT(file, i) DO UPDATE SET data = excluded.data', id, i, data);
    return { ok: true };
  }
  dropFile(id) { this.ctx.storage.sql.exec('DELETE FROM chunks WHERE file = ?', id); this.ctx.storage.sql.exec('DELETE FROM files WHERE id = ?', id); }
  fileInfo(id) {
    const f = this.rows('SELECT name, type, size, chunks, pub, item FROM files WHERE id = ?', id)[0];
    return f && f.item && f.pub ? f : null;
  }
  chunk(id, i) { const r = this.rows('SELECT data FROM chunks WHERE file = ? AND i = ?', id, i)[0]; return r ? r.data : null; }

  publish(session, token, items) {
    const owner = signer(session); if (!owner) return fail('log in with your wallet first', 401);
    if (!Array.isArray(items) || !items.length || items.length > 40) return fail('between 1 and 40 items');
    const mine = Object.fromEntries(this.rows('SELECT id, name, type, size, chunks FROM files WHERE owner = ? AND token = ? AND item IS NULL', owner, String(token)).map(f => [f.id, f]));
    const whole = id => mine[id] && this.rows('SELECT COUNT(*) AS n FROM chunks WHERE file = ?', id)[0].n === mine[id].chunks;
    const out = [], used = new Set();
    for (const raw of items) {
      const it = raw || {}, title = clip(it.title, 120), cat = CATS.includes(it.cat) ? it.cat : '';
      const price = Number(it.price) || 0, files = Array.isArray(it.files) ? it.files.slice(0, 20) : [];
      if (!title || !cat) return fail('every item needs a title and a category');
      if (price && (price < 2 || price > 10000)) return fail('an amount is between $2 and $10,000');
      if (!files.length || files.some(f => !f || !whole(f.id) || used.has(f.id))) return fail(`a file of “${title}” did not arrive completely; upload it again`);
      const extra = [it.thumb, ...(Array.isArray(it.gallery) ? it.gallery.slice(0, 12) : [])].filter(Boolean);
      if (extra.some(id => !whole(id) || used.has(id) || !/^image\//.test(mine[id].type))) return fail('a preview picture did not arrive completely');
      [...files.map(f => f.id), ...extra].forEach(id => used.add(id));
      const id = hex(8), now = Date.now();
      const doc = { id, owner, title, cat, sub: clip(it.sub, 40).replace(/[<>"]/g, '') || 'Other', desc: clip(it.desc, 4000), price, lic: clip(it.lic, 60) || 'All rights reserved', tags: clip(it.tags, 200), film: ID.test(String(it.film || '')) ? it.film : '',
        by: clip(it.by, 60), kind: ['image', 'video', 'audio', 'file'].includes(it.kind) ? it.kind : 'file', thumb: it.thumb || '', gallery: (Array.isArray(it.gallery) ? it.gallery.slice(0, 12) : []),
        files: files.map(f => ({ id: f.id, name: mine[f.id].name, type: mine[f.id].type, size: mine[f.id].size, note: clip(f.note, 500) })), at: now };
      this.ctx.storage.sql.exec('INSERT INTO items (id, owner, json, at) VALUES (?, ?, ?, ?)', id, owner, JSON.stringify(doc), now);
      // previews are always public; the files themselves only when the item is free (payments are not live yet)
      extra.forEach(f => this.ctx.storage.sql.exec('UPDATE files SET item = ?, pub = 1 WHERE id = ?', id, f));
      files.forEach(f => this.ctx.storage.sql.exec('UPDATE files SET item = ?, pub = ? WHERE id = ?', id, price ? 0 : 1, f.id));
      out.push(doc);
    }
    return { items: out };
  }
  items() { return this.rows('SELECT json FROM items ORDER BY at DESC LIMIT 400').map(r => JSON.parse(r.json)); }
  removeItem(session, id) {
    const who = signer(session); if (!who) return fail('log in with your wallet first', 401);
    const row = this.rows('SELECT owner FROM items WHERE id = ?', id)[0];
    if (!row) return fail('not found', 404);
    if (row.owner !== who && !ADMINS.includes(who)) return fail('only the wallet that shared it can remove it', 403);
    for (const f of this.rows('SELECT id FROM files WHERE item = ?', id)) this.dropFile(f.id);
    this.ctx.storage.sql.exec('DELETE FROM items WHERE id = ?', id);
    return { ok: true };
  }

  /* ---------- credits: a title and the people who made it ---------- */
  saveTitle(session, t) {
    const owner = signer(session); if (!owner) return fail('log in with your wallet first', 401);
    const body = JSON.stringify(t || {});
    if (body.length > 90_000) return fail('too much for one title; use a smaller poster');
    const title = clip(t && t.title, 160), year = Number(t && t.year), slug = clip(t && t.id, 64);
    if (!title || !Number.isInteger(year) || year < 1888 || year > 2100 || !ID.test(slug)) return fail('a title needs a name and a year');
    const had = this.rows('SELECT owner FROM titles WHERE id = ?', slug)[0];
    if (had && had.owner !== owner) return fail('someone else already added a title at this address', 409);
    if (!had && this.rows('SELECT COUNT(*) AS n FROM titles WHERE owner = ? AND at > ?', owner, Date.now() - 864e5)[0].n >= 30) return fail('that is a lot for one day; try again tomorrow', 429);
    // only the fields a title has are kept, each as plain text of a sensible length
    const people = v => (Array.isArray(v) ? v.slice(0, 80).map(p => ({ name: clip(p && p.name, 80), ...(p && p.as ? { as: clip(p.as, 80) } : {}) })).filter(p => p.name) : []);
    const link = v => (/^https?:\/\//i.test(String(v || '')) ? clip(v, 300) : '');
    const doc = { id: slug, title, year, owner, at: Date.now(), original: clip(t.original, 160), type: clip(t.type, 40), status: clip(t.status, 40), desc: clip(t.desc, 3000), tagline: clip(t.tagline, 200),
      genres: (Array.isArray(t.genres) ? t.genres.slice(0, 3).map(g => clip(g, 30)).filter(Boolean) : []), country: clip(t.country, 60), language: clip(t.language, 60), runtime: clip(t.runtime, 10), colour: clip(t.colour, 30),
      released: clip(t.released, 20), premiere: clip(t.premiere, 120), watch: link(t.watch), site: link(t.site), imdb: link(t.imdb), proof: link(t.proof), trailer: link(t.trailer), budget: clip(t.budget, 40),
      role: clip(t.role, 40), character: clip(t.character, 80), by: clip(t.by, 60), poster: typeof t.poster === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t.poster) ? t.poster : '',
      directors: people(t.directors), writers: people(t.writers), producers: people(t.producers), cast: people(t.cast), crew: people(t.crew), companies: people(t.companies), distributors: people(t.distributors) };
    if (!doc.directors.length || !doc.desc || !doc.type) return fail('a title needs a type, a description and a director');
    this.ctx.storage.sql.exec('INSERT INTO titles (id, owner, json, at) VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET json = excluded.json, at = excluded.at', slug, owner, JSON.stringify(doc), doc.at);
    return { title: doc };
  }
  titles() { return this.rows('SELECT json FROM titles ORDER BY at DESC LIMIT 400').map(r => JSON.parse(r.json)); }
  removeTitle(session, id) {
    const who = signer(session); if (!who) return fail('log in with your wallet first', 401);
    const row = this.rows('SELECT owner FROM titles WHERE id = ?', id)[0];
    if (!row) return fail('not found', 404);
    if (row.owner !== who && !ADMINS.includes(who)) return fail('only the wallet that added it can remove it', 403);
    this.ctx.storage.sql.exec('DELETE FROM titles WHERE id = ?', id);
    return { ok: true };
  }
}

const json = (body, status = 200, cache = 'no-store') => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': cache } });
const answer = r => (r && r.error ? json({ error: r.error }, r.status || 400) : json(r));
const bodyOf = async request => { try { return await request.json(); } catch { return {}; } };

export default {
  async fetch(request, env) {
    const url = new URL(request.url), path = url.pathname, method = request.method;
    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);
    const store = env.VIEWS.get(env.VIEWS.idFromName('all'));
    let m;

    if (path === '/api/views' && method === 'GET') {
      const ids = [...new Set((url.searchParams.get('ids') || '').split(','))].filter(id => ID.test(id)).slice(0, 60);
      return json(await store.read(ids));
    }
    if ((m = path.match(/^\/api\/views\/([a-z0-9-]{1,64})$/)) && method === 'POST') return json({ id: m[1], views: await store.add(m[1]) });

    if (path === '/api/claims' && method === 'GET') {
      const address = (url.searchParams.get('address') || '').toLowerCase();
      if (!/^0x[0-9a-f]{40}$/.test(address)) return json({ error: 'bad address' }, 400);
      return json(await store.claimOf(address));
    }
    if (path === '/api/claims' && method === 'POST') { const b = await bodyOf(request); return answer(await store.saveClaim(b.message, b.signature)); }

    if (path === '/api/uploads' && method === 'POST') { const b = await bodyOf(request); return answer(await store.startUpload(b.session, b.files)); }
    if ((m = path.match(/^\/api\/uploads\/([0-9a-f]{24})\/(\d{1,3})$/)) && method === 'PUT') {
      if (Number(request.headers.get('content-length') || 0) > CHUNK) return json({ error: 'piece too large' }, 413);
      const data = await request.arrayBuffer();
      if (data.byteLength > CHUNK) return json({ error: 'piece too large' }, 413);
      return answer(await store.putChunk(m[1], Number(m[2]), request.headers.get('x-upload-token') || '', data));
    }
    if (path === '/api/items' && method === 'GET') return json(await store.items());
    if (path === '/api/items' && method === 'POST') { const b = await bodyOf(request); return answer(await store.publish(b.session, b.token, b.items)); }
    if ((m = path.match(/^\/api\/items\/([0-9a-f]{16})$/)) && method === 'DELETE') { const b = await bodyOf(request); return answer(await store.removeItem(b.session, m[1])); }

    if (path === '/api/titles' && method === 'GET') return json(await store.titles());
    if (path === '/api/titles' && method === 'POST') { const b = await bodyOf(request); return answer(await store.saveTitle(b.session, b.title)); }
    if ((m = path.match(/^\/api\/titles\/([a-z0-9-]{1,64})$/)) && method === 'DELETE') { const b = await bodyOf(request); return answer(await store.removeTitle(b.session, m[1])); }

    // A shared file, sent piece by piece. Only pictures, sound and video may be shown in place; anything else is a download,
    // and nothing is ever allowed to run as a page of this site.
    if ((m = path.match(/^\/api\/files\/([0-9a-f]{24})$/)) && (method === 'GET' || method === 'HEAD')) {
      const f = await store.fileInfo(m[1]);
      if (!f) return json({ error: 'not found' }, 404);
      const inline = INLINE.test(f.type) && !url.searchParams.get('dl');
      const headers = { 'content-type': inline ? f.type : 'application/octet-stream', 'content-disposition': `${inline ? 'inline' : 'attachment'}; filename="${f.name.replace(/[^\w.\- ()]+/g, '_')}"`,
        'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'none'; sandbox", 'accept-ranges': 'bytes', 'cache-control': 'public, max-age=3600' };
      let from = 0, to = f.size - 1, status = 200;
      const range = (request.headers.get('range') || '').match(/^bytes=(\d*)-(\d*)$/);
      if (range && (range[1] || range[2])) {
        from = range[1] ? Number(range[1]) : Math.max(0, f.size - Number(range[2])); to = range[1] && range[2] ? Math.min(Number(range[2]), f.size - 1) : f.size - 1;
        if (from > to || from >= f.size) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${f.size}` } });
        status = 206; headers['content-range'] = `bytes ${from}-${to}/${f.size}`;
      }
      headers['content-length'] = String(to - from + 1);
      if (method === 'HEAD') return new Response(null, { status, headers });
      let i = Math.floor(from / CHUNK); const last = Math.floor(to / CHUNK);
      const stream = new ReadableStream({ async pull(c) {
        if (i > last) return c.close();
        const data = await store.chunk(m[1], i);
        if (!data) return c.error(new Error('missing piece'));
        const start = i === Math.floor(from / CHUNK) ? from - i * CHUNK : 0, end = i === last ? to - i * CHUNK + 1 : CHUNK;
        c.enqueue(new Uint8Array(data).subarray(start, end)); i++;
      } });
      return new Response(stream, { status, headers });
    }

    // Free files from Wikimedia Commons, Freesound and four museums' open-access collections, served as a download from dein.art itself, so the visitor stays on the site.
    if (path === '/api/download' && method === 'GET') {
      let src; try { src = new URL(url.searchParams.get('url') || ''); } catch { return json({ error: 'bad url' }, 400); }
      if (src.protocol !== 'https:' || !['upload.wikimedia.org', 'cdn.freesound.org', 'openaccess-cdn.clevelandart.org', 'images.metmuseum.org', 'api.nga.gov', 'iiif.wellcomecollection.org'].includes(src.hostname)) return json({ error: 'not an allowed source' }, 403);
      const name = (url.searchParams.get('name') || src.pathname.split('/').pop()).replace(/[^\w.\- ()]+/g, '_').slice(0, 120);
      const r = await fetch(src.toString(), { headers: { 'User-Agent': 'dein-art/0.1 (https://github.com/osmangulveren/dein-art)' } });
      if (!r.ok) return json({ error: 'source answered ' + r.status }, 502);
      return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream', 'content-disposition': `attachment; filename="${name}"`, 'cache-control': 'public, max-age=86400' } });
    }
    return json({ error: 'not found' }, 404);
  },
};
