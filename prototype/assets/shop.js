/* The marketplace and its item pages.
   One catalogue (MARKET in app.js) holds everything shared or offered: footage, music, sound effects, photos,
   templates and merch. Each item has its own page; free items download from dein.art itself. */

const CATS = ['Footage', 'Music', 'Sound effects', 'Photos & images', 'Templates', 'Scripts & documents', 'Merch'];
const bytes = n => !n ? '' : n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
// a free file is fetched through dein.art when it lives on Wikimedia Commons, so the visitor never leaves the site
const downloadUrl = f => /^https:\/\/(upload\.wikimedia\.org|cdn\.freesound\.org)\//.test(f.url) && !f.direct ? `/api/download?url=${encodeURIComponent(f.url)}&name=${encodeURIComponent(f.name)}` : f.url;

/* ---------- what the filters and the cards read off an item ---------- */
const secsOf = it => { if (it.secs == null) { const t = String((it.specs && it.specs.Length) || it.dur || '').split(' ')[0].split(':').map(Number); it.secs = t.length > 1 && !t.some(isNaN) ? t.reduce((x, n) => x * 60 + n, 0) : 0; } return it.secs; };
const dimsOf = it => { if (!it.dims) { const m = it.w ? [0, String(it.w), String(it.h)] : String((it.specs && (it.specs.Size || it.specs.Length)) || '').match(/([\d,]+) × ([\d,]+)/); it.dims = m ? [Number(m[1].replace(/,/g, '')), Number(m[2].replace(/,/g, ''))] : [0, 0]; } return it.dims; };
const extOf = it => it.ext || (it.ext = ((((it.files || [])[0] || {}).name || '').split('.').pop() || '').toUpperCase().slice(0, 5));
const licOf = it => (/cc0/i.test(it.lic) ? 'cc0' : /public domain/i.test(it.lic) ? 'pd' : 'other');
const lenOf = it => it.dur || String((it.specs && it.specs.Length) || '').split(' ')[0].replace(/[,;]$/, '');
// a scanned book or bound volume opens on its blank binding, so it gets a drawn cover; single magazine issues show their own
const drawnCover = it => it.cat === 'Scripts & documents' && it.lib && !/\d{4}-\d{2}/.test(it.title);

/* ---------- saved for later: a heart on every card, kept in this browser ---------- */
const saved = new Set((() => { try { return JSON.parse(localStorage.getItem('saved')) || []; } catch { return []; } })());
const saveBtn = (it, cls = '') => `<button class="save ${cls}${saved.has(it.id) ? ' on' : ''}" data-save="${esc(it.id)}" aria-label="Save for later" title="Save for later">${saved.has(it.id) ? '♥' : '♡'}</button>`;
document.addEventListener('click', e => {
  const b = e.target.closest('[data-save]'); if (!b) return;
  e.preventDefault(); e.stopPropagation();
  const id = b.dataset.save; saved.has(id) ? saved.delete(id) : saved.add(id);
  try { localStorage.setItem('saved', JSON.stringify([...saved])); } catch {}
  $$('[data-save]').filter(x => x.dataset.save === id).forEach(x => { x.classList.toggle('on', saved.has(id)); x.firstChild.textContent = saved.has(id) ? '♥' : '♡'; });
  document.dispatchEvent(new CustomEvent('saved-changed'));
}, true);

