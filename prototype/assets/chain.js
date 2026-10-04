/* What a wallet has made and what it holds, read live from Ethereum.
   - On a profile: the collections the wallet created, the tokens it minted elsewhere, and everything it holds now.
   - collection.html?contract=0x…  one collection, every token in it.
   - token.html?c=0x…&id=…         one token: its media, description, traits, owner and history.
   The data comes from Blockscout, an open-source Ethereum explorer with a public API that needs no key, and one public
   node for asking a contract who its owner is. Nothing is copied: names, images and descriptions are each token's own
   metadata, shown as the chain gives them and kept only in this browser's memory for a short while. */

const CHAIN = (() => {
  const API = 'https://eth.blockscout.com/api/v2', RPC = 'https://ethereum-rpc.publicnode.com', ZERO = '0x0000000000000000000000000000000000000000';
  const memo = {};
  // The explorer is free and has no key, so it is asked politely: three requests at a time with a short gap, and a
  // request that is told "too many" waits and tries again. One answer per address is kept for twenty minutes.
  let running = 0; const waiting = [];
  const turn = () => new Promise(go => { waiting.push(go); pump(); });
  function pump() { while (running < 3 && waiting.length) { running++; waiting.shift()(); } }
  const done = () => setTimeout(() => { running--; pump(); }, 140);
  async function ask(url, tries = 3) {
    await turn();
    try {
      const r = await fetch(url);
      if (r.status === 429 && tries > 1) { await new Promise(w => setTimeout(w, 2200)); return ask(url, tries - 1); }
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      // the older account API answers 200 with a message when it is asked too often
      if (d && d.status === '0' && /too many/i.test(d.message || '') ) { if (tries > 1) { await new Promise(w => setTimeout(w, 2600)); return ask(url, tries - 1); } throw new Error(429); }
      return d;
    } finally { done(); }
  }
  function get(url) {
    if (memo[url]) return memo[url];
    try { const hit = JSON.parse(sessionStorage.getItem('chain:' + url)); if (hit && Date.now() - hit.t < 12e5) return (memo[url] = Promise.resolve(hit.d)); } catch {}
    return (memo[url] = ask(url.startsWith('http') ? url : API + url).then(d => {
      try { const t = JSON.stringify({ t: Date.now(), d }); if (t.length < 3e5) sessionStorage.setItem('chain:' + url, t); } catch {}
      return d;
    }).catch(e => { delete memo[url]; throw e; }));
  }
  // a few at a time, so a big wallet does not flood the explorer
  async function each(list, fn, width = 4) { const out = []; let i = 0; await Promise.all(Array.from({ length: Math.min(width, list.length) }, async () => { while (i < list.length) { const k = i++; try { out[k] = await fn(list[k], k); } catch { out[k] = null; } } })); return out; }

  // Token media sits on IPFS, Arweave or anyone's server. The well-known IPFS gateways no longer serve hot-linked files, so
  // media is asked from gateways that do, pictures are shrunk by an image proxy (wsrv.nl), and each has fallbacks in order.
  const GATEWAYS = ['https://ipfs.filebase.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/'];
  const ipfsPath = u => { const t = String(u || ''), m = t.match(/^ipfs:\/\/(?:ipfs\/)?(.+)$/) || t.match(/^https?:\/\/[^/]+\/ipfs\/(.+)$/), sub = t.match(/^https?:\/\/([a-z0-9]{46,})\.ipfs\.[^/]+\/?(.*)$/); return m ? m[1] : sub ? sub[1] + (sub[2] ? '/' + sub[2] : '') : ''; };
  const gateway = (u, n = 0) => { const p = ipfsPath(u); return !u ? '' : p ? GATEWAYS[n] + p : u.startsWith('ar://') ? 'https://arweave.net/' + u.slice(5) : u; };
  // every address worth trying for one picture, best first
  const sources = (u, w) => { if (!u) return []; if (u.startsWith('data:')) return [u]; const direct = gateway(u), small = `https://wsrv.nl/?url=${encodeURIComponent(direct)}&w=${w}&output=webp`; return [...new Set([small, direct, ...(ipfsPath(u) ? [gateway(u, 1)] : [])])]; };
  const img = (u, w = 500, alt = '') => { const list = sources(u, w); return list.length ? `<img class="chainimg" src="${esc(list[0])}" data-next="${esc(list.slice(1).join(' '))}" alt="${esc(alt)}" loading="lazy" referrerpolicy="no-referrer">` : ''; };
  const isVideo = (u, t) => /video/.test(t || '') || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(u || '');
  const isAudio = (u, t) => /audio/.test(t || '') || /\.(mp3|wav|flac|ogg|m4a)(\?|$)/i.test(u || '');
  const isPage = (u, t) => /html/.test(t || '') || /\.html?(\?|$)/i.test(u || '');
  const nameOf = it => (it.metadata && it.metadata.name) || `${(it.token && it.token.name) || 'Token'} #${String(it.id).length > 12 ? String(it.id).slice(0, 6) + '…' : it.id}`;
  const picOf = it => (it.thumbnails && (it.thumbnails['500x500'] || it.thumbnails.original)) || (it.metadata && it.metadata.image) || it.image_url || (!isVideo(it.media_url, it.media_type) ? it.media_url : '') || '';
  const tokenUrl = (c, id) => `token.html?c=${c}&id=${encodeURIComponent(id)}`;
  const collectionUrl = c => 'collection.html?contract=' + c;
  const walletUrl = a => { const known = ONCHAIN.find(x => x.address === String(a).toLowerCase() && x.listed !== false); return known ? artistUrl(known.name) : 'artist.html?wallet=' + a; };
  const fmt = n => (n == null || n === '' ? '' : Number(n).toLocaleString('en-US'));
  const day = t => (t ? new Date(t).toISOString().slice(0, 10) : '');

  // a token as a card that opens the token's own page
  const card = it => {
    const c = it.token && it.token.address_hash, pic = picOf(it), vid = !pic && gateway(it.animation_url || it.media_url);
    return `<a class="card" href="${tokenUrl(c, it.id)}"><div class="thumb sq ${pic || (vid && isVideo(vid)) ? '' : 'typo'}">${pic ? img(pic, 500) : vid && isVideo(vid) ? `<video src="${esc(vid)}" muted loop playsinline preload="metadata"></video>` : `<span>${esc(nameOf(it))}</span>`}${it.value && Number(it.value) > 1 ? `<span class="badge dur">× ${fmt(it.value)}</span>` : ''}</div><h3>${esc(nameOf(it))}</h3><p>${esc((it.token && it.token.name) || 'Unnamed collection')}</p></a>`;
  };
  // A picture that does not load moves on to its next address; when none is left, the token's name stands in.
  document.addEventListener('error', e => {
    const el = e.target; if (el.tagName !== 'IMG' || !el.classList.contains('chainimg')) return;
    const next = (el.dataset.next || '').split(' ').filter(Boolean);
    if (next.length) { el.dataset.next = next.slice(1).join(' '); el.src = next[0]; return; }
    const t = el.closest('.thumb');
    if (t) { t.classList.add('typo'); el.replaceWith(Object.assign(document.createElement('span'), { textContent: (t.closest('.card') && t.closest('.card').querySelector('h3') || {}).textContent || el.alt || 'No image' })); }
    else el.replaceWith(Object.assign(document.createElement('p'), { className: 'muted small', style: 'padding:40px 20px', textContent: 'The picture for this token could not be loaded from where it is stored.' }));
  }, true);

  // What a contract is, asked from a public node in one request for many contracts: which token standard it follows,
  // what it is called, and who it names as owner (the standard owner() call).
  const text = hex => { try { const h = hex.slice(2); if (h.length <= 64) return new TextDecoder().decode(Uint8Array.from(h.match(/../g) || [], x => parseInt(x, 16))).replace(/\0+$/, ''); const len = parseInt(h.slice(64, 128), 16); return new TextDecoder().decode(Uint8Array.from(h.slice(128, 128 + len * 2).match(/../g) || [], x => parseInt(x, 16))); } catch { return ''; } };
  async function contractsInfo(contracts) {
    const out = {}; if (!contracts.length) return out;
    const CALLS = [['is721', '0x01ffc9a780ac58cd' + '0'.repeat(56)], ['is1155', '0x01ffc9a7d9b67a26' + '0'.repeat(56)], ['name', '0x06fdde03'], ['owner', '0x8da5cb5b']];
    for (let i = 0; i < contracts.length; i += 20) {
      const part = contracts.slice(i, i + 20);
      try {
        const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(part.flatMap((to, k) => CALLS.map(([, data], j) => ({ jsonrpc: '2.0', id: k * 4 + j, method: 'eth_call', params: [{ to, data }, 'latest'] })))) });
        for (const x of await r.json()) {
          const c = part[Math.floor(x.id / 4)].toLowerCase(), what = CALLS[x.id % 4][0], o = (out[c] ||= {});
          if (!x.result || x.result === '0x') continue;
          if (what === 'owner') o.owner = x.result.length >= 66 ? '0x' + x.result.slice(-40).toLowerCase() : '';
          else if (what === 'name') o.name = text(x.result).trim();
          else if (/1$/.test(x.result)) o.type = what === 'is721' ? 'ERC-721' : 'ERC-1155';
        }
      } catch {}
    }
    return out;
  }
  const ownersOf = async contracts => Object.fromEntries(Object.entries(await contractsInfo(contracts)).map(([c, o]) => [c, o.owner]));

  // who sent each transaction, asked from the node in one request
  async function sendersOf(hashes) {
    const out = {};
    for (let i = 0; i < hashes.length; i += 80) {
      const part = hashes.slice(i, i + 80);
      try {
        const r = await fetch(RPC, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(part.map((h, id) => ({ jsonrpc: '2.0', id, method: 'eth_getTransactionByHash', params: [h] }))) });
        for (const x of await r.json()) if (x.result && x.result.from) out[part[x.id]] = x.result.from.toLowerCase();
      } catch {}
    }
    return out;
  }

  /* What a wallet created, read a stretch of its history at a time.
     The wallet's incoming token transfers are read newest first; a mint counts only when the wallet sent the transaction
     itself, because anyone can mint a token to someone else's wallet or name them owner of a contract.
     collections = contracts that name the wallet as owner (made by it, or for it by a platform), plus contracts it deployed;
     minted      = tokens it minted on contracts that are not its own (a shared platform contract, or someone else's release). */
  const readers = {};
  function creations(address) {
    const a = address.toLowerCase(); if (readers[a]) return readers[a];
    const key = 'chain:made:' + a;
    let st = { pages: 0, next: null, done: false, oldest: '', mints: {}, info: {}, deployed: null };
    try { const hit = JSON.parse(sessionStorage.getItem(key)); if (hit && Date.now() - hit.t < 12e5) st = hit.d; } catch {}
    const save = () => { try { sessionStorage.setItem(key, JSON.stringify({ t: Date.now(), d: st })); } catch {} };
    const view = () => {
      const cols = [], minted = [];
      Object.entries(st.mints).forEach(([c, m]) => { const i = st.info[c] || {}; (i.owner === a ? cols : minted).push({ contract: c, name: m.name || i.name || 'Unnamed collection', type: m.type || i.type, supply: m.supply, holders: m.holders, how: 'owner', at: Math.min(...m.tokens.map(t => Date.parse(t.at) || Date.now())), tokens: m.tokens }); });
      (st.deployed || []).forEach(d => { const i = st.info[d.contract] || {}; if (i.type && !cols.some(c => c.contract === d.contract)) cols.push({ contract: d.contract, name: i.name || 'Unnamed collection', type: i.type, how: 'deployed', at: d.at, tokens: [] }); });
      cols.forEach(c => { if ((st.deployed || []).some(d => d.contract === c.contract)) c.how = 'deployed'; });
      return { collections: cols.sort((x, y) => y.at - x.at), minted: minted.filter(m => !cols.some(c => c.contract === m.contract)), pages: st.pages, oldest: st.oldest, done: st.done };
    };
    async function more(pages = 6) {
      const fresh = [];
      for (let p = 0; p < pages && !st.done; p++) {
        const d = await get(`/addresses/${a}/token-transfers?${new URLSearchParams({ type: 'ERC-721,ERC-1155', filter: 'to', ...(st.next || {}) })}`);
        st.pages++; st.next = d.next_page_params || null; if (!st.next) st.done = true;
        const items = d.items || []; if (items.length) st.oldest = items[items.length - 1].timestamp;
        fresh.push(...items.filter(t => t.from && t.from.hash === ZERO && t.token && t.total && t.total.token_id != null));
      }
      const sender = await sendersOf([...new Set(fresh.map(t => t.transaction_hash))]);
      fresh.filter(t => sender[t.transaction_hash] === a).forEach(t => {
        const c = (t.token.address_hash || t.token.address || '').toLowerCase(); if (!c) return;
        const m = (st.mints[c] ||= { name: t.token.name, type: t.token.type, supply: t.token.total_supply, holders: t.token.holders_count, tokens: [] });
        if (!m.tokens.some(x => x.id === String(t.total.token_id))) m.tokens.push({ id: String(t.total.token_id), at: t.timestamp });
      });
      // contracts the wallet deployed, from the explorer's older account list: asked once, used when it answers
      if (st.deployed === null) {
        st.deployed = [];
        try { const r = await fetch(`https://eth.blockscout.com/api?module=account&action=txlist&address=${a}&sort=asc&page=1&offset=1000`), d = await r.json();
          if (Array.isArray(d.result)) st.deployed = d.result.filter(t => t.contractAddress && (t.from || '').toLowerCase() === a && t.isError !== '1').map(t => ({ contract: t.contractAddress.toLowerCase(), at: Number(t.timeStamp) * 1000 })).slice(0, 40); } catch {}
      }
      const unknown = [...new Set([...Object.keys(st.mints), ...st.deployed.map(d => d.contract)])].filter(c => !st.info[c]);
      Object.assign(st.info, Object.fromEntries(unknown.map(c => [c, {}])), await contractsInfo(unknown));
      save();
      return view();
    }
    return (readers[a] = { more, view, started: () => st.pages > 0 });
  }
  return { API, ZERO, get, each, contractsInfo, gateway, sources, img, isVideo, isAudio, isPage, nameOf, picOf, tokenUrl, collectionUrl, walletUrl, fmt, day, card, ownersOf, creations };
})();

