/* The marketplace and its item pages.
   One catalogue (MARKET in app.js) holds everything shared or offered: footage, music, sound effects, photos,
   templates and merch. Each item has its own page; free items download from dein.art itself. */

const CATS = ['Footage', 'Music', 'Sound effects', 'Photos & images', 'Templates', 'Scripts & documents', 'Merch'].filter(c => MARKET.some(it => it.cat === c));
const bytes = n => !n ? '' : n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
// a free file is fetched through dein.art when it lives on Wikimedia Commons, so the visitor never leaves the site
const downloadUrl = f => /^https:\/\/(upload\.wikimedia\.org|cdn\.freesound\.org)\//.test(f.url) && !f.direct ? `/api/download?url=${encodeURIComponent(f.url)}&name=${encodeURIComponent(f.name)}` : f.url;

/* ---------- the marketplace ---------- */
if ($('[data-shop="grid"]')) {
  const state = { cat: param('cat') || 'All', sub: param('sub') || '', q: param('q') || '', price: 'all', film: false, sort: 'featured', shown: 24 };
  if (param('kind')) state.cat = { Image: 'Photos & images' }[param('kind')] || param('kind');
  const el = k => $(`[data-shop="${k}"]`);
  // every word typed has to start a word of the item, as in the search box at the top: "rain" finds rain, not "train"
  const plain = t => String(t || '').toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const wordsIn = (q, text) => { const hay = ' ' + plain(text); return plain(q).split(/\s+/).filter(Boolean).every(w => hay.search(new RegExp('[^a-z0-9]' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) >= 0); };
  const match = it => (state.cat === 'All' || it.cat === state.cat) && (!state.sub || it.sub === state.sub) && (state.price === 'all' || (state.price === 'free') === !it.price) && (!state.film || (it.film && film[it.film]))
    && (!state.q || wordsIn(state.q, [it.title, it.by, it.cat, it.sub, it.desc, it.specs && it.specs.Tags, ...(it.works || [])].join(' ')));
  function draw() {
    const count = (c, s) => MARKET.filter(it => (c === 'All' || it.cat === c) && (!s || it.sub === s)).length;
    el('cats').innerHTML = ['All', ...CATS].map(c => {
      const subs = c !== 'All' && state.cat === c ? [...new Set(MARKET.filter(it => it.cat === c).map(it => it.sub))] : [];
      return `<button class="shopcat${state.cat === c && !state.sub ? ' on' : ''}" data-cat="${c}"><span>${c}</span><small>${count(c)}</small></button>` +
        subs.map(sb => `<button class="shopcat sub${state.sub === sb ? ' on' : ''}" data-cat="${c}" data-sub="${esc(sb)}"><span>${sb}</span><small>${count(c, sb)}</small></button>`).join('');
    }).join('');
    el('price').innerHTML = [['all', 'All prices'], ['free', 'Free'], ['paid', 'Paid']].map(([k, l]) => `<button class="chip${state.price === k ? ' on' : ''}" data-price="${k}">${l}</button>`).join('');
    let items = MARKET.filter(match);
    if (state.sort === 'az') items = [...items].sort((a, b) => a.title.localeCompare(b.title));
    if (state.sort === 'low') items = [...items].sort((a, b) => (a.price || 0) - (b.price || 0));
    if (state.sort === 'high') items = [...items].sort((a, b) => (b.price || 0) - (a.price || 0));
    el('count').textContent = `${items.length} ${items.length === 1 ? 'item' : 'items'}${state.cat !== 'All' ? ' in ' + (state.sub || state.cat) : ''}${state.q ? ` for “${state.q}”` : ''}`;
    el('grid').innerHTML = items.slice(0, state.shown).map(cards.assets).join('') || '<p class="muted empty">Nothing matches. Try another category or fewer filters.</p>';
    el('more').hidden = items.length <= state.shown;
    const url = new URL(location.href); url.search = ''; if (state.cat !== 'All') url.searchParams.set('cat', state.cat); if (state.sub) url.searchParams.set('sub', state.sub); if (state.q) url.searchParams.set('q', state.q);
    history.replaceState(null, '', url);
  }
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-price]');
    if (c) { state.cat = c.dataset.cat; state.sub = c.dataset.sub || ''; state.shown = 24; draw(); }
    if (p) { state.price = p.dataset.price; state.shown = 24; draw(); }
    if (e.target.closest('[data-shop="more"] button')) { state.shown += 24; draw(); }
  });
  el('q').value = state.q;
  el('q').addEventListener('input', e => { state.q = e.target.value.trim(); state.shown = 24; draw(); });
  el('film').addEventListener('change', e => { state.film = e.target.checked; draw(); });
  el('sort').addEventListener('change', e => { state.sort = e.target.value; draw(); });
  draw();
}