/* ---------- a card, and a row for things you listen to ---------- */
function shopCard(a, inCat) {
  // documents stand upright among other documents; in a mixed row they lie like everything else
  const doc = a.cat === 'Scripts & documents' && inCat !== false, [w, h] = dimsOf(a), tall = !doc && a.kind === 'image' && h > w * 1.15;
  const badge = inCat === 'sub' ? '' : a.sub === 'Packs' ? 'Sound pack' : a.cat === 'Merch' ? PRODUCTS[a.type] || 'Merch' : inCat ? a.sub : a.cat;
  const inside = a.kind === 'merch' ? mockup(a) : drawnCover(a) && doc ? `<span class="bookcover" style="--tone:${tone(a.title)}"><b>${esc(a.title)}</b><small>${esc(a.by)}</small></span>`
    : a.pic ? `<img src="${a.pic}" alt="" loading="lazy">` : `<span class="soundwave awave" aria-hidden="true">${waveBars(a.id, 22)}</span>`;
  const len = a.audio ? `<span class="badge dur listen" data-audio="${a.audio}" data-title="${esc(a.title)}" data-by="${esc(a.by)}">▶ ${lenOf(a) || 'Listen'}</span>` : lenOf(a) ? `<span class="badge dur">${lenOf(a)}</span>` : '';
  return `<a class="card${doc ? ' doc' : ''}" href="${itemUrl(a)}"><div class="thumb${a.kind === 'merch' ? ' merchthumb' : a.pic || (drawnCover(a) && doc) ? '' : ' blank'}${a.dark ? ' darkbg' : ''}${tall ? ' fit' : ''}">${inside}${badge ? `<span class="badge kind">${esc(badge)}</span>` : ''}${len}${saveBtn(a)}</div><h3>${esc(a.title)}</h3><p>${esc(a.by)} · ${priceTag(a)}${a.film && film[a.film] ? ` · from ${film[a.film].title}` : ''}</p></a>`;
}
function audioRow(a) {
  const file = (a.files || [])[0];
  return `<div class="arow"><button class="aplay" data-audio="${a.audio || ''}" data-pause="❚❚" data-title="${esc(a.title)}" data-by="${esc(a.by)}" aria-label="Play ${esc(a.title)}"${a.audio ? '' : ' disabled'}>▶</button>
    <a class="ainfo" href="${itemUrl(a)}"><b>${esc(a.title)}</b><span class="muted small">${esc(a.by)} · ${esc(a.sub)}</span></a>
    <span class="awave" aria-hidden="true">${waveBars(a.id, 56)}</span>
    <span class="alen">${lenOf(a)}</span><span class="alic">${a.price ? '$' + a.price : a.lic.length > 14 ? 'Free' : esc(a.lic)}</span>${saveBtn(a)}
    ${a.price || !file || !file.url ? `<a class="btn small" href="${itemUrl(a)}">Open</a>` : `<a class="btn small dark" href="${downloadUrl(file)}" download="${esc(file.name)}" aria-label="Download ${esc(a.title)}" title="Download">↓</a>`}</div>`;
}