/* ---------- a profile: what the wallet created, and what it holds ---------- */
if (typeof subject !== 'undefined' && subject && subject.chain && $('[data-panel="wallet"]')) {
  const holder = subject.chain, { get, each, card, fmt } = CHAIN;
  const box = key => $(`[data-nft="${key}"]`);

  // created
  const made = $('[data-live="created"]');
  let madeBusy = false;
  async function loadCreated(older) {
    if (madeBusy || !made) return;
    const reader = CHAIN.creations(holder.address);
    if (reader.started() && !older) return drawCreated(reader.view());
    madeBusy = true;
    if (!reader.started()) made.innerHTML = '<p class="muted empty">Reading the chain…</p>'; else $$('[data-created-older]').forEach(b => { b.disabled = true; b.textContent = 'Reading older history…'; });
    try { drawCreated(await reader.more(6)); } catch { made.insertAdjacentHTML('beforeend', '<p class="muted small" style="margin-top:12px">The explorer did not answer. <button class="linkbtn" data-created-retry>Try again</button></p>'); }
    madeBusy = false;
  }
  const filled = {};   // the tokens of a collection, once read
  function drawCreated(d) {
    const baked = new Set((holder.collections || []).map(c => (c.contract || '').toLowerCase()).filter(Boolean));
    const plain = t => String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    // a collection already listed on the page by name is not listed twice; its tile leads to the live collection instead
    const listed = Object.fromEntries((holder.collections || []).map(c => [plain(c.name), c]));
    d.collections.forEach(c => { const hit = listed[plain(c.name)]; if (hit && !hit.contract) { c.listed = true; $$('[data-w="collections"] a.card').filter(el => plain(el.querySelector('h3').textContent) === plain(c.name)).forEach(el => { el.href = CHAIN.collectionUrl(c.contract); }); } });
    const cols = d.collections.filter(c => !baked.has(c.contract) && !c.listed), total = (holder.collections || []).length + cols.length;
    $$('[data-w="count"]').forEach(el => { el.textContent = total ? `${total} ${total === 1 ? 'collection' : 'collections'}` : ''; });
    const queue = d.minted.flatMap(m => m.tokens.map(t => ({ ...t, contract: m.contract, name: m.name }))).sort((x, y) => (Date.parse(y.at) || 0) - (Date.parse(x.at) || 0));
    const reach = `<p class="muted small" style="margin-top:18px">${d.done ? 'The whole history of this wallet has been read.' : `Read so far: the wallet's latest ${fmt(d.pages * 50)} incoming token transfers${d.oldest ? ', back to ' + CHAIN.day(d.oldest) : ''}. <button class="btn small" data-created-older style="margin-left:8px">Read older history</button>`}</p>`;
    made.innerHTML = (cols.length ? `
      <div class="sec"${(holder.collections || []).length ? '' : ' style="margin-top:0"'}><h2>Collections created by this wallet</h2><p>${cols.length} · read live from Ethereum</p></div>
      <div class="chaincols">${cols.map((c, i) => `<section class="chaincol" data-col="${c.contract}">
        <div class="chainhead"><div><b><a href="${CHAIN.collectionUrl(c.contract)}">${esc(c.name)}</a></b><span class="muted small">${[c.type, c.supply && fmt(c.supply) + ' tokens', c.holders && fmt(c.holders) + ' holders', c.at && 'since ' + new Date(c.at).getFullYear(), c.how === 'deployed' ? 'deployed by this wallet' : 'the contract names this wallet as its owner'].filter(Boolean).join(' · ')}</span></div>
          <a class="btn small" href="${CHAIN.collectionUrl(c.contract)}">Open collection</a></div>
        <div class="grid tokens" data-col-tokens>${filled[c.contract] || (i < 6 ? '<p class="muted small">Loading tokens…</p>' : `<p><button class="btn small" data-col-load="${c.contract}">Show its tokens</button></p>`)}</div></section>`).join('')}</div>` : '')
      + (queue.length ? `
      <div class="sec"><h2>Minted on other contracts</h2><p>${queue.length} ${queue.length === 1 ? 'token' : 'tokens'} · ${d.minted.length} ${d.minted.length === 1 ? 'contract' : 'contracts'}</p></div>
      <p class="muted small" style="margin:-6px 0 14px">Tokens this wallet minted itself on a contract it does not own: work made on a shared platform contract, or pieces minted from someone else's release.</p>
      <div class="grid tokens" data-minted></div><div class="more" data-minted-more hidden><button class="btn">Show more</button></div>` : '')
      + (!cols.length && !queue.length && !(holder.collections || []).length ? `<p class="muted empty">${d.done ? 'This wallet has not created or minted any NFTs on Ethereum.' : 'Nothing created or minted by this wallet in the part of its history read so far.'}</p>` : '')
      + reach;
    // the first tokens of each collection: the first six straight away, the rest when asked for
    const fill = c => get(`/tokens/${c.contract}/instances`).then(r => {
      const items = (r.items || []).map(it => ({ ...it, token: it.token || { address_hash: c.contract, name: c.name } }));
      filled[c.contract] = items.slice(0, 8).map(card).join('') || '<p class="muted small">No tokens have been minted in this collection yet.</p>';
    }).catch(() => { filled[c.contract] = ''; return `<p class="muted small">Could not read this collection right now. <a class="link" href="${CHAIN.collectionUrl(c.contract)}">Open it</a></p>`; })
      .then(err => { const el = $(`[data-col="${c.contract}"] [data-col-tokens]`); if (el) el.innerHTML = filled[c.contract] || err; });
    each(cols.slice(0, 6).filter(c => !filled[c.contract]), fill, 2);
    made.onclick = e => {
      const b = e.target.closest('[data-col-load]');
      if (b) { const c = cols.find(x => x.contract === b.dataset.colLoad); b.closest('[data-col-tokens]').innerHTML = '<p class="muted small">Loading tokens…</p>'; fill(c); }
      if (e.target.closest('[data-minted-more] button')) more();
    };
    // tokens minted elsewhere, newest first, a dozen at a time
    let shown = 0;
    const more = async () => {
      const part = queue.slice(shown, shown + 12); shown += part.length;
      const got = await each(part, t => get(`/tokens/${t.contract}/instances/${t.id}`).then(it => ({ ...it, token: it.token || { address_hash: t.contract, name: t.name } })));
      const grid = $('[data-minted]'); if (!grid) return;
      grid.insertAdjacentHTML('beforeend', got.filter(Boolean).map(card).join('')); $('[data-minted-more]').hidden = shown >= queue.length;
    };
    if (queue.length) more();
  }

  // held now
  const items = [], seen = new Set();
  let next = null, hidden = 0, loading = false, started = false, showAll = false;
  // A token is shown when it carries a name or an image; airdropped spam usually has neither.
  const useful = it => !!(it.image_url || it.media_url || it.animation_url || (it.metadata && it.metadata.name));
  function draw() {
    const shown = items.filter(it => showAll || useful(it)), groups = {};
    shown.forEach(it => { (groups[(it.token && it.token.address_hash) || '?'] ||= []).push(it); });
    box('count').textContent = `${items.length}${next ? '+' : ''} tokens · ${Object.keys(groups).length} collections`;
    box('note').innerHTML = `Read live from the public chain via <a class="link" href="https://eth.blockscout.com/address/${holder.address}?tab=tokens_nfts" target="_blank" rel="noopener">Blockscout</a>. Names, images and descriptions are each token's own metadata.${hidden && !showAll ? ` ${hidden} tokens without a name or image are hidden. <button class="linkbtn" data-nft-all>Show them</button>` : ''}`;
    box('list').innerHTML = shown.length ? Object.values(groups).map(g => { const c = g[0].token && g[0].token.address_hash; return `
      <div class="chainhead" style="margin-top:26px"><div><b><a href="${CHAIN.collectionUrl(c)}">${esc((g[0].token && g[0].token.name) || 'Unnamed collection')}</a></b><span class="muted small">${g.length} ${g.length === 1 ? 'token' : 'tokens'} held · ${esc(g[0].token_type || '')} · <span class="mono">${short(c || '')}</span></span></div>
        <a class="btn small" href="${CHAIN.collectionUrl(c)}">Open collection</a></div>
      <div class="grid tokens">${g.map(card).join('')}</div>`; }).join('')
      : `<p class="muted empty">${loading ? 'Reading the chain…' : 'This wallet holds no NFTs on Ethereum.'}</p>`;
    box('more').hidden = !next;
  }
  async function load() {
    if (loading) return;
    loading = true; box('more').querySelector('button').textContent = 'Loading…'; if (!items.length) draw();
    try {
      const d = await get(`/addresses/${holder.address}/nft?${new URLSearchParams({ type: 'ERC-721,ERC-1155,ERC-404', ...(next || {}) })}`);
      for (const it of d.items || []) { const key = `${it.token && it.token.address_hash}:${it.id}`; if (seen.has(key)) continue; seen.add(key); items.push(it); if (!useful(it)) hidden++; }
      next = d.next_page_params || null;
    } catch { box('note').innerHTML = 'The explorer did not answer. <button class="linkbtn" data-nft-retry>Try again</button>'; loading = false; return; }
    loading = false; box('more').querySelector('button').textContent = 'Load more'; draw();
  }
  // Each tab reads the chain when it is first opened, so the rest of the page does not wait for it.
  const start = () => { if (!started) { started = true; load(); } };
  document.addEventListener('click', e => {
    if (e.target.closest('.tab[data-tab="wallet"]')) start();
    if (e.target.closest('.tab[data-tab="collections"]')) loadCreated();
    if (e.target.closest('[data-created-retry]')) { e.target.closest('p').remove(); loadCreated(true); }
    if (e.target.closest('[data-created-older]')) loadCreated(true);
    if (e.target.closest('[data-nft="more"] button')) load();
    if (e.target.closest('[data-nft-all]')) { showAll = true; draw(); }
    if (e.target.closest('[data-nft-retry]')) load();
  });
  if (location.hash === '#wallet') start();
  if (location.hash === '#collections') loadCreated();
  // a wallet with no films opens on what it made
  if (!location.hash && !subject.films.length && !(holder.film) && $('.tab[data-tab="collections"]')) { $('.tab[data-tab="collections"]').click(); }

  // every ENS name on the wallet, in the record
  ensNamesOf(holder.address).then(({ names }) => {
    const mine = names.filter(n => n.owns).map(n => n.name), list = [...new Set([holder.ens, ...mine.filter(n => n.split('.').length <= 2 || mine.includes(n.split('.').slice(-2).join('.')))].filter(Boolean))];
    const dl = $('[data-p="facts"]'); if (!dl || list.length < 2) return;
    const dt = [...dl.querySelectorAll('dt')].find(x => x.textContent === 'ENS');
    const html = list.slice(0, 12).map(n => esc(n)).join(', ') + (list.length > 12 ? ` and ${list.length - 12} more` : '');
    if (dt) { dt.textContent = 'ENS names'; dt.nextElementSibling.innerHTML = html; } else dl.insertAdjacentHTML('beforeend', `<dt>ENS names</dt><dd>${html}</dd>`);
  });
}