/* ---------- one item ---------- */
if ($('[data-i="title"]')) {
  const it = marketItem(param('id')) || MARKET[0];
  const put = (k, html) => $$(`[data-i="${k}"]`).forEach(el => { el.innerHTML = html; });
  const f = it.film && film[it.film], free = !it.price, files = it.files || [];
  document.title = `${it.title} — dein.art`;
  put('crumbs', `<a href="market.html">Marketplace</a> › <a href="market.html?cat=${encodeURIComponent(it.cat)}">${it.cat}</a> › <a href="market.html?cat=${encodeURIComponent(it.cat)}&sub=${encodeURIComponent(it.sub)}">${it.sub}</a>`);
  put('kind', it.sub === 'Packs' ? 'Sound pack' : it.cat === 'Merch' ? (PRODUCTS[it.type] || 'Merch') : it.sub);
  put('title', esc(it.title));
  const page = artistUrl(it.by), studio = it.by === 'dein.art Studio';
  put('by', `${who[it.by] ? `<a href="${page}">${avatar(it.by)}</a>` : `<span class="avatar" style="background:${tone(it.by)}">${initials(it.by)}</span>`}<span class="who"><b>${who[it.by] ? `<a href="${page}">${esc(it.by)}</a>` : esc(it.by)}</b><span class="muted small">${it.perf ? 'Performed by ' + esc(it.perf) : studio ? 'Made by dein.art for creators' : it.cat === 'Merch' ? 'Offered by the creator' : it.lib ? 'Free library · from ' + (it.sourceName || 'Wikimedia Commons') : 'Shared on dein.art'}</span></span>`);
  put('price', free ? '<b class="free">Free</b><span class="muted small">' + esc(it.lic) + '</span>' : `<b>$${it.price}</b><span class="muted small">${it.cat === 'Merch' ? 'plus shipping · made to order' : esc(it.lic)}</span>`);

  // the preview: a picture (with a gallery), a player, or the product itself
  const gallery = it.gallery || [];
  const media = it.kind === 'merch' ? `<div class="itemshot merch">${mockup(it)}</div>`
    : it.kind === 'video' ? `<div class="itemshot"><video controls playsinline preload="metadata" poster="${it.pic}">${it.video ? `<source src="${it.video}" type="${/\.mp4$/.test(it.video) ? 'video/mp4' : 'video/webm'}">` : ''}${it.mov ? `<source src="${it.mov}" type="video/quicktime">` : ''}</video></div>`
    : it.kind === 'audio' || it.kind === 'pack' ? `<div class="itemshot sound">${it.pic ? `<img src="${it.pic}" alt="">` : `<span class="soundwave big" aria-hidden="true">${'<i></i>'.repeat(34)}</span>`}<audio controls preload="none" src="${it.audio || ''}"></audio></div>`
    : `<div class="itemshot${it.dark ? ' darkbg' : ''}"><img data-i-main src="${it.big || gallery[0] || it.pic}" alt=""></div>`;
  put('media', media + (gallery.length ? `<div class="itemthumbs">${gallery.map((g, i) => `<button class="ithumb${i ? '' : ' on'}${it.dark ? ' darkbg' : ''}" data-g="${g}"><img src="${g}" alt="" loading="lazy"></button>`).join('')}</div>` : ''));

  // merch: size and colour
  if (it.kind === 'merch') put('options', `${['tee', 'hoodie'].includes(it.type) ? `<p class="edlabel">Size</p><div class="sizes">${['S', 'M', 'L', 'XL'].map((sz, i) => `<button class="pick${i === 1 ? ' on' : ''}" data-size="${sz}">${sz}</button>`).join('')}</div>` : ''}
    <p class="edlabel">Colour</p><div class="swatches">${Object.entries(COLOURS).map(([k, [b]]) => `<button class="swatch${it.colour === k ? ' on' : ''}" data-colour="${k}" style="background:${b}" aria-label="${k}"></button>`).join('')}</div>`);

  put('acts', free
    ? (files.length === 1 && !files[0].url ? `<button class="btn primary big" disabled>↓ Download · ${bytes(files[0].size)}</button>` : files.length === 1 ? `<a class="btn primary big" data-magnetic href="${downloadUrl(files[0])}" download="${esc(files[0].name)}"><span class="mag-in">↓ Download${files[0].size ? ' · ' + bytes(files[0].size) : ''}</span></a>` : `<a class="btn primary big" href="#files">↓ Download · ${files.length} files</a>`)
      + `<button class="btn" data-pay="support" data-title="Thank ${esc(it.by)}" data-creator="${esc(it.by)}">♥ Say thanks</button>`
    : `<button class="btn primary big" data-pay="${it.kind === 'merch' ? 'merch' : 'buy'}" data-title="${esc(it.title)}" data-price="${it.price}" data-creator="${esc(it.by)}" ${it.creator === ME ? 'data-split' : ''}>${it.kind === 'merch' ? 'Order' : 'Buy'} · $${it.price}</button>`);
  put('note', it.mine && files.some(x => !x.url) ? 'Prototype: this file stayed on your computer, so it cannot be downloaded here yet.' : free ? 'Free to download and use. No account needed.' : it.kind === 'merch' ? 'Printed on demand and shipped to you. Prototype: nothing is charged.' : 'Yours right after payment. Prototype: nothing is charged.');
  put('facts', Object.entries({ Category: `${it.cat} · ${it.sub}`, ...(it.specs || {}), Licence: it.lic }).filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')
    + (it.collection ? `<dt>Collection</dt><dd><a class="link" href="${it.collection.url}">${esc(it.collection.name)}</a></dd>` : ''));
  put('works', (it.works || []).length ? `<p class="edlabel" style="flex-basis:100%;margin:0">Works with</p>${it.works.map(w => `<span>${w}</span>`).join('')}` : '');
  put('desc', `<div class="sec" style="margin-top:0"><h2>About this ${it.cat === 'Merch' ? 'product' : it.sub === 'Packs' ? 'pack' : 'item'}</h2></div><p class="lead">${esc(it.desc || '')}</p>${it.source ? `<p class="muted small" style="margin-top:10px">Original file from <a class="link" href="${it.source}" target="_blank" rel="noopener">${it.sourceName || 'Wikimedia Commons'}</a>, ${it.lic === 'CC0' ? 'CC0' : esc(it.lic).toLowerCase()}.</p>` : ''}`);
  put('contents', it.contents ? `<div class="sec"><h2>In this pack</h2><p>${it.contents.length} sounds</p></div><div class="rows">${it.contents.map(c => `<div class="row"><button class="btn icon" data-audio="${c.audio}" aria-label="Play ${esc(c.title)}">▶</button><div class="info"><b>${esc(c.title)}</b><span class="muted small">${c.length}</span></div><a class="btn" href="item.html?id=${c.id}">Open</a></div>`).join('')}</div>` : '');
  put('files', files.length && (free || it.mine) ? `<div class="sec" id="files"><h2>${files.length === 1 ? 'File' : 'Files'}</h2></div><div class="rows">${files.map(x => `<div class="row"><div class="info"><b>${esc(x.name)}</b><span class="muted small">${[bytes(x.size), x.note].filter(Boolean).map(esc).join(' · ')}</span></div>${!free ? '' : x.url ? `<a class="btn dark" href="${downloadUrl(x)}" download="${esc(x.name)}">↓ Download</a>` : '<span class="muted small">Not uploaded</span>'}</div>`).join('')}</div>` : '');
  if (it.mine) put('own', `<div class="box tp-own"><span><b>You shared this on ${it.added}</b><br><span class="muted small">Prototype: it is kept in this browser.</span></span><button class="btn" data-own-x>Remove</button></div>`);
  // only when the item really belongs to a film
  put('film', f ? `<div class="panel filmlink"><h3>From the film</h3><a class="next" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f, f.at, 330)}" alt=""><span class="badge dur">${f.dur}</span></div><div><h3>${f.title}</h3><p class="muted small">${byline(f)}<br>${f.year} · ${f.kind}</p></div></a><a class="btn wide" href="${watchUrl(f)}" style="margin-top:12px">▶ Watch the film</a></div>` : '');
  const same = MARKET.filter(x => x !== it && x.creator === it.creator).slice(0, 8), like = MARKET.filter(x => x !== it && x.sub === it.sub && x.creator !== it.creator).concat(MARKET.filter(x => x !== it && x.cat === it.cat && x.sub !== it.sub)).slice(0, 8);
  put('more', (same.length ? `<div class="sec"><h2>More from ${esc(it.by)}</h2></div><div class="grid">${same.slice(0, 4).map(cards.assets).join('')}</div>` : '') + (like.length ? `<div class="sec"><h2>More ${it.cat.toLowerCase()}</h2><a href="market.html?cat=${encodeURIComponent(it.cat)}">See all</a></div><div class="grid">${like.slice(0, 4).map(cards.assets).join('')}</div>` : ''));

  document.addEventListener('click', e => {
    if (e.target.closest('[data-own-x]') && confirm(`Remove “${it.title}” from the marketplace?`)) { try { localStorage.setItem('shared', JSON.stringify((JSON.parse(localStorage.getItem('shared')) || []).filter(x => x.id !== it.id))); } catch {} location.href = 'market.html'; }
    const g = e.target.closest('[data-g]'), sz = e.target.closest('[data-size]'), col = e.target.closest('[data-colour]');
    if (g) { $('[data-i-main]').src = g.dataset.g; $$('.ithumb').forEach(b => b.classList.toggle('on', b === g)); }
    if (sz) $$('[data-size]').forEach(b => b.classList.toggle('on', b === sz));
    if (col) { it.colour = col.dataset.colour; $('.itemshot.merch').innerHTML = mockup(it); $$('[data-colour]').forEach(b => b.classList.toggle('on', b === col)); }
  });
}