/* ---------- the marketplace ---------- */
if ($('[data-shop="grid"]')) {
  const KEYS = { cat: 'All', sub: '', q: '', price: 'all', film: '', sort: 'featured', lic: '', len: '', res: '', shape: '', fmt: '', saved: '' };
  const state = Object.fromEntries(Object.entries(KEYS).map(([k, d]) => [k, param(k) || d])); state.shown = 24;
  if (param('kind')) state.cat = { Image: 'Photos & images' }[param('kind')] || param('kind');
  const el = k => $(`[data-shop="${k}"]`);
  const LEN = { Footage: [['', 'Any length'], ['0-30', 'Under 30 sec'], ['30-120', '30 sec – 2 min'], ['120-600', '2 – 10 min'], ['600-', 'Over 10 min']],
    Music: [['', 'Any length'], ['0-120', 'Under 2 min'], ['120-300', '2 – 5 min'], ['300-', 'Over 5 min']],
    'Sound effects': [['', 'Any length'], ['0-5', 'Under 5 sec'], ['5-30', '5 – 30 sec'], ['30-120', '30 sec – 2 min'], ['120-', 'Over 2 min']] };
  const RES = { Footage: [['', 'Any resolution'], ['720', 'HD (720p) and up'], ['1080', 'Full HD and up'], ['2160', '4K and up']],
    'Photos & images': [['', 'Any size'], ['2000', '2,000 px and up'], ['4000', '4,000 px and up'], ['8000', '8,000 px and up']] };
  const SHAPE = [['', 'Any shape'], ['wide', 'Landscape'], ['tall', 'Portrait'], ['square', 'Square']];
  const LIC = [['', 'Any licence'], ['pd', 'Public domain'], ['cc0', 'CC0'], ['other', 'Creator licence']];
  const formats = {};   // the file types found in a category, most common first
  const formatsOf = c => formats[c] || (formats[c] = Object.entries(MARKET.filter(it => it.cat === c).reduce((m, it) => { const x = extOf(it); if (x) m[x] = (m[x] || 0) + 1; return m; }, {})).sort((x, y) => y[1] - x[1]).slice(0, 8).map(([x]) => x));
  // how many items each category and kind holds; the catalogue does not change while the page is open
  let tally = {};
  const recount = () => { tally = MARKET.reduce((m, it) => { m.All = (m.All || 0) + 1; m[it.cat] = (m[it.cat] || 0) + 1; const k = it.cat + '›' + it.sub; m[k] = (m[k] || 0) + 1; return m; }, {}); };
  recount();
  const subsOf = c => [...new Set(MARKET.filter(it => it.cat === c).map(it => it.sub))];
  const n = x => x.toLocaleString('en-US');

  // every word typed has to start a word of the item, as in the search box at the top: "rain" finds rain, not "train"
  const plain = t => String(t || '').toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const wordsIn = (q, text) => { const hay = ' ' + plain(text); return plain(q).split(/\s+/).filter(Boolean).every(w => hay.search(new RegExp('[^a-z0-9]' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) >= 0); };
  const within = (range, v) => { const [lo, hi] = range.split('-').map(Number); return v > 0 && v >= lo && (!hi || v < hi); };
  const match = it => (state.cat === 'All' || it.cat === state.cat) && (!state.sub || it.sub === state.sub) && (state.price === 'all' || (state.price === 'free') === !it.price) && (!state.film || (it.film && film[it.film]))
    && (!state.saved || saved.has(it.id)) && (!state.lic || licOf(it) === state.lic) && (!state.len || within(state.len, secsOf(it))) && (!state.fmt || extOf(it) === state.fmt)
    && (!state.res || (it.cat === 'Footage' ? Math.min(...dimsOf(it)) : Math.max(...dimsOf(it))) >= Number(state.res))
    && (!state.shape || (([w, h]) => w && (state.shape === 'wide' ? w > h * 1.1 : state.shape === 'tall' ? h > w * 1.1 : Math.abs(w - h) <= Math.max(w, h) * .1))(dimsOf(it)))
    && (!state.q || wordsIn(state.q, [it.title, it.by, it.cat, it.sub, it.desc, it.specs && it.specs.Tags, ...(it.works || [])].join(' ')));
  const SORT = { az: (x, y) => x.title.localeCompare(y.title), low: (x, y) => (x.price || 0) - (y.price || 0), high: (x, y) => (y.price || 0) - (x.price || 0),
    short: (x, y) => (secsOf(x) || 1e9) - (secsOf(y) || 1e9), long: (x, y) => secsOf(y) - secsOf(x), big: (x, y) => dimsOf(y)[0] * dimsOf(y)[1] - dimsOf(x)[0] * dimsOf(x)[1] };
  const narrowed = () => ['q', 'film', 'lic', 'len', 'res', 'shape', 'fmt', 'saved'].some(k => state[k]) || state.price !== 'all';

  function draw() {
    // filters that make no sense in this category are let go
    if (!LEN[state.cat]) state.len = ''; if (!RES[state.cat]) state.res = ''; if (!['Footage', 'Photos & images'].includes(state.cat)) state.shape = ''; if (state.cat === 'All' || !formatsOf(state.cat).includes(state.fmt)) state.fmt = '';
    el('cats').innerHTML = ['All', ...CATS.filter(c => tally[c])].map(c => `<button class="shopcat${state.cat === c && !state.sub ? ' on' : ''}" data-cat="${c}"><span>${c}</span><small>${n(tally[c] || 0)}</small></button>` +
      (c !== 'All' && state.cat === c ? subsOf(c).map(sb => `<button class="shopcat sub${state.sub === sb ? ' on' : ''}" data-cat="${c}" data-sub="${esc(sb)}"><span>${sb}</span><small>${n(tally[c + '›' + sb])}</small></button>`).join('') : '')).join('');
    el('price').innerHTML = [['all', 'All prices'], ['free', 'Free'], ['paid', 'Paid']].map(([k, l]) => `<button class="chip${state.price === k ? ' on' : ''}" data-price="${k}">${l}</button>`).join('');
    const pick = (key, opts) => `<select class="field fsel${state[key] ? ' on' : ''}" data-filter="${key}" aria-label="${opts[0][1]}">${opts.map(([v, l]) => `<option value="${v}"${state[key] === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    el('filters').innerHTML = pick('lic', LIC) + (LEN[state.cat] ? pick('len', LEN[state.cat]) : '') + (RES[state.cat] ? pick('res', RES[state.cat]) : '') + (['Footage', 'Photos & images'].includes(state.cat) ? pick('shape', SHAPE) : '')
      + (state.cat !== 'All' && formatsOf(state.cat).length > 1 ? pick('fmt', [['', 'Any format'], ...formatsOf(state.cat).map(x => [x, x])]) : '')
      + `<label class="shopcheck"><input type="checkbox" data-toggle="film"${state.film ? ' checked' : ''}> Linked to a film</label>`
      + `<button class="chip${state.saved ? ' on' : ''}" data-toggle="saved">♥ Saved${saved.size ? ' · ' + saved.size : ''}</button>`
      + (narrowed() ? '<button class="link" data-clear>Clear filters</button>' : '');
    el('sort').value = state.sort;

    const grid = el('grid'), landing = state.cat === 'All' && !narrowed() && state.sort === 'featured';
    if (landing) {
      // the front of the shop: a shelf from every category
      grid.className = 'shelves';
      const fresh = MARKET.filter(x => x.shared || x.mine);
      grid.innerHTML = (fresh.length ? `<div class="sec"><h2>New from creators</h2><p>${n(fresh.length)} shared on dein.art</p></div><div class="grid oneline">${fresh.slice(0, 8).map(a => shopCard(a, false)).join('')}</div>` : '') + CATS.filter(c => tally[c]).map(c => { const list = MARKET.filter(it => it.cat === c), sound = c === 'Music' || c === 'Sound effects';
        return `<div class="sec"><h2>${c}</h2><button class="link" data-cat="${c}">See all ${n(list.length)}</button></div>` + (sound ? `<div class="arows">${list.slice(0, 5).map(audioRow).join('')}</div>` : `<div class="grid oneline${c === 'Scripts & documents' ? ' docs' : ''}">${list.slice(0, 8).map(a => shopCard(a, true)).join('')}</div>`); }).join('');
      el('count').textContent = `${n(MARKET.length)} items in ${CATS.filter(c => tally[c]).length} categories`; el('more').hidden = true;
    } else {
      let items = MARKET.filter(match);
      if (SORT[state.sort]) items = [...items].sort(SORT[state.sort]);
      const sound = items.length > 0 && items.slice(0, state.shown).every(it => it.kind === 'audio' || it.kind === 'pack');
      el('count').textContent = `${n(items.length)} ${items.length === 1 ? 'item' : 'items'}${state.saved ? ' saved' : ''}${state.cat !== 'All' ? ' in ' + (state.sub || state.cat) : ''}${state.q ? ` for “${state.q}”` : ''}`;
      grid.className = sound ? 'arows' : 'grid' + (state.cat === 'Scripts & documents' ? ' docs' : '');
      grid.innerHTML = items.slice(0, state.shown).map(a => (sound ? audioRow(a) : shopCard(a, state.sub ? 'sub' : state.cat !== 'All'))).join('') || `<p class="muted empty">${state.saved ? 'Nothing saved yet. Tap the heart on anything to keep it here.' : 'Nothing matches. Try another category or fewer filters.'}</p>`;
      el('more').hidden = items.length <= state.shown;
    }
    // the address keeps the whole view, so it can be shared and the back button returns to it
    const url = new URL(location.href); url.search = '';
    Object.entries(KEYS).forEach(([k, d]) => { if (state[k] && state[k] !== d) url.searchParams.set(k, state[k]); });
    history.replaceState(null, '', url);
  }
  const reset = () => { state.shown = 24; draw(); };
  document.addEventListener('click', e => {
    const c = e.target.closest('[data-cat]'), p = e.target.closest('[data-price]'), t = e.target.closest('button[data-toggle]');
    if (c) { state.cat = c.dataset.cat; state.sub = c.dataset.sub || ''; reset(); if (c.classList.contains('link')) window.scrollTo(0, 0); }
    if (p) { state.price = p.dataset.price; reset(); }
    if (t) { state[t.dataset.toggle] = state[t.dataset.toggle] ? '' : '1'; reset(); }
    if (e.target.closest('[data-clear]')) { Object.assign(state, KEYS, { cat: state.cat, sub: state.sub, sort: state.sort }); el('q').value = ''; reset(); }
    if (e.target.closest('[data-shop="more"] button')) { state.shown += 24; draw(); }
  });
  document.addEventListener('change', e => {
    const f = e.target.closest('[data-filter]'), t = e.target.closest('input[data-toggle]');
    if (f) { state[f.dataset.filter] = f.value; reset(); }
    if (t) { state[t.dataset.toggle] = t.checked ? '1' : ''; reset(); }
  });
  document.addEventListener('saved-changed', () => { if (state.saved) draw(); else { const b = $('[data-toggle="saved"]'); if (b) b.textContent = '♥ Saved' + (saved.size ? ' · ' + saved.size : ''); } });
  // what creators shared arrives from the API a moment after the page: count again and redraw
  document.addEventListener('market-changed', () => { recount(); Object.keys(formats).forEach(k => delete formats[k]); draw(); });
  el('q').value = state.q;
  el('q').addEventListener('input', e => { state.q = e.target.value.trim(); reset(); });
  el('sort').addEventListener('change', e => { state.sort = e.target.value; reset(); });
  draw();
}

/* ---------- one item ---------- */
if ($('[data-i="title"]')) (async () => {
  const put = (k, html) => $$(`[data-i="${k}"]`).forEach(el => { el.innerHTML = html; });
  let it = marketItem(param('id'));
  if (!it && /^up-/.test(param('id') || '')) { put('title', 'Loading…'); await SHARED; it = marketItem(param('id')); }
  if (!it && param('id')) { document.title = 'Item not found — dein.art'; put('title', 'This item is not here'); put('note', 'It may have been removed by the person who shared it.'); put('acts', '<a class="btn primary" href="market.html">Go to the marketplace</a>'); return; }
  if (!it) it = MARKET[0];
  const f = it.film && film[it.film], free = !it.price, files = it.files || [];
  document.title = `${it.title} — dein.art`;
  put('crumbs', `<a href="market.html">Marketplace</a> › <a href="market.html?cat=${encodeURIComponent(it.cat)}">${esc(it.cat)}</a> › <a href="market.html?cat=${encodeURIComponent(it.cat)}&sub=${encodeURIComponent(it.sub)}">${esc(it.sub)}</a>`);
  put('kind', esc(it.sub === 'Packs' ? 'Sound pack' : it.cat === 'Merch' ? (PRODUCTS[it.type] || 'Merch') : it.sub));
  put('title', esc(it.title));
  const page = artistUrl(it.by), studio = it.by === 'dein.art Studio';
  if (it.owner) put('by', `<a href="artist.html?wallet=${it.owner}"><span class="avatar" style="background:linear-gradient(135deg,#${it.owner.slice(2, 8)},#${it.owner.slice(-6)})"></span></a><span class="who"><b><a href="artist.html?wallet=${it.owner}">${esc(it.by)}</a></b><span class="muted small">Shared on dein.art · ${ensTag(it.owner)}</span></span>`);
  else put('by', `${who[it.by] ? `<a href="${page}">${avatar(it.by)}</a>` : `<span class="avatar" style="background:${tone(it.by)}">${initials(it.by)}</span>`}<span class="who"><b>${who[it.by] ? `<a href="${page}">${esc(it.by)}</a>` : esc(it.by)}</b><span class="muted small">${it.perf ? 'Performed by ' + esc(it.perf) : studio ? 'Made by dein.art for creators' : it.cat === 'Merch' ? 'Offered by the creator' : it.lib ? 'Free library · from ' + (it.sourceName || 'Wikimedia Commons') : 'Shared on dein.art'}</span></span>`);
  put('price', free ? '<b class="free">Free</b><span class="muted small">' + esc(it.lic) + '</span>' : `<b>$${it.price}</b><span class="muted small">${it.cat === 'Merch' ? 'plus shipping · made to order' : esc(it.lic)}</span>`);

  // the preview: a picture (with a gallery), a player, the product itself, or a document you can leaf through
  const gallery = it.gallery || [], pages = it.lib && it.cat === 'Scripts & documents' && /\/page1-\d+px-/.test(it.big || '');
  const media = it.kind === 'merch' ? `<div class="itemshot merch">${mockup(it)}</div>`
    : it.kind === 'video' ? `<div class="itemshot"><video controls playsinline preload="metadata" poster="${it.pic}">${it.video ? `<source src="${it.video}" type="${/\.mp4$/.test(it.video) ? 'video/mp4' : 'video/webm'}">` : ''}${it.mov ? `<source src="${it.mov}" type="video/quicktime">` : ''}</video></div>`
    : it.kind === 'audio' || it.kind === 'pack' ? `<div class="itemshot sound">${it.pic ? `<img src="${it.pic}" alt="">` : `<span class="soundwave big" aria-hidden="true">${waveBars(it.id, 44)}</span>`}<audio controls preload="none" src="${it.audio || ''}"></audio></div>`
    : pages ? `<div class="itemshot doc"><img data-page-img src="${it.big}" alt="Page 1 of ${esc(it.title)}"></div>
        <div class="pager"><button class="btn icon" data-pg="-1" aria-label="Previous page" disabled>‹</button><span>Page <input class="field" type="number" min="1" value="1" data-pg-n aria-label="Page"> <span data-pg-of></span></span><button class="btn icon" data-pg="1" aria-label="Next page">›</button></div>`
    : `<div class="itemshot${it.dark ? ' darkbg' : ''}"><img data-i-main src="${it.big || gallery[0] || it.pic}" alt=""></div>`;
  put('media', media + (gallery.length ? `<div class="itemthumbs">${gallery.map((g, i) => `<button class="ithumb${i ? '' : ' on'}${it.dark ? ' darkbg' : ''}" data-g="${g}"><img src="${g}" alt="" loading="lazy"></button>`).join('')}</div>` : ''));

  // merch: size and colour
  if (it.kind === 'merch') put('options', `${['tee', 'hoodie'].includes(it.type) ? `<p class="edlabel">Size</p><div class="sizes">${['S', 'M', 'L', 'XL'].map((sz, i) => `<button class="pick${i === 1 ? ' on' : ''}" data-size="${sz}">${sz}</button>`).join('')}</div>` : ''}
    <p class="edlabel">Colour</p><div class="swatches">${Object.entries(COLOURS).map(([k, [b]]) => `<button class="swatch${it.colour === k ? ' on' : ''}" data-colour="${k}" style="background:${b}" aria-label="${k}"></button>`).join('')}</div>`);

  put('acts', free
    ? (files.length === 1 && !files[0].url ? `<button class="btn primary big" disabled>↓ Download · ${bytes(files[0].size)}</button>` : files.length === 1 ? `<a class="btn primary big" data-magnetic href="${downloadUrl(files[0])}" download="${esc(files[0].name)}"><span class="mag-in">↓ Download${files[0].size ? ' · ' + bytes(files[0].size) : ''}</span></a>` : `<a class="btn primary big" href="#files">↓ Download · ${files.length} files</a>`)
      + `<button class="btn" data-pay="support" data-title="Thank ${esc(it.by)}" data-creator="${esc(it.by)}">Say thanks</button>` + saveBtn(it, 'btn')
    : `<button class="btn primary big" data-pay="${it.kind === 'merch' ? 'merch' : 'buy'}" data-title="${esc(it.title)}" data-price="${it.price}" data-creator="${esc(it.by)}" ${it.creator === ME ? 'data-split' : ''}>${it.kind === 'merch' ? 'Order' : 'Get'} · $${it.price}</button>` + saveBtn(it, 'btn'));
  put('note', it.shared && !free ? 'Payments are not live yet, so the files of paid items stay locked. Prototype: nothing is charged.' : it.mine && files.some(x => !x.url) ? 'This item is kept in your browser only, so its file cannot be downloaded here.' : free ? 'Free to download and use. No account needed.' : it.kind === 'merch' ? 'Printed on demand and shipped to you. Prototype: nothing is charged.' : 'Yours right after payment. Prototype: nothing is charged.');
  put('facts', Object.entries({ Category: `${it.cat} · ${it.sub}`, ...(it.specs || {}), Licence: it.lic }).filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')
    + (it.collection ? `<dt>Collection</dt><dd><a class="link" href="${it.collection.url}">${esc(it.collection.name)}</a></dd>` : '') + (free ? '<dt data-dl hidden>Downloads</dt><dd data-dl hidden></dd>' : ''));
  put('works', (it.works || []).length ? `<p class="edlabel" style="flex-basis:100%;margin:0">Works with</p>${it.works.map(w => `<span>${w}</span>`).join('')}` : '');
  put('desc', `<div class="sec"><h2>About this ${it.cat === 'Merch' ? 'product' : it.sub === 'Packs' ? 'pack' : 'item'}</h2></div><p class="lead">${esc(it.desc || '')}</p>${it.source ? `<p class="muted small" style="margin-top:10px">Original file from <a class="link" href="${it.source}" target="_blank" rel="noopener">${it.sourceName || 'Wikimedia Commons'}</a>, ${it.lic === 'CC0' ? 'CC0' : esc(it.lic).toLowerCase()}.</p>` : ''}`);
  put('contents', it.contents ? `<div class="sec"><h2>In this pack</h2><p>${it.contents.length} sounds</p></div><div class="rows">${it.contents.map(c => `<div class="row"><button class="btn icon" data-audio="${c.audio}" aria-label="Play ${esc(c.title)}">▶</button><div class="info"><b>${esc(c.title)}</b><span class="muted small">${c.length}</span></div><a class="btn" href="item.html?id=${c.id}">Open</a></div>`).join('')}</div>` : '');
  put('files', files.length && (free || it.mine) ? `<div class="sec" id="files"><h2>${files.length === 1 ? 'File' : 'Files'}</h2></div><div class="rows">${files.map(x => `<div class="row"><div class="info"><b>${esc(x.name)}</b><span class="muted small">${[bytes(x.size), x.note].filter(Boolean).map(esc).join(' · ')}</span></div>${!free ? '' : x.url ? `<a class="btn dark" href="${downloadUrl(x)}" download="${esc(x.name)}">↓ Download</a>` : '<span class="muted small">Not uploaded</span>'}</div>`).join('')}</div>` : '');
  const me = sessionNow();
  if (it.mine) put('own', `<div class="box tp-own"><span><b>You shared this on ${it.added}</b><br><span class="muted small">It is kept in this browser only. Log in with a wallet and share it again to publish it for everyone.</span></span><button class="btn" data-own-x>Remove</button></div>`);
  if (it.shared && me && me.address === it.owner) put('own', `<div class="box tp-own"><span><b>You shared this on ${it.added}</b><br><span class="muted small">Everyone can see it. Removing it deletes its files too.</span></span><button class="btn" data-shared-x>Remove</button></div>`);
  // only when the item really belongs to a film
  put('film', f ? `<div class="panel filmlink"><h3>From the film</h3><a class="next" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f, f.at, 330)}" alt=""><span class="badge dur">${f.dur}</span></div><div><h3>${f.title}</h3><p class="muted small">${byline(f)}<br>${f.year} · ${f.kind}</p></div></a><a class="btn wide" href="${watchUrl(f)}" style="margin-top:12px">▶ Watch the film</a></div>` : '');
  const same = MARKET.filter(x => x !== it && x.creator === it.creator).slice(0, 8), like = MARKET.filter(x => x !== it && x.sub === it.sub && x.creator !== it.creator).concat(MARKET.filter(x => x !== it && x.cat === it.cat && x.sub !== it.sub)).slice(0, 8);
  put('more', (same.length ? `<div class="sec"><h2>More from ${esc(it.by)}</h2></div><div class="${same.every(x => x.audio) ? 'arows' : 'grid'}">${same.slice(0, 4).map(x => (same.every(y => y.audio) ? audioRow(x) : shopCard(x, true))).join('')}</div>` : '') + (like.length ? `<div class="sec"><h2>More ${it.cat.toLowerCase()}</h2><a href="market.html?cat=${encodeURIComponent(it.cat)}">See all</a></div><div class="${it.audio ? 'arows' : 'grid' + (it.cat === 'Scripts & documents' ? ' docs' : '')}">${like.slice(0, it.audio ? 5 : it.cat === 'Scripts & documents' ? 6 : 4).map(x => (it.audio ? audioRow(x) : shopCard(x, true))).join('')}</div>` : ''));

  // a document: turn the pages; Commons tells how many there are
  if (pages) {
    const img = $('[data-page-img]'), num = $('[data-pg-n]'), name = it.files[0].name; let at = 1, count = 0;
    const show = p => {
      at = Math.max(1, count ? Math.min(count, p) : p); num.value = at; $('[data-pg="-1"]').disabled = at <= 1; $('[data-pg="1"]').disabled = count > 0 && at >= count;
      img.classList.add('turning'); img.src = it.big.replace(/\/page1-/, `/page${at}-`); img.alt = `Page ${at} of ${it.title}`;
      new Image().src = it.big.replace(/\/page1-/, `/page${at + 1}-`);            // the next page is fetched ahead
    };
    img.addEventListener('load', () => img.classList.remove('turning'));
    img.addEventListener('error', () => { if (at > 1) { count = at - 1; $('[data-pg-of]').textContent = 'of ' + count; show(count); } });
    document.addEventListener('click', e => { const b = e.target.closest('[data-pg]'); if (b) show(at + Number(b.dataset.pg)); });
    num.addEventListener('change', () => show(Number(num.value) || 1));
    document.addEventListener('keydown', e => { if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
    fetch('https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*&prop=imageinfo&iiprop=size&titles=' + encodeURIComponent('File:' + name)).then(r => r.json())
      .then(d => { count = Object.values(d.query.pages)[0].imageinfo[0].pagecount || 0; if (count) { $('[data-pg-of]').textContent = 'of ' + count.toLocaleString('en-US'); num.max = count; $('[data-i="facts"]').insertAdjacentHTML('beforeend', `<dt>Pages</dt><dd>${count.toLocaleString('en-US')}</dd>`); } }).catch(() => {});
  }
  // downloads are counted by the site, the same way views are, so everyone sees the same number
  if (free) {
    let h = 2166136261; for (const ch of it.id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    const key = 'dl-' + h.toString(36), showCount = c => { if (c > 0) $$('[data-dl]').forEach((el, i) => { el.hidden = false; if (i) el.textContent = c.toLocaleString('en-US'); }); };
    fetch('/api/views?ids=' + key).then(r => (r.ok ? r.json() : {})).then(d => showCount(d[key] || 0)).catch(() => {});
    document.addEventListener('click', e => { if (e.target.closest('a[download]') && e.target.closest('[data-i="acts"], [data-i="files"]')) fetch('/api/views/' + key, { method: 'POST', keepalive: true }).then(r => r.json()).then(d => showCount(d.views)).catch(() => {}); });
  }

  document.addEventListener('click', e => {
    const gone = e.target.closest('[data-shared-x]');
    if (gone && confirm(`Remove “${it.title}” and its files for everyone?`)) { gone.disabled = true; gone.textContent = 'Removing…';
      fetch('/api/items/' + it.sid, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: sessionNow() }) }).then(r => r.json().then(d => { if (r.ok) location.href = 'market.html'; else { gone.disabled = false; gone.textContent = 'Remove'; alert(d.error || 'It could not be removed.'); } })).catch(() => { gone.disabled = false; gone.textContent = 'Remove'; }); }
    if (e.target.closest('[data-own-x]') && confirm(`Remove “${it.title}” from the marketplace?`)) { try { localStorage.setItem('shared', JSON.stringify((JSON.parse(localStorage.getItem('shared')) || []).filter(x => x.id !== it.id))); } catch {} location.href = 'market.html'; }
    const g = e.target.closest('[data-g]'), sz = e.target.closest('[data-size]'), col = e.target.closest('[data-colour]');
    if (g) { $('[data-i-main]').src = g.dataset.g; $$('.ithumb').forEach(b => b.classList.toggle('on', b === g)); }
    if (sz) $$('[data-size]').forEach(b => b.classList.toggle('on', b === sz));
    if (col) { it.colour = col.dataset.colour; $('.itemshot.merch').innerHTML = mockup(it); $$('[data-colour]').forEach(b => b.classList.toggle('on', b === col)); }
  });
})();