/* ---------- one collection, read from its contract ---------- */
if (page === 'collection' && /^0x[0-9a-fA-F]{40}$/.test(param('contract') || '')) (async () => {
  const c = param('contract').toLowerCase(), { get, card, fmt } = CHAIN;
  const set = (key, html) => $$(`[data-c="${key}"]`).forEach(el => { el.innerHTML = html; });
  const ext = (href, label, cls = 'link') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  set('name', 'Reading the chain…');
  let t, info;
  try { [t, info] = await Promise.all([get('/tokens/' + c), get('/addresses/' + c).catch(() => ({}))]); } catch { set('name', 'Collection not found'); set('about', 'No NFT collection was found at this contract address on Ethereum.'); set('acts', ext('https://etherscan.io/address/' + c, 'See the address on Etherscan ↗', 'btn')); return; }
  const owner = (await CHAIN.ownersOf([c]))[c], deployer = (info.creator_address_hash || '').toLowerCase(), by = owner && owner !== CHAIN.ZERO ? owner : deployer;
  document.title = `${t.name || 'Collection'} — dein.art`;
  set('name', esc(t.name || 'Unnamed collection'));
  set('back', by ? `<a class="muted small" href="${CHAIN.walletUrl(by)}#collections">← ${ensTag(by)}</a>` : '<a class="muted small" href="index.html">← Home</a>');
  if (by) { const known = ONCHAIN.find(x => x.address === by && x.listed !== false);
    set('by', `<a class="who" href="${CHAIN.walletUrl(by)}"><b>${known ? esc(known.name) : ensTag(by, '')}</b><span class="muted small">${owner === by ? 'Owner of the contract' : 'Deployed the contract'} · ${ensTag(by)}</span></a>`); }
  set('about', `${esc(t.type || 'NFT')} collection on Ethereum${t.symbol ? `, symbol ${esc(t.symbol)}` : ''}. Everything on this page is read live from the contract and each token's own metadata.`);
  set('facts', [['Standard', esc(t.type || '')], ['Tokens', fmt(t.total_supply)], ['Holders', fmt(t.holders_count)], ['Contract', ext('https://etherscan.io/address/' + c, `<span class="mono">${short(c)}</span>`) + ' ' + copyBtn(c)],
    ['Owner', owner && owner !== CHAIN.ZERO && `<a class="link" href="${CHAIN.walletUrl(owner)}">${ensTag(owner)}</a>`], ['Deployed by', deployer && deployer !== owner && `<a class="link" href="${CHAIN.walletUrl(deployer)}">${ensTag(deployer)}</a>`]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  set('acts', ext('https://etherscan.io/token/' + c, 'Etherscan ↗', 'btn primary') + ext('https://eth.blockscout.com/token/' + c, 'Blockscout ↗', 'btn') + ext('https://opensea.io/assets/ethereum/' + c, 'OpenSea ↗', 'btn'));
  set('pieces', `<div class="sec"><h2>Tokens</h2><p data-c-count></p></div><div class="grid tokens" data-c-grid></div><div class="more" data-c-more hidden><button class="btn">Load more</button></div>`);
  let next = null, n = 0, cover = false;
  const more = async () => {
    const btn = $('[data-c-more] button'); btn.textContent = 'Loading…';
    let d; try { d = await get(`/tokens/${c}/instances${next ? '?' + new URLSearchParams(next) : ''}`); } catch { $('[data-c-count]').textContent = 'The explorer did not answer.'; btn.textContent = 'Try again'; $('[data-c-more]').hidden = false; return; }
    const items = (d.items || []).map(it => ({ ...it, token: it.token || { address_hash: c, name: t.name } }));
    if (!cover && items.length) { cover = true; const pic = CHAIN.picOf(items[0]); set('cover', `<div class="thumb sq ${pic ? '' : 'typo'}">${pic ? CHAIN.img(pic, 900) : `<span>${esc(t.name || '')}</span>`}</div>`); }
    $('[data-c-grid]').insertAdjacentHTML('beforeend', items.map(card).join('')); n += items.length; next = d.next_page_params || null;
    $('[data-c-count]').textContent = n ? `${fmt(n)}${next ? ' of ' + (fmt(t.total_supply) || 'many') : ''} shown` : 'No tokens minted yet';
    $('[data-c-more]').hidden = !next; btn.textContent = 'Load more';
  };
  document.addEventListener('click', e => { if (e.target.closest('[data-c-more] button')) more(); });
  set('cover', `<div class="thumb sq typo"><span>${esc(t.name || '')}</span></div>`);
  more();
})();

/* ---------- one token ---------- */
if (page === 'token') (async () => {
  const c = (param('c') || '').toLowerCase(), id = param('id') || '', { get, gateway, fmt, day } = CHAIN;
  const put = (key, html) => $$(`[data-t="${key}"]`).forEach(el => { el.innerHTML = html; });
  const ext = (href, label, cls = 'link') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  const who_ = a => `<a class="link" href="${CHAIN.walletUrl(a)}">${ensTag(a)}</a>`;
  if (!/^0x[0-9a-f]{40}$/.test(c) || !id) { put('title', 'Token not found'); return; }
  put('title', 'Reading the chain…');
  let it; try { it = await get(`/tokens/${c}/instances/${encodeURIComponent(id)}`); } catch { put('title', 'Token not found'); put('desc', `<p class="muted">No token ${esc(id)} was found on this contract. ${ext('https://etherscan.io/address/' + c, 'See the contract on Etherscan')}.</p>`); return; }
  const m = it.metadata || {}, tk = it.token || {}, name = CHAIN.nameOf(it), pic = m.image || it.image_url || '', anim = gateway(m.animation_url || it.animation_url || (CHAIN.isVideo(it.media_url, it.media_type) ? it.media_url : ''));
  document.title = `${name} — dein.art`;
  put('crumbs', `<a href="${CHAIN.collectionUrl(c)}">${esc(tk.name || 'Collection')}</a> › ${esc(name)}`);
  put('kind', esc(tk.type || 'NFT'));
  put('title', esc(name));
  put('collection', `<a class="who" href="${CHAIN.collectionUrl(c)}"><b>${esc(tk.name || 'Unnamed collection')}</b><span class="muted small">${[tk.total_supply && fmt(tk.total_supply) + ' tokens', tk.holders_count && fmt(tk.holders_count) + ' holders'].filter(Boolean).join(' · ') || 'Collection'}</span></a>`);
  // the work itself: a film or a sound plays, a page of code runs in a closed frame, anything else is a picture
  put('media', anim && CHAIN.isVideo(anim, it.media_type) ? `<div class="itemshot"><video src="${esc(anim)}" controls loop playsinline poster="${esc(CHAIN.sources(pic, 1200)[0] || '')}"></video></div>`
    : anim && CHAIN.isAudio(anim, it.media_type) ? `<div class="itemshot sound">${pic ? CHAIN.img(pic, 900) : ''}<audio controls preload="none" src="${esc(anim)}"></audio></div>`
    : anim && CHAIN.isPage(anim, it.media_type) ? `<div class="itemshot live"><iframe src="${esc(anim)}" sandbox="allow-scripts" loading="lazy" referrerpolicy="no-referrer" title="${esc(name)}"></iframe></div><p class="muted small" style="margin-top:8px">This piece is code that runs in the page. ${ext(esc(anim), 'Open it on its own ↗')}</p>`
    : pic ? `<div class="itemshot">${CHAIN.img(pic, 1400, name)}</div>` : `<div class="itemshot"><div class="thumb sq typo" style="width:60%"><span>${esc(name)}</span></div></div>`);
  const attrs = Array.isArray(m.attributes) ? m.attributes.filter(a => a && a.value !== undefined && a.value !== '').slice(0, 60) : [];
  put('desc', (m.description ? `<div class="sec"><h2>About this piece</h2></div><p class="lead tokentext">${esc(String(m.description))}</p>` : '')
    + (attrs.length ? `<div class="sec"><h2>Traits</h2><p>${attrs.length}</p></div><div class="traits">${attrs.map(a => `<span><small>${esc(a.trait_type ?? '')}</small>${esc(typeof a.value === 'object' ? JSON.stringify(a.value) : a.value)}</span>`).join('')}</div>` : ''));
  const owner = it.owner && it.owner.hash;
  const facts = [['Collection', `<a class="link" href="${CHAIN.collectionUrl(c)}">${esc(tk.name || 'Unnamed')}</a>`], ['Token ID', `<span class="mono">${esc(String(id).length > 20 ? String(id).slice(0, 8) + '…' + String(id).slice(-6) : id)}</span> ${copyBtn(String(id))}`],
    ['Standard', esc(tk.type || '')], ['Owner', owner && who_(owner)], ['Contract', ext('https://etherscan.io/address/' + c, `<span class="mono">${short(c)}</span>`) + ' ' + copyBtn(c)]];
  const drawFacts = extra => put('facts', [...facts, ...extra].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  drawFacts([]);
  put('acts', ext(`https://opensea.io/assets/ethereum/${c}/${id}`, 'OpenSea ↗', 'btn primary') + ext(`https://etherscan.io/nft/${c}/${id}`, 'Etherscan ↗', 'btn') + ext(`https://eth.blockscout.com/token/${c}/instance/${id}`, 'Blockscout ↗', 'btn') + (it.external_app_url || m.external_url ? ext(esc(it.external_app_url || m.external_url), 'Project ↗', 'btn') : ''));
  put('raw', `<details class="fold"><summary><span><b>Raw metadata</b><span class="muted small">As stored for this token</span></span></summary><pre class="proofbox">${esc(JSON.stringify(m, null, 2)).slice(0, 12000)}</pre></details>`);
  // where it has been: minted, then every hand it passed through
  try {
    const tr = await get(`/tokens/${c}/instances/${encodeURIComponent(id)}/transfers`), list = tr.items || [];
    const mint = [...list].reverse().find(x => x.from && x.from.hash === CHAIN.ZERO);
    if (mint) drawFacts([['Minted', day(mint.timestamp)], ['Minted to', who_(mint.to.hash)]]);
    put('history', list.length ? `<div class="sec"><h2>History</h2><p>${list.length}${tr.next_page_params ? '+' : ''} ${list.length === 1 ? 'transfer' : 'transfers'}</p></div><div class="rows">${list.map(x => `<div class="row"><div class="info"><b>${x.from.hash === CHAIN.ZERO ? 'Minted to ' + who_(x.to.hash) : `${who_(x.from.hash)} → ${who_(x.to.hash)}`}</b><span class="muted small">${[day(x.timestamp), x.method && !/^0x/.test(x.method) && esc(x.method), x.total && x.total.value && Number(x.total.value) > 1 && '× ' + fmt(x.total.value)].filter(Boolean).join(' · ')}</span></div>${ext('https://etherscan.io/tx/' + x.transaction_hash, 'Transaction ↗', 'btn small')}</div>`).join('')}</div>` : '');
  } catch {}
  // more from the same collection
  try {
    const r = await get(`/tokens/${c}/instances`), others = (r.items || []).filter(x => String(x.id) !== String(id)).slice(0, 4).map(x => ({ ...x, token: x.token || { address_hash: c, name: tk.name } }));
    put('more', others.length ? `<div class="sec"><h2>More from ${esc(tk.name || 'this collection')}</h2><a href="${CHAIN.collectionUrl(c)}">See all</a></div><div class="grid tokens">${others.map(CHAIN.card).join('')}</div>` : '');
  } catch {}
})();
