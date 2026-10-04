const FEE = 1; // flat platform fee per transaction, in dollars
const ME = 'Georges Méliès'; // the account this demo is signed in as
const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const page = document.body.dataset.page;
const param = key => new URLSearchParams(location.search).get(key);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- content ----------
   Everything shown is a real public-domain or CC0 work, listed in catalog.js with its source on Wikimedia Commons
   and its credits from Wikidata. Prices, counts and payments are examples: this is a prototype and nothing is charged. */

// The hand-picked films are in catalog.js. Tens of thousands more join them through films.js, a piece at a time; `film`
// looks a key up among whatever has arrived so far.
CATALOG.films.forEach(f => { f.creator = f.by[0]; });
const filmIndex = { n: -1, map: new Map() };
const film = new Proxy({}, { get: (_, key) => { if (filmIndex.n !== CATALOG.films.length) { filmIndex.map = new Map(CATALOG.films.map(f => [f.key, f])); filmIndex.n = CATALOG.films.length; } return filmIndex.map.get(key); } });
const who = CATALOG.people;
// Artists whose work lives on a blockchain are people like any other; they carry their wallet and collections.
ONCHAIN.forEach(a => { if (a.ens) ensListed[a.address] = a.ens; });
ONCHAIN.forEach(a => { who[a.name] = { name: a.name, role: a.role || 'Artist', pic: a.pic || a.collections.flatMap(c => c.tokens)[1]?.img, films: [], credits: a.credits || [], occ: [], chain: a, imdb: a.imdb }; });
// Any wallet has a page: artist.html?wallet=0x… shows it even if no index lists the wallet yet, so its holder can claim it.
const walletParam = (param('wallet') || '').trim();
if (/^0x[0-9a-fA-F]{40}$/.test(walletParam) && !ONCHAIN.some(a => a.address.toLowerCase() === walletParam.toLowerCase())) {
  const w = { name: walletParam.slice(0, 6) + '…' + walletParam.slice(-4), address: walletParam.toLowerCase(), collections: [], listed: false };
  ONCHAIN.push(w); who[w.name] = { name: w.name, role: 'Artist', films: [], credits: [], occ: [], chain: w };
}

// A still from a film at a given second, in one of the widths Wikimedia serves.
const WIDTHS = [250, 330, 500, 960, 1280];
// (A film at the Internet Archive has one small picture and no stills.)
const frame = (f, t = f.at, want = 500) => f.pic || `${f.tb}${WIDTHS.filter(w => w <= Math.min(want, f.w || 500)).pop() || 250}px-seek%3D${t}-${f.tn}`;
const small = pic => pic.replace('/500px-', '/120px-');
const watchUrl = f => 'watch.html?f=' + f.key;
const sources = f => (f.mp4 ? `<source src="${f.mp4}" type="video/mp4">` : '') + (f.webm ? `<source src="${f.webm}" type="video/webm">` : '') + (f.mov ? `<source src="${f.mov}" type="video/quicktime">` : '');

// The film this page is about: the one in the address, or the featured one.
const cur = film[param('f')] || film[page === 'live' ? 'nosferatu' : 'trip-to-the-moon'];

const front = ['trip-to-the-moon', 'man-with-a-movie-camera', 'nosferatu', 'nanook-of-the-north', 'sherlock-jr', 'battleship-potemkin', 'cabinet-of-dr-caligari', 'great-train-robbery'];
const films = front.map(k => film[k]);

// Screenings: a film played for everyone at once, with chat.
// A screening runs on the clock, round and round: whoever opens it is at the same moment of the film as everyone else.
const screening = key => film[key];
const nowAt = f => Math.floor(Date.now() / 1000) % Math.max(1, f.secs);
const streams = ['nosferatu', 'man-with-a-movie-camera', 'impossible-voyage', 'the-general'].map(screening);

// ---------- the marketplace: everything shared or offered on dein.art, each item with its own page ----------
const slugify = t => String(t).toLowerCase().replace(/ı/g, 'i').replace(/ß/g, 'ss').replace(/ø/g, 'o').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const itemUrl = it => 'item.html?id=' + encodeURIComponent(it.id);
const stillOf = (f, i) => {
  const [t, name] = f.scenes[i];
  return { id: `still-${f.key}-${t}`, cat: 'Photos & images', sub: 'Film stills', title: `${f.title}: ${name}`, by: f.creator, creator: f.creator, film: f.key, price: 0, lic: f.lic, kind: 'image',
    pic: frame(f, t), big: frame(f, t, 1280), files: [{ name: `${f.key}-${slugify(name)}.jpg`, url: frame(f, t, 1280) }], specs: { From: `${f.title} (${f.year})`, At: clock(t) }, source: f.page,
    desc: `A frame from ${f.title} (${f.year}), at ${clock(t)}.` };
};

const PRODUCTS = { tee: 'T-shirt', hoodie: 'Hoodie', poster: 'Poster', tote: 'Tote bag', cap: 'Cap' };
const SUBS = { tee: 'T-shirts', hoodie: 'Hoodies', poster: 'Posters', tote: 'Tote bags', cap: 'Caps' };
const asMerch = m => ({ ...m, id: m.id || 'merch-' + slugify(m.title), by: m.creator, cat: 'Merch', sub: SUBS[m.type] || 'Other', kind: 'merch', lic: 'Made to order',
  desc: m.desc || `${PRODUCTS[m.type] || 'Merch'}, printed on demand and shipped to you. Whatever it earns is shared with the people behind the work.` });
const merch = [
  { title: 'A Trip to the Moon tee', creator: ME, price: 28, type: 'tee', colour: 'ink', film: 'trip-to-the-moon', pic: frame(film['trip-to-the-moon'], 376, 500) },
  { title: 'The 1902 poster, reprinted', creator: ME, price: 35, type: 'poster', colour: 'paper', film: 'trip-to-the-moon', pic: (CATALOG.images.find(i => i.medium === 'Poster') || {}).pic },
  { title: 'The Impossible Voyage tote', creator: ME, price: 18, type: 'tote', colour: 'sand', film: 'impossible-voyage', pic: frame(film['impossible-voyage'], 713, 500) },
  { title: 'Star Film cap', creator: ME, price: 22, type: 'cap', colour: 'night', text: 'STAR FILM' },
  { title: 'dein.art tee', creator: 'dein.art Studio', price: 26, type: 'tee', colour: 'ink', text: 'DEIN.ART' },
  { title: 'Own your narrative hoodie', creator: 'dein.art Studio', price: 48, type: 'hoodie', colour: 'night', text: 'OWN YOUR NARRATIVE' },
  { title: 'dein.art tote', creator: 'dein.art Studio', price: 16, type: 'tote', colour: 'sand', text: 'DEIN.ART' },
].map(asMerch);
// A product drawn around the creator's own image: what it would look like printed.
const COLOURS = { ink: ['#1b1d24', '#eceaf3'], paper: ['#f4efe6', '#2a2620'], sand: ['#e7dcc7', '#3a3226'], night: ['#24305e', '#f5a623'], white: ['#f7f7f9', '#1b1d24'], clay: ['#c8664a', '#fff4ea'] };
let mockId = 0;
function mockup(m) {
  const [body, ink] = COLOURS[m.colour] || COLOURS.ink, id = 'mk' + (mockId++);
  const img = (x, y, w, h) => m.pic ? `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2"/></clipPath><image href="${esc(m.pic)}" x="${x}" y="${y}" width="${w}" height="${h}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>` : `<text x="${x + w / 2}" y="${y + h / 2 + 2}" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="700" font-size="5" fill="${ink}">${esc((m.text || m.title).slice(0, 14).toUpperCase())}</text>`;
  const shade = `<ellipse cx="80" cy="84" rx="34" ry="3" fill="rgba(0,0,0,.12)"/>`;
  const art = {
    tee: `${shade}<g transform="translate(33,0) scale(.94)"><path d="M35 12 10 26l9 18 11-5v49h40V39l11 5 9-18-25-14c-2 8-8 12-15 12s-13-4-15-12z" fill="${body}"/>${img(38, 30, 24, 24)}</g>`,
    hoodie: `${shade}<g transform="translate(33,0) scale(.94)"><path d="M33 15c5-5 29-5 34 0l19 9 7 41-11 2-6-29v50H24V38l-6 29-11-2 7-41z" fill="${body}"/><path d="M36 15c0-9 28-9 28 0-4 7-24 7-28 0z" fill="rgba(0,0,0,.2)"/><path d="M38 66h24l3 13H35z" fill="rgba(0,0,0,.1)"/><path d="M46 21v9M54 21v9" stroke="rgba(255,255,255,.55)" stroke-width="1" stroke-linecap="round"/>${img(39, 33, 22, 20)}</g>`,
    poster: `<rect x="60" y="9" width="40" height="60" fill="rgba(0,0,0,.14)" transform="translate(1.6 2)"/><rect x="60" y="9" width="40" height="60" fill="${body}"/>${img(62.5, 11.5, 35, 55)}`,
    tote: `${shade}<path d="M66 34V26a14 14 0 0 1 28 0v8" fill="none" stroke="${body}" stroke-width="2.4"/><path d="M54 34h52l4 48H50z" fill="${body}"/>${img(64, 45, 32, 28)}`,
    cap: `${shade}<path d="M50 60a30 30 0 0 1 60 0z" fill="${body}"/><path d="M80 60h38c0 6-9 9-20 9s-18-3-18-9z" fill="${body}" opacity=".8"/>${m.pic ? img(70, 44, 20, 12) : `<text x="80" y="54" text-anchor="middle" font-family="Montserrat, sans-serif" font-weight="700" font-size="4.6" fill="${ink}">${esc((m.text || 'dein.art').slice(0, 12).toUpperCase())}</text>`}`,
  };
  return `<svg viewBox="0 0 160 90" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(m.title)}">${art[m.type] || art.tee}</svg>`;
}
const merchCard = m => `<a class="merchbig" href="${itemUrl(m)}"><div class="mthumb">${mockup(m)}</div><div class="minfo"><div><h3>${esc(m.title)}</h3><p class="muted small">${PRODUCTS[m.type] || 'Merch'} · printed on demand${m.added ? ' · added by you' : ''}</p></div><span class="price">$${m.price}</span><span class="btn dark">View</span></div></a>`;

// Everything in the marketplace, from every source, in one list.
// The big free library (assets/library.js): thousands of public-domain and CC0 files on Wikimedia Commons, linked, not copied.
// The file is large, so only the marketplace pages load it up front; search fetches it when someone starts typing.
function addLibrary(list, seen) {
  if (typeof LIBRARY === 'undefined' || addLibrary.done) return [];
  addLibrary.done = true;
  const up = 'https://upload.wikimedia.org/wikipedia/commons/', added = [], clock = n => (n >= 3600 ? Math.floor(n / 3600) + ':' + String(Math.floor(n / 60) % 60).padStart(2, '0') : Math.floor(n / 60)) + ':' + String(n % 60).padStart(2, '0');
  Object.entries(LIBRARY).forEach(([cat, rows]) => rows.forEach(([sub, title, path, w, h, secs, size, cc0, credit, page]) => {
    if (/^https:/.test(path)) {                                    // a CC0 sound on Freesound: the address is the file itself
      const id = 'fs-' + (path.match(/(\d+)_\d+-hq/) || [0, slugify(title)])[1];
      if (seen.has(id)) return;
      const it = { id, cat, sub, title, by: credit || 'Freesound', price: 0, lic: 'CC0', lib: true, kind: 'audio', secs, pic: '', big: '', dur: clock(secs), audio: path,
        files: [{ name: slugify(title) + '.mp3', size, url: path }], source: page, sourceName: 'Freesound', specs: { Length: clock(secs), Format: 'MP3' },
        desc: `${title}. A sound by ${credit || 'a Freesound member'}, released under CC0: free to use in any project, no credit needed.` };
      it.creator = it.by; seen.add(id); list.push(it); added.push(it); return;
    }
    const name = path.split('/').pop(), enc = path.split('/').map(encodeURIComponent).join('/'), file = encodeURIComponent(name), ext = name.split('.').pop().toLowerCase();
    const id = 'lib-' + path.slice(2, 4) + '-' + slugify(name.replace(/\.[^.]+$/, ''));
    if (seen.has(id)) return;
    const thumb = n => `${up}thumb/${enc}/${cat === 'Footage' ? n + 'px--' + file + '.jpg' : cat === 'Scripts & documents' ? 'page1-' + n + 'px-' + file + '.jpg' : n + 'px-' + file}`;
    const sound = cat === 'Music' || cat === 'Sound effects', film = cat === 'Footage';
    const it = { id, cat, sub, title, by: credit || 'Wikimedia Commons', price: 0, lic: cc0 ? 'CC0' : 'Public domain', lib: true, kind: sound ? 'audio' : film ? 'video' : 'image',
      secs, w, h, pic: sound ? '' : thumb(500), big: sound ? '' : film ? thumb(960 > w ? 500 : 960) : cat === 'Scripts & documents' ? thumb(w >= 1000 ? 960 : 500) : thumb(1280), dur: secs ? clock(secs) : '',
      video: film ? `${up}transcoded/${enc}/${file}.480p.vp9.webm` : undefined, audio: sound ? (ext === 'mp3' ? up + enc : `${up}transcoded/${enc}/${file}.mp3`) : undefined,
      files: [{ name, size, url: up + enc }], source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(name.replace(/ /g, '_')),
      specs: { ...(secs ? { Length: clock(secs) } : {}), ...(w && cat !== 'Scripts & documents' ? { Size: `${w.toLocaleString('en-US')} × ${h.toLocaleString('en-US')} px` } : {}), Format: ext.toUpperCase() },
      desc: `${title}. ${cc0 ? 'Released under CC0' : 'In the public domain'}, free to use in any project.` };
    it.creator = it.by; seen.add(id); list.push(it); added.push(it);
  }));
  return added;
}
// The second half of the free library: art that museums have released to the public domain, and public-domain books.
// Linked where they live, never copied. It is a large list, so it arrives after the page is up (see loadMore below).
const MUSEUMS = {
  c: { name: 'Cleveland Museum of Art', id: 'cma', web: k => `https://openaccess-cdn.clevelandart.org/${k}/${k}_web.jpg`, file: k => `https://openaccess-cdn.clevelandart.org/${k}/${k}_print.jpg`, page: k => `https://clevelandart.org/art/${k}`, heavy: true },
  m: { name: 'The Metropolitan Museum of Art', id: 'met', web: k => `https://images.metmuseum.org/CRDImages/${k.replace('/', '/web-large/')}`, file: k => `https://images.metmuseum.org/CRDImages/${k.replace('/', '/original/')}`, page: (k, n) => `https://www.metmuseum.org/art/collection/search/${n}`, heavy: true },
  n: { name: 'National Gallery of Art', id: 'nga', pic: k => `https://api.nga.gov/iiif/${k}/full/!500,500/0/default.jpg`, web: k => `https://api.nga.gov/iiif/${k}/full/!1200,1200/0/default.jpg`, file: k => `https://api.nga.gov/iiif/${k}/full/!3000,3000/0/default.jpg`, page: (k, n) => `https://www.nga.gov/artworks/${n}` },
  w: { name: 'Wellcome Collection', id: 'wel', pic: k => `https://iiif.wellcomecollection.org/image/${k}/full/500,/0/default.jpg`, web: k => `https://iiif.wellcomecollection.org/image/${k}/full/1200,/0/default.jpg`, file: k => `https://iiif.wellcomecollection.org/image/${k}/full/2400,/0/default.jpg`, page: (k, n) => `https://wellcomecollection.org/works/${n}` },
};
function addMore(list, seen) {
  if (typeof LIBRARY_MORE === 'undefined' || addMore.done) return [];
  addMore.done = true;
  const added = [], put = it => { it.creator = it.by; it.price = 0; it.lib = true; seen.add(it.id); list.push(it); added.push(it); };
  (LIBRARY_MORE['Photos & images'] || []).forEach(([sub, title, by, date, w, h, src, key, extra, cc0]) => {
    const mu = MUSEUMS[src]; if (!mu) return;
    const id = `${mu.id}-${slugify(src === 'c' ? key : extra || key)}`;
    if (seen.has(id)) return;
    const lic = src === 'w' && !cc0 ? 'Public domain' : 'CC0';
    put({ id, cat: 'Photos & images', sub, title, by, lic, kind: 'image', w, h,
      // a museum whose smallest picture is far too heavy for a card: cards ask a resizer for a light copy of it
      pic: mu.heavy ? `https://wsrv.nl/?url=${encodeURIComponent(mu.web(key))}&w=500&output=webp` : mu.pic(key), big: mu.web(key),
      files: [{ name: `${slugify(title) || id}.jpg`, size: src === 'c' ? extra : 0, url: mu.file(key) }], source: mu.page(key, extra), sourceName: mu.name,
      specs: { ...(date ? { Date: date } : {}), ...(w && h ? { Size: `${w.toLocaleString('en-US')} × ${h.toLocaleString('en-US')} px` } : {}), Format: 'JPG', From: mu.name },
      desc: `${title}${by && by !== 'Unknown artist' ? ' by ' + by : ''}${date ? ', ' + date : ''}. From the open-access collection of the ${mu.name}, ${lic === 'CC0' ? 'released under CC0' : 'in the public domain'}: free to use in any project, no credit needed.` });
  });
  (LIBRARY_MORE['Scripts & documents'] || []).forEach(([sub, title, by, n]) => {
    const id = 'pg-' + n, page = 'https://www.gutenberg.org/ebooks/' + n;
    if (seen.has(id)) return;
    put({ id, cat: 'Scripts & documents', sub, title, by, lic: 'Public domain', kind: 'image', pic: '', big: '', book: true,
      files: [{ name: `${slugify(title)}.epub`, url: page + '.epub3.images', direct: true, note: 'E-book, from Project Gutenberg' }, { name: `${slugify(title)}.txt`, url: page + '.txt.utf-8', direct: true, note: 'Plain text, from Project Gutenberg' }],
      source: page, sourceName: 'Project Gutenberg', specs: { Format: 'EPUB and plain text', From: 'Project Gutenberg' },
      desc: `${title}${by && by !== 'Unknown author' ? ' by ' + by : ''}. In the public domain in the United States: free to read, adapt and film. The book is kept by Project Gutenberg.` });
  });
  return added;
}
let moreAsked;
const loadMore = () => moreAsked || (moreAsked = new Promise(done => {
  const sc = document.createElement('script'); sc.src = 'assets/library-more.js';
  sc.onload = () => { const added = addMore(MARKET, addLibrary.seen); if (added.length) document.dispatchEvent(new CustomEvent('market-changed', { detail: added })); done(added); };
  sc.onerror = () => done([]); document.head.append(sc);
}));

const MARKET = (() => {
  const list = [], seen = addLibrary.seen = new Set();
  const add = it => { if (it && it.id && !seen.has(it.id)) { seen.add(it.id); list.push({ creator: it.by, ...it }); } };
  const extra = typeof MARKET_EXTRA !== 'undefined' ? MARKET_EXTRA : [];
  // what the creator shared from this browser comes first
  try { (JSON.parse(localStorage.getItem('shared')) || []).forEach(add); } catch {}
  const first = id => add(extra.find(x => x.id === id));
  // a mixed first row: one of each kind
  ['tpl-film-looks', 'sfx-pack-weather-nature'].forEach(first);
  CATALOG.footage.slice(0, 1).forEach(a => add(fromFootage(a)));
  add(merch[0]);
  CATALOG.music.slice(0, 1).forEach(m => add(fromMusic(m)));
  CATALOG.images.slice(0, 1).forEach(i => add(fromImage(i)));
  ['tpl-lower-thirds', 'ph-buzz-aldrin-on-the-moon'].forEach(first);
  extra.filter(x => x.cat === 'Templates').forEach(add);
  CATALOG.footage.forEach(a => add(fromFootage(a)));
  extra.filter(x => x.cat === 'Footage').forEach(add);
  CATALOG.music.forEach(m => add(fromMusic(m)));
  extra.filter(x => x.cat === 'Sound effects' && x.sub === 'Packs').forEach(add);
  extra.filter(x => x.cat === 'Sound effects').forEach(add);
  merch.forEach(add);
  try { (JSON.parse(localStorage.getItem('edits:me'))?.merch || []).forEach(m => add(asMerch({ ...m, creator: ME, added: true }))); } catch {}
  CATALOG.images.forEach(i => add(fromImage(i)));
  extra.filter(x => x.cat === 'Photos & images').forEach(add);
  if (typeof ASSETS !== 'undefined') Object.entries(ASSETS).forEach(([name, groups]) => groups.forEach(g => g.items.forEach(i => add({
    id: 'as-' + slugify(name) + '-' + slugify(i.title), cat: g.type === 'Footage' ? 'Footage' : 'Photos & images',
    sub: { Posters: 'Posters & lobby cards', 'Lobby cards': 'Posters & lobby cards', 'Production stills': 'Film stills', Photographs: 'Photography', Footage: 'Archival film', Press: 'Press & magazines' }[g.type] || g.type,
    shelf: g.type, title: i.title, by: name, film: i.film, price: 0, lic: i.lic, kind: i.dur ? 'video' : 'image', pic: i.pic, big: i.big, video: i.webm, mov: i.mov,
    files: [{ name: i.url.split('/').pop(), size: i.mb * 1e6, url: i.url }], desc: i.note, source: i.page,
    specs: { Year: i.year, Credit: i.credit, [i.dur ? 'Length' : 'Size']: i.dur ? `${i.dur} · ${i.w} × ${i.h}` : `${i.w.toLocaleString('en-US')} × ${i.h.toLocaleString('en-US')} px`, Format: i.format } }))));
  CATALOG.films.forEach(f => f.scenes.slice(0, 2).forEach((sc, i) => { if (sc[1] && !f.auto) add(stillOf(f, i)); }));
  ONCHAIN.forEach(a => a.collections.filter(c => c.cc0 && c.tokens.length).forEach(c => c.tokens.slice(2, 4).forEach(t => add({
    id: `nft-${c.slug}-${t.n}`, cat: 'Photos & images', sub: 'Digital art', title: `${c.name} #${t.n}`, by: a.name, price: 0, lic: 'CC0', kind: 'image', pic: t.img, big: t.img.replace('/thumb/', '/'),
    files: [{ name: `${c.slug}-${t.n}.png`, url: t.img.replace('/thumb/', '/'), direct: true }], collection: { name: c.name, url: `collection.html?artist=${encodeURIComponent(a.name)}&c=${c.slug}` },
    specs: { Collection: c.name, Year: c.year, Chain: c.chain }, desc: `Piece #${t.n} of ${c.name} by ${a.name}, released under CC0.` }))));
  addLibrary(list, seen);
  return list;
  function fromFootage(a) { return { id: 'ft-' + slugify(a.title), cat: 'Footage', sub: /NASA/.test(a.by) ? 'Space & science' : 'Archival film', title: a.title, by: a.by, price: 0, lic: a.lic, kind: 'video', pic: frame(a, Math.round(a.secs * .3)),
    video: a.webm, mov: a.mov, files: [{ name: slugify(a.title) + '.webm', url: a.webm }], specs: { Length: a.dur, Format: 'WebM' }, source: a.page, desc: `${a.title}. ${a.dur} of public-domain footage, free to use.` }; }
  function fromMusic(m) { return { id: 'mu-' + slugify(m.title), cat: 'Music', sub: /Symphony/.test(m.perf) ? 'Orchestral' : 'Piano', title: m.title, by: m.by, perf: m.perf, price: 0, lic: /cc0/i.test(m.lic) ? 'CC0' : 'Public domain', kind: 'audio', pic: m.pic, audio: m.src,
    files: [{ name: slugify(m.title) + '.mp3', url: m.src }], specs: { Composer: m.by, Performer: m.perf, Length: m.dur, Format: 'MP3' }, source: m.page, desc: `${m.title} by ${m.by}${m.perf ? ', performed by ' + m.perf : ''}. A free recording you can use under your film.` }; }
  function fromImage(i) { return { id: 'im-' + slugify(i.title), cat: 'Photos & images', sub: i.medium === 'Photograph' ? 'Photography' : i.medium === 'Poster' ? 'Posters & lobby cards' : 'Paintings & prints', title: i.title, by: i.by, film: i.medium === 'Poster' ? 'trip-to-the-moon' : undefined,
    price: 0, lic: 'Public domain', kind: 'image', pic: i.pic, big: i.pic.replace(/\/(500|960)px-/, '/1280px-'), files: [{ name: slugify(i.title) + '.jpg', url: i.pic.replace(/\/(500|960)px-/, '/1280px-') }], specs: { Artist: i.by, Year: i.year, Medium: i.medium }, source: i.page,
    desc: `${i.title} by ${i.by}, ${i.year}. Free to use.` }; }
})();
const assets = MARKET;
const marketItem = id => MARKET.find(x => x.id === id);

/* ---------- what creators shared for everyone: kept by the site's API (worker/index.js), added when it answers ---------- */
const sessionNow = () => { try { return JSON.parse(localStorage.getItem('session')) || null; } catch { return null; } };
// a tile for files that have no picture: the file type on a quiet card
const fileTile = ext => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#eceef3"/><rect x="250" y="96" width="140" height="180" rx="14" fill="#fff" stroke="#c9cedb" stroke-width="3"/><path d="M276 150h88M276 180h88M276 210h56" stroke="#c9cedb" stroke-width="6" stroke-linecap="round"/><rect x="214" y="232" width="${Math.max(84, ext.length * 24 + 36)}" height="48" rx="10" fill="#5b4bff"/><text x="${214 + Math.max(84, ext.length * 24 + 36) / 2}" y="265" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${ext.toUpperCase().slice(0, 6)}</text></svg>`);
function fromServer(d) {
  const at = id => '/api/files/' + id, main = d.files[0] || {}, ext = ((main.name || '').split('.').pop() || 'file').slice(0, 5), free = !d.price, total = d.files.reduce((n, f) => n + f.size, 0);
  const kind = (d.kind === 'audio' || d.kind === 'video') && free && d.files.length === 1 ? d.kind : 'image';
  const pic = d.thumb ? at(d.thumb) : d.kind === 'image' && free && /^image\/(jpeg|png|webp|gif)/.test(main.type) ? at(main.id) : kind === 'audio' ? '' : fileTile(ext);
  const by = d.by || short(d.owner);
  return { id: 'up-' + d.id, sid: d.id, shared: true, owner: d.owner, cat: d.cat, sub: d.sub, title: d.title, by, creator: by, price: d.price || 0, lic: d.lic, kind, pic,
    big: d.kind === 'image' && free && /^image\/(jpeg|png|webp|gif)/.test(main.type) ? at(main.id) : pic, video: kind === 'video' ? at(main.id) : undefined, audio: kind === 'audio' ? at(main.id) : undefined,
    gallery: (d.gallery || []).length > 1 ? d.gallery.map(at) : undefined, files: d.files.map(f => ({ name: f.name, size: f.size, url: free ? at(f.id) + '?dl=1' : '', note: f.note, direct: true })),
    desc: d.desc || `${d.title}, shared by ${by}.`, specs: { Format: ext.toUpperCase(), ...(d.files.length > 1 ? { Files: d.files.length } : {}), Tags: d.tags }, added: new Date(d.at).toISOString().slice(0, 10) };
}
// on the marketplace pages (where the first half of the library is already there) the second half follows at once
const MORE = typeof LIBRARY !== 'undefined' ? loadMore() : Promise.resolve([]);
const SHARED = fetch('/api/items').then(r => (r.ok ? r.json() : [])).then(list => (Array.isArray(list) ? list : [])).catch(() => []).then(list => {
  const items = list.map(fromServer).filter(it => !MARKET.some(x => x.id === it.id));
  MARKET.unshift(...items); items.forEach(it => addLibrary.seen.add(it.id));
  if (items.length) document.dispatchEvent(new CustomEvent('market-changed', { detail: items }));
  return items;
});
// titles added as credits, for everyone
const TITLES = fetch('/api/titles').then(r => (r.ok ? r.json() : [])).then(list => (Array.isArray(list) ? list : [])).catch(() => []);
// Films released here by their makers. They arrive after the page is up; whatever lists films is told when they do.
const RELEASES = fetch('/api/films').then(r => (r.ok ? r.json() : [])).then(list => (Array.isArray(list) ? list : [])).catch(() => []).then(list => {
  FILMS.released(list);
  if (FILMS.releases.length) document.dispatchEvent(new CustomEvent('films-changed'));
  return FILMS.releases;
});
const priceTag = it => it.price ? `<span class="price">$${it.price}</span>` : '<span class="price free">Free</span>';

const campaigns = [
  { title: 'The Conquest of the Pole', creator: ME, raised: 64200, goal: 90000, days: 18, pic: frame(film['conquest-of-the-pole']) },
  { title: 'The Merry Frolics of Satan: colouring the print', creator: ME, raised: 8400, goal: 15000, days: 31, pic: frame(film['merry-frolics-of-satan']) },
];

// Shown when someone presses "Load more"; after these run out the lists repeat.
const more = {
  films: CATALOG.films.filter(f => !front.includes(f.key)),
  live: ['sherlock-jr', 'battleship-potemkin', 'kino-eye', 'gertie-the-dinosaur'].map(screening),
  assets: [],
};

// Everyone who worked on the film gets a share of everything it earns. The names and roles are the film's real credits;
// the percentages are an example of a split.
const crew = cur.crew;
const tone = name => ['#101216', '#c9772b', '#2f6fed', '#0d8a4f', '#d6454a', '#7d87a3', '#5b4bff'][[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % 7];
const initials = name => name.replace(/^The /, '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const avatar = (name, cls = '') => who[name]?.pic ? `<img class="avatar ${cls}" src="${small(who[name].pic)}" alt="" loading="lazy">` : `<span class="avatar ${cls}" style="background:${tone(name)}">${initials(name)}</span>`;
const face = name => avatar(name, 'xs');
const mug = c => avatar(c.name);
const person = a => avatar(a.name);
const artistUrl = name => name === ME ? 'creator.html' : who[name] || FILMS.known.has(name) ? 'artist.html?name=' + encodeURIComponent(name) : '#';
const short = a => a.slice(0, 6) + '…' + a.slice(-4);
const years = p => p.born ? `${p.born}–${p.died || ''}` : '';

/* ---------- icons ---------- */

const icon = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const icons = {
  home: icon('<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z"/>'),
  user: icon('<circle cx="12" cy="8" r="4"/><path d="M4 20c1.500-4 4.500-5.500 8-5.500s6.500 1.500 8 5.500"/>'),
  list: icon('<path d="M9 6h11M9 12h11M9 18h11M4.500 6h.01M4.500 12h.01M4.500 18h.01"/>'),
  menu: icon('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  gem: icon('<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20M9 3l-2 6 5 12 5-12-2-6"/>'),
  trend: icon('<path d="M3 17l6-6 4 4 8-8M15 7h6v6"/>'),
  film: icon('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 5v14M17 5v14M3 10h4M3 14h4M17 10h4M17 14h4"/>'),
  watch: icon('<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/>'),
  live: icon('<circle cx="12" cy="12" r="2.5"/><path d="M7.5 7.5a6.4 6.4 0 0 0 0 9M16.5 7.5a6.4 6.4 0 0 1 0 9M4.5 4.5a10.6 10.6 0 0 0 0 15M19.500 4.500a10.600 10.600 0 0 1 0 15"/>'),
  market: icon('<path d="M12 3 3 7.5l9 4.500 9-4.500L12 3zM3 12l9 4.500 9-4.500M3 16.500 12 21l9-4.500"/>'),
  fund: icon('<circle cx="12" cy="12" r="9"/><path d="M12 6.500v11M15 9.500c0-1.100-1.300-2-3-2s-3 .9-3 2 1.300 2 3 2.500 3 1.400 3 2.500-1.300 2-3 2-3-.9-3-2"/>'),
  merch: icon('<path d="M8.500 4 3 7l2 4 2.500-1v10h9V10l2.500 1 2-4-5.500-3a3.500 3.500 0 0 1-7 0z"/>'),
  split: icon('<path d="M12 3v9l7.800 4.500A9 9 0 1 1 12 3z"/><path d="M15.500 3.700A9 9 0 0 1 20.300 8.500L15.500 8.500z"/>'),
  upload: icon('<path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>'),
};
$$('[data-icon]').forEach(el => { el.outerHTML = icons[el.dataset.icon]; });

/* ---------- shared header and pay dialog ---------- */

// What kind of thing a video is. The catalogue has films; the other kinds are ready for what creators publish.
const CATEGORIES = [['feature-film', 'Feature film'], ['documentary', 'Documentary'], ['short-film', 'Short film'], ['animation', 'Animation'], ['series', 'Series'], ['vlog', 'Vlog'], ['entertainment', 'Entertainment'],
  ['reality-show', 'Reality show'], ['podcast', 'Podcast'], ['course', 'Course'], ['tutorial', 'Tutorial'], ['music-video', 'Music video']];
// What each kind is called in the free library, where a "vlog" is a 1940s home movie and a "course" a classroom film.
const LIBRARY_KINDS = { 'feature-film': 'Feature films', documentary: 'Documentaries and newsreels', 'short-film': 'Short films', animation: 'Cartoons and animation', series: 'Serials and television',
  vlog: 'Home movies', entertainment: 'Advertising films', course: 'Classroom films', tutorial: 'Training films', 'music-video': 'Music films' };
const categoryOf = f => f.cat ? f.cat : f.kind === 'Documentary' ? 'documentary' : f.kind === 'Animation' ? 'animation' : f.kind === 'Short film' || f.secs < 2400 ? 'short-film' : 'feature-film';
// Sidebar: every place on the site, one click away. [key, label, href, icon, shown in the narrow rail]
const side = {
  // Only what is real has a place here. Screenings and studios are reached from the library; merch and funding, which are still examples, from the example creator.
  main: [['home', 'Home', 'index.html', 'home', 1], ['library', 'Library', 'library.html', 'film', 1], ['market', 'Marketplace', 'market.html', 'market', 1], ['trending', 'Trending', 'trending.html', 'trend', 1]],
  // "You" is you only once you are logged in. Until then it offers to log in, and an example of what a creator's page looks like.
  you: me => (me ? [['mine', 'Your page', 'artist.html?wallet=' + me.address, 'user', 1], ['dashboard', 'Dashboard', 'dashboard.html', 'trend'], ['create', 'Create', 'upload.html', 'upload', 1]]
    : [['login', 'Log in', '#', 'user', 1, 'data-open-login'], ['creator', 'Example creator', 'creator.html', 'list'], ['create', 'Create', 'upload.html', 'upload', 1]]),
};
const sideLink = ([key, label, href, ic, rail, attr]) => `<a class="sl${rail ? ' rail' : ''}" data-key="${key}" href="${href}"${attr ? ' ' + attr : ''}>${icons[ic]}<span>${label}</span></a>`;
document.body.insertAdjacentHTML('afterbegin', `
<a class="skip" href="#main">Skip to the content</a>
<header class="top"><div class="wrap">
  <button class="btn icon bare" id="menu" aria-label="Open or close the sidebar">${icons.menu}</button>
  <a class="logo" href="index.html"><span class="de">de</span><span class="in">in</span><i>.</i><b>art</b></a>
  <form class="search" onsubmit="return false"><input placeholder="Search films, footage, music" aria-label="Search"></form>
  <button class="btn icon bare searchbtn" aria-label="Search">${icon('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.800-3.800"/>')}</button>
  <a class="btn primary" href="upload.html">Create</a>
  <button class="btn icon" id="theme" aria-label="Switch between light and dark mode" title="Light / dark">
    <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
    <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  </button>
  <span data-account></span>
</div></header>
<aside class="sidebar" aria-label="Site navigation">
  ${side.main.map(sideLink).join('')}
  <hr><h4>You</h4>
  <div data-you></div>
  <hr><div data-following></div>
  <hr><a class="sl" data-key="about" href="about.html">${icons.list}<span>About</span></a>
  <p class="side-foot">Own your narrative.</p>
</aside>
<div class="scrim"></div>
<nav class="tabbar" aria-label="Main">
  <a href="index.html" data-tab-for="home">${icons.home}<span>Home</span></a>
  <a href="library.html" data-tab-for="library">${icons.film}<span>Library</span></a>
  <a href="upload.html" class="make" data-tab-for="create">${icons.upload}<span>Create</span></a>
  <a href="market.html" data-tab-for="market">${icons.market}<span>Market</span></a>
  <a href="#" data-tab-for="mine">${icons.user}<span>You</span></a>
</nav>`);
// drawn again whenever someone logs in or out (login.js calls it)
function drawYou() {
  const me = sessionNow(), tab = $('.tabbar [data-tab-for="mine"]');
  $('[data-you]').innerHTML = side.you(me).map(sideLink).join('');
  tab.href = me ? 'artist.html?wallet=' + me.address : '#'; tab.toggleAttribute('data-open-login', !me);
  const here = page === 'artist' && me && walletParam.toLowerCase() === me.address ? 'mine' : page;
  $$('[data-you] .sl').forEach(l => l.classList.toggle('on', l.dataset.key === here));
}
drawYou();
document.addEventListener('click', e => { if (e.target.closest('a[data-open-login]')) e.preventDefault(); });
if ($('main') && !$('main').id) $('main').id = 'main';
$$('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tabFor === ({ category: 'library', live: 'library', studios: 'library', studio: 'library' }[page] || page) && a.dataset.tabFor !== 'create'));
// on a phone the search box sits behind an icon and takes the whole bar while it is used
document.addEventListener('click', e => {
  if (e.target.closest('.searchbtn')) { document.documentElement.dataset.searching = '1'; $('.search input').focus(); }
  else if (document.documentElement.dataset.searching && !e.target.closest('.search')) delete document.documentElement.dataset.searching;
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') delete document.documentElement.dataset.searching; });

/* ---------- following and sharing ---------- */
// Who you follow is kept in this browser; the sidebar lists them, or a few suggestions while you follow nobody.
const following = new Set((() => { try { return JSON.parse(localStorage.getItem('following')) || []; } catch { return []; } })());
const followName = b => b.dataset.follow || ($('h1') && $('h1').firstChild && $('h1').firstChild.textContent.trim()) || '';
function drawFollowing() {
  const place = n => (who[n] ? artistUrl(n) : (st => (st ? 'studio.html?s=' + st.slug : ''))(typeof STUDIOS !== 'undefined' && STUDIOS.find(x => x.name === n)));
  const mine = [...following].filter(place), list = mine.length ? mine : ['Osman Burak Gülveren', 'F. W. Murnau', 'XCOPY', 'Buster Keaton'].filter(n => who[n]);
  $('[data-following]').innerHTML = `<h4>${mine.length ? 'Following' : 'Suggested'}</h4>` + list.map(n => `<a class="sl" href="${place(n)}">${who[n] ? avatar(n, 'xxs') : `<span class="avatar xxs" style="background:${tone(n)}">${initials(n)}</span>`}<span>${esc(n)}</span></a>`).join('');
}
const paintFollow = () => $$('.btn.follow').forEach(b => { if (b.closest('a')) return; const on = following.has(followName(b)); b.classList.toggle('on', on); b.textContent = on ? 'Following' : 'Follow'; b.setAttribute('aria-pressed', on); });
document.addEventListener('click', e => {
  const f = e.target.closest('.btn.follow'), sh = e.target.closest('[data-share]');
  if (f && !f.closest('a')) { const n = followName(f); if (!n) return; following.has(n) ? following.delete(n) : following.add(n); try { localStorage.setItem('following', JSON.stringify([...following])); } catch {} paintFollow(); drawFollowing(); }
  if (sh) {
    const said = t => { const was = sh.dataset.label || (sh.dataset.label = sh.textContent); sh.textContent = t; setTimeout(() => { sh.textContent = was; }, 1600); };
    const copy = () => (navigator.clipboard ? navigator.clipboard.writeText(location.href) : Promise.reject()).catch(() => { const t = Object.assign(document.createElement('textarea'), { value: location.href }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }).then(() => said('Link copied'), () => said('Link copied'));
    if (navigator.share && matchMedia('(hover: none)').matches) navigator.share({ title: document.title, url: location.href }).catch(() => {}); else copy();
  }
});
addEventListener('DOMContentLoaded', () => { drawFollowing(); paintFollow(); });

const root = document.documentElement;
// the tab icon is the dot too
document.head.insertAdjacentHTML('beforeend', `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0e0f13"/><circle cx="16" cy="16" r="7" fill="#f5a623"/></svg>')}">`);
const markSide = () => {
  const key = page === 'artist' && sessionNow() && walletParam.toLowerCase() === sessionNow().address ? 'mine' : { category: 'library', live: 'library', studios: 'library', studio: 'library' }[page] || page;
  $$('.sl[data-key]').forEach(l => l.classList.toggle('on', l.dataset.key === key));
};
markSide();
$('#menu').addEventListener('click', () => {
  root.dataset.side = root.dataset.side === 'open' ? 'closed' : 'open';
  if (innerWidth >= 1100) try { localStorage.setItem('side', root.dataset.side); } catch {}
});
$('.scrim').addEventListener('click', () => { root.dataset.side = 'closed'; });

// The top bar slides away while scrolling down and comes back on the first scroll up.
let lastY = scrollY;
addEventListener('scroll', () => {
  const y = scrollY;
  if (Math.abs(y - lastY) < 6) return;
  root.dataset.bar = y > lastY && y > 120 ? 'hidden' : 'shown';
  lastY = y;
}, { passive: true });
$('.sidebar').addEventListener('click', e => { if (e.target.closest('a') && innerWidth < 1100) root.dataset.side = 'closed'; });

// Light / dark switch; the choice is remembered between pages and visits.
$('#theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('theme', next); } catch {}
});

document.body.insertAdjacentHTML('beforeend', `
<footer class="foot"><div class="wrap">
  <a class="logo" href="index.html"><span class="de">de</span><span class="in">in</span><i>.</i><b>art</b></a>
  <span class="tagline">Own your narrative.</span>
  <nav class="footnav" aria-label="Footer">
    <div><b>Watch</b><a href="library.html">The free library</a><a href="trending.html">Trending</a><a href="live.html">Screenings</a><a href="studios.html">Studios</a></div>
    <div><b>Marketplace</b><a href="market.html?cat=Footage">Footage</a><a href="market.html?cat=Music">Music</a><a href="market.html?cat=Sound%20effects">Sound effects</a><a href="market.html?cat=Photos%20%26%20images">Photos and images</a></div>
    <div><b>Create</b><a href="release.html">Release a film</a><a href="share-asset.html">Share an asset</a><a href="add-credit.html">Add a credit</a><a href="dashboard.html">Dashboard</a></div>
    <div><b>dein.art</b><a href="about.html">About</a><a href="about.html#report">Report something</a><a href="https://github.com/osmangulveren/dein-art" target="_blank" rel="noopener">Code on GitHub</a><a href="https://x.com/osmangulveren" target="_blank" rel="noopener">Follow the build on X</a><a href="deploy.html">Testnet contract</a></div>
  </nav>
  <p class="demo-note muted small">This is a prototype. The films, music and images are real public-domain and CC0 works from <a class="link" href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a> and the <a class="link" href="https://archive.org" target="_blank" rel="noopener">Internet Archive</a>, with credits from <a class="link" href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>, standing in for what creators would publish. Each film's page says why it is free to show. Views are counted for real; earnings on the example pages, merch and campaigns are examples, and nothing is charged. <a class="link" href="about.html">More about what is real here</a>.</p>
</div></footer>
<dialog id="pay">
  <div class="form">
    <h2></h2>
    <p class="lead muted small"></p>
    <div class="amounts">${[5, 10, 25].map(n => `<button class="pick" data-amount="${n}">$${n}</button>`).join('')}</div>
    <div class="amountslide"><span class="muted small">Or choose an amount</span>${heatSlider({ name: 'amount', min: 2, max: 100, value: 10, prefix: '$', label: 'Amount in dollars' })}</div>
    <div class="pay"><button class="pick on">Card</button><button class="pick">Crypto wallet</button></div>
    <div class="sum"></div>
    <p class="muted small src" style="margin:10px 0"></p>
    <button class="btn primary wide confirm"></button>
    <button class="btn wide close" style="margin-top:8px">Cancel</button>
  </div>
  <div class="thanks done" hidden>
    <div class="tick">✓</div>
    <h2>Thank you</h2>
    <p class="muted t-msg"></p>
    <button class="btn wide close" style="margin-top:20px">Close</button>
  </div>
</dialog>`);

const dialog = $('#pay');
let order = {};
const payModes = {
  support: { title: 'Support this film', lead: 'Pick an amount.', confirm: 'Send support', pick: true },
  tip: { title: 'Tip the stream', lead: 'Pick an amount. Your name shows up in the chat.', confirm: 'Send tip', pick: true },
  buy: { lead: 'You get the files right after payment.', confirm: 'Get it' },
  collect: { lead: 'Yours to keep, with your name on it.', confirm: 'Collect' },
  merch: { lead: 'Printed on demand and shipped to you.', confirm: 'Get it' },
  back: { lead: 'You are only charged if the project reaches its goal.', confirm: 'Back this project' },
};
function drawSum() {
  const net = order.amount - FEE;
  const to = order.mode === 'back' ? 'Goes to the production' : order.split ? 'Shared across cast and crew' : `${order.creator || 'Creator'} receives`;
  $('.sum', dialog).innerHTML = `
    <div><span>You pay</span><span>${money(order.amount)}</span></div>
    <div class="muted"><span>dein.art fee</span><span>−${money(FEE)}</span></div>
    <div class="tot"><span>${to}</span><span>${money(net)}</span></div>
    ${order.split ? crew.map(c => `<div class="who"><span>${c.name} · ${c.pct}%</span><span>${money(net * c.pct / 100)}</span></div>`).join('') : ''}`;
}
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-pay]');
  if (!btn || e.target.closest('[data-audio]')) return;
  const mode = payModes[btn.dataset.pay];
  order = { mode: btn.dataset.pay, amount: Number(btn.dataset.price) || 10, split: 'split' in btn.dataset, creator: btn.dataset.creator };
  $('h2', dialog).textContent = btn.dataset.title || mode.title;
  $('.lead', dialog).textContent = mode.lead;
  $('.amounts', dialog).hidden = !mode.pick; $('.amountslide', dialog).hidden = !mode.pick;
  const slide = $('[data-heat="amount"]', dialog); if (slide) heatSet(slide, order.amount, false);
  $('.confirm', dialog).textContent = mode.confirm;
  $('.src', dialog).textContent = 'Prototype: nothing is charged.';
  $$('.amounts .pick', dialog).forEach(p => p.classList.toggle('on', p.dataset.amount === '10'));
  $('.form', dialog).hidden = false; $('.thanks', dialog).hidden = true;
  drawSum();
  dialog.showModal();
});
$$('.amounts .pick', dialog).forEach(p => p.addEventListener('click', () => {
  $$('.amounts .pick', dialog).forEach(x => x.classList.toggle('on', x === p));
  order.amount = Number(p.dataset.amount); heatSet($('[data-heat="amount"]', dialog), order.amount, false); drawSum();
}));
dialog.addEventListener('heat', e => { order.amount = e.detail.value; $$('.amounts .pick', dialog).forEach(x => x.classList.toggle('on', Number(x.dataset.amount) === order.amount)); drawSum(); });
$$('.pay .pick', dialog).forEach(p => p.addEventListener('click', () => $$('.pay .pick', dialog).forEach(x => x.classList.toggle('on', x === p))));
$('.confirm', dialog).addEventListener('click', () => {
  const net = money(order.amount - FEE);
  $('.t-msg', dialog).textContent = order.mode === 'back' ? `Your ${money(order.amount)} pledge is in. You'll be charged when the project reaches its goal.`
    : order.split ? `${net} is being shared across the cast and crew right now.`
    : `${net} is on its way to ${order.creator || 'the creator'}.`;
  $('.form', dialog).hidden = true; $('.thanks', dialog).hidden = false;
  if (order.mode === 'tip') addChat('You', `tipped ${money(order.amount)}`, true);
});
$$('.close', dialog).forEach(b => b.addEventListener('click', () => dialog.close()));

/* ---------- cards ---------- */

const byline = f => f.by.join(' and ');
const viewsText = n => `${Number(n).toLocaleString('en-US')} ${n === 1 ? 'view' : 'views'}`;
const under = (f, ...more) => [byline(f), f.year, ...more].filter(Boolean).join(' · ');
const durTag = f => (f.dur ? `<span class="badge dur">${f.dur}</span>` : '');
const cards = {
  films: f => `<a class="card" href="${watchUrl(f)}"><div class="thumb${f.ia ? ' soft' : ''}"><img src="${frame(f)}" alt="" loading="lazy">${durTag(f)}</div><div class="meta">${face(f.creator)}<div><h3>${esc(f.title)}</h3><p>${esc(under(f))}<span data-views="${f.key}"></span></p></div></div></a>`,
  resume: f => { const p = progress[f.key], secs = f.secs || p.of || 0, left = Math.max(1, Math.round((secs - p.t) / 60)); return `<a class="card" href="${watchUrl(f)}"><div class="thumb${f.ia ? ' soft' : ''}"><img src="${frame(f)}" alt="" loading="lazy"><span class="badge dur">${left} min left</span><span class="resumebar"><i style="width:${Math.round(p.t / secs * 100)}%"></i></span></div><div class="meta">${face(f.creator)}<div><h3>${esc(f.title)}</h3><p>${esc(under(f))}</p></div></div></a>`; },
  next: f => `<a class="next" href="${watchUrl(f)}"><div class="thumb${f.ia ? ' soft' : ''}"><img src="${frame(f, f.at, 330)}" alt="" loading="lazy">${durTag(f)}</div><div><h3>${esc(f.title)}</h3><p class="muted small">${esc(byline(f))}<br>${[f.year, f.kind].filter(Boolean).join(' · ')}<span data-views="${f.key}"></span></p></div></a>`,
  live: s => `<a class="card" href="live.html?f=${s.key}"><div class="thumb"><img src="${frame(s, s.scenes[1][0])}" alt="" loading="lazy"><span class="badge live">Screening</span><span class="badge dur">now at ${clock(nowAt(s))}</span></div><div class="meta">${face(s.creator)}<div><h3>Now screening: ${s.title}</h3><p>${byline(s)} · ${s.year}</p></div></div></a>`,
  assets: a => `<a class="card" data-kind="${a.cat}" href="${itemUrl(a)}"><div class="thumb${a.kind === 'merch' ? ' merchthumb' : a.pic ? '' : ' blank'}${a.dark ? ' darkbg' : ''}">${a.kind === 'merch' ? mockup(a) : a.pic ? `<img src="${a.pic}" alt="" loading="lazy">` : `<span class="soundwave awave" aria-hidden="true">${waveBars(a.id, 22)}</span>`}<span class="badge kind">${a.sub === 'Packs' ? 'Sound pack' : a.cat === 'Photos & images' ? a.sub : a.cat === 'Merch' ? PRODUCTS[a.type] || 'Merch' : a.cat}</span>${a.audio ? `<span class="badge dur listen" data-audio="${a.audio}">▶ ${a.specs?.Length || 'Listen'}</span>` : a.specs?.Length ? `<span class="badge dur">${String(a.specs.Length).split(' ')[0].replace(',', '')}</span>` : ''}</div><h3>${a.title}</h3><p>${a.by} · ${priceTag(a)}${a.film && film[a.film] ? ` · from ${film[a.film].title}` : ''}</p></a>`,
  merch: m => merchCard(m),
  // the most watched: ranked by views the site really counted, and the number is the count
  trending: f => `<a class="card" href="${watchUrl(f)}"><div class="thumb${f.ia ? ' soft' : ''}"><img src="${frame(f)}" alt="" loading="lazy"><span class="badge rank">${f.rank}</span>${durTag(f)}</div><div class="meta">${face(f.creator)}<div><h3>${esc(f.title)}</h3><p>${esc(byline(f))} · ${viewsText(f.n)} ${f.span}</p></div></div></a>`,
  rankrow: f => `<a class="rankrow" href="${watchUrl(f)}"><span class="num">${f.rank}</span><div class="thumb${f.ia ? ' soft' : ''}"><img src="${frame(f, f.at, 330)}" alt="" loading="lazy">${durTag(f)}</div><div class="info"><h3>${esc(f.title)}</h3><p class="muted small">${esc([byline(f), f.year, f.kind].filter(Boolean).join(' · '))}</p></div><span class="up">${viewsText(f.n)}</span></a>`,
  castp: a => `<a class="castp" href="${a.href || artistUrl(a.name)}">${person(a)}<span><b>${esc(a.name)}</b><span class="muted small">${esc(a.role)}</span></span></a>`,
  artists: a => `<a class="rankrow" href="${a.href}"><span class="num">${a.rank}</span>${person(a)}<div class="info"><h3>${esc(a.name)}</h3><p class="muted small">${esc(a.role)} · ${esc(a.known)}</p></div><span class="up">${viewsText(a.n)}</span></a>`,
  channels: c => `<div class="channel"><span class="clogo" style="background:${c.tone}">${initials(c.name)}</span><a class="info" href="${c.href}"><b>${c.name}</b><span class="muted small">${c.about}</span></a><button class="btn follow" data-follow="${esc(c.name)}">Follow</button></div>`,
  campaigns: c => {
    const pct = Math.round(c.raised / c.goal * 100);
    return `<a class="card" href="fund.html"><div class="thumb"><img src="${c.pic}" alt="" loading="lazy"><span class="badge kind">Funding</span></div><h3>${c.title}</h3><p>${c.creator}</p><div class="progress"><span style="width:${pct}%"></span></div><p><span class="price">$${c.raised.toLocaleString('en-US')}</span> raised · ${pct}% · ${c.days} days left</p></a>`;
  },
};

// The person an artist page or a profile is about.
const subject = page === 'artist' ? who[param('name')] || who[(ONCHAIN.find(a => a.address === walletParam.toLowerCase()) || {}).name] || who['F. W. Murnau'] : who[ME];
const filmsOf = p => p.films.map(k => film[k]);
const editKey = page === 'creator' ? 'me' : subject.chain ? subject.chain.address : null;
const edits = (() => { try { return (editKey && JSON.parse(localStorage.getItem('edits:' + editKey))) || {}; } catch { return {}; } })();
const addedTitles = (() => { try { return JSON.parse(localStorage.getItem('titles')) || {}; } catch { return {}; } })();
// credits the creator added sit at the top of their role
(edits.credits || []).forEach(c => {
  let g = subject.credits.find(x => x.role === c.role);
  if (!g) subject.credits.push(g = { role: c.role, total: 0, list: [] });
  g.list.unshift({ title: c.title, year: c.year, key: null, added: true, id: c.id, img: c.id && addedTitles[c.id]?.poster }); g.total++;
});

// Next to a film: the director's other films, then films of the same kind.
const sameKind = f => (cur.cat || f.cat ? categoryOf(f) === categoryOf(cur) : f.kind === cur.kind);
const related = [...new Set([...(cur.rel || []).map(k => film[k]).filter(Boolean), ...CATALOG.films.filter(f => f !== cur && f.by.some(n => cur.by.includes(n))), ...CATALOG.films.filter(f => f !== cur && sameKind(f) && !f.by.some(n => cur.by.includes(n)))])].slice(0, 12);
// What is rising this week: films, the people behind them, and the companies that made them.
// What is watched most, and who made it. Nothing here is made up: the ranking is the views the site counted (TOP, below),
// so these two lists are empty until the counts arrive.
const trending = [], artists = [];
const channels = ['Star Film Company', 'Prana Film', 'Edison Studios', 'All-Ukrainian Photo-Cinema Administration', 'Metro Pictures', 'Hal Roach Studios']
  .map(n => CATALOG.companies.find(c => c.name === n)).filter(Boolean)
  .map(c => ({ name: c.name, tone: tone(c.name), href: (() => { const st = typeof STUDIOS !== 'undefined' && STUDIOS.find(x => x.company === c.name); return st ? 'studio.html?s=' + st.slug : watchUrl(film[c.films[0]]); })(),
               about: `${c.films.length} ${c.films.length === 1 ? 'film' : 'films'} here · founded ${c.founded}${c.place ? ', ' + c.place : ''}` }));
// what you were watching, kept in this browser so the home page can offer to carry on
const progress = (() => { try { return JSON.parse(localStorage.getItem('progress')) || {}; } catch { return {}; } })();
// films kept for later, in this browser
const watchlist = new Set((() => { try { return JSON.parse(localStorage.getItem('watchlist')) || []; } catch { return []; } })());
const lists = { films, live: streams, assets, merch, campaigns, related, trending, artists, channels,
  mylist: [...watchlist].map(k => film[k]).filter(Boolean),
  resume: Object.entries(progress).filter(([k, p]) => film[k] && p.t > 20 && p.t < (film[k].secs || p.of || 0) * .95).sort((a, b) => b[1].at - a[1].at).map(([k]) => film[k]),
  // films by the people you follow, as they are: no ranking decides whether you see them
  following: CATALOG.films.filter(f => f.by.some(n => following.has(n)) || following.has(f.creator)),
  quick: CATALOG.films.filter(f => f.secs && f.secs <= 900) };
// The most watched films of the last seven days, as counted by the site. While a week holds too little to rank
// (the daily counts are young), it is everything ever counted, and the page says which of the two it is showing.
const TOP = (async () => {
  const get = days => fetch(`/api/views/top?days=${days}&limit=30`).then(r => (r.ok ? r.json() : [])).then(l => (Array.isArray(l) ? l : [])).catch(() => []);
  // the films behind a list of counts (a film that was since removed drops out)
  const filmsOf_ = async (list, span) => { await Promise.all([FILMS.need(list.map(x => x[0])), RELEASES]); return list.map(([id, n]) => film[id] && { ...film[id], n, span }).filter(Boolean).map((f, i) => ({ ...f, rank: i + 1 })); };
  let span = 'this week', top = await filmsOf_(await get(7), span);
  if (top.length < 4) { span = 'so far'; top = await filmsOf_(await get(0), span); }
  // the people behind them: everyone named as a maker of those films, by the views of their films
  const makers = new Map();
  top.forEach(f => (f.owner ? [[f.by[0], 'artist.html?wallet=' + f.owner]] : f.by.filter(n => who[n] || FILMS.known.has(n)).map(n => [n, artistUrl(n)])).forEach(([name, href]) => {
    const m = makers.get(name) || { name, href, n: 0, role: who[name]?.role || 'Director', known: f.title }; m.n += f.n; makers.set(name, m); }));
  return { span, films: top, makers: [...makers.values()].sort((x, y) => y.n - x.n).map((m, i) => ({ ...m, rank: i + 1 })) };
})();
TOP.then(({ span, films: top, makers }) => {
  $$('[data-list~="trending"]').forEach(el => {
    const card = cards[el.dataset.card || 'trending'], shown = top.slice(0, Number(el.dataset.limit) || 30);
    el.innerHTML = shown.map(card).join('') || '<p class="muted empty">Nothing has been watched yet. The first views will show here.</p>';
    if (!shown.length && el.previousElementSibling?.classList.contains('sec') && page === 'home') { el.hidden = true; el.previousElementSibling.hidden = true; }
  });
  $$('[data-list~="artists"]').forEach(el => {
    const shown = makers.slice(0, Number(el.dataset.limit) || 30);
    el.innerHTML = shown.map(cards[el.dataset.card || 'artists']).join('') || '<p class="muted empty">Nobody yet.</p>';
    if (!shown.length && el.closest('.strip')) el.closest('.strip').hidden = true;
  });
  $$('[data-top-span]').forEach(el => { el.textContent = span === 'this week' ? el.dataset.week : el.dataset.all; });
});
// what creators released here comes first on the home page, once there is something
RELEASES.then(list => $$('[data-releases]').forEach(el => {
  if (!list.length) return;
  $('[data-releases-list]', el).innerHTML = list.slice(0, 8).map(cards.films).join(''); el.hidden = false; fillViews();
  $$('[data-no-releases]').forEach(x => { x.hidden = true; });
}));
// the best known of each kind from the big catalogue, for the rows on the home page
CATEGORIES.forEach(([slug]) => { lists['c-' + slug] = CATALOG.films.filter(f => f.source && categoryOf(f) === slug); });
$$('[data-cat-all]').forEach(a => { const n = FILMS.counts[a.dataset.catAll]; if (n) a.textContent = `All ${n.toLocaleString('en-US')}`; });
$$('[data-films-total]').forEach(el => { if (FILMS.total) el.textContent = `${(FILMS.total + CATALOG.films.filter(f => !f.source && !f.owner).length).toLocaleString('en-US')} films`; });
$$('[data-list]').forEach(el => {
  const names = el.dataset.list.split(' ');
  // a profile shows everything by that person, not just the front page's pick
  const by = el.dataset.by === '@subject' ? subject.name : el.dataset.by;
  let items = names.flatMap(name => (by ? [...lists[name], ...(more[name] || [])] : lists[name]).map(item => ({ item, name })));
  if (names.length > 1) items = items.filter((x, i) => items.findIndex(y => y.item === x.item) === i);
  // on a profile: what this person made, and the films they are credited on
  if (by) items = items.filter(x => x.item.creator === by || x.item.crew?.some(c => c.name === by));
  // someone with no assets of their own still has stills from the films they worked on
  if (by && names[0] === 'assets') items = items.filter(x => x.item.kind !== 'merch');
  if (by && names[0] === 'assets' && !items.length) items = filmsOf(who[by]).flatMap(f => f.scenes.slice(0, 2).map((_, i) => ({ item: stillOf(f, i), name: 'assets' }))).slice(0, 8);
  // a row with nothing in it is left out, heading and all
  if (!items.length && el.hasAttribute('data-hide-empty')) { el.hidden = true; if (el.previousElementSibling?.classList.contains('sec')) el.previousElementSibling.hidden = true; return; }
  if (!items.length && el.dataset.empty) { el.innerHTML = `<p class="muted empty">${el.dataset.empty}</p>`; return; }
  if (el.dataset.card === 'next') items = items.filter(x => x.item !== cur);
  if (el.dataset.skip) items = items.slice(Number(el.dataset.skip));
  if (el.dataset.limit) items = items.slice(0, Number(el.dataset.limit));
  el.innerHTML = items.map(x => cards[el.dataset.card || x.name](x.item)).join('');

  // The public feeds never end: "Load more" keeps adding cards.
  const name = names[0];
  if (!more[name]?.length || by || el.dataset.card) return;
  const pool = [...more[name], ...lists[name]], batch = name === 'live' ? 4 : 8;
  let at = 0;
  el.insertAdjacentHTML('afterend', '<div class="more"><button class="btn">Load more</button></div>');
  const btn = el.nextElementSibling.firstChild;
  btn.addEventListener('click', () => {
    btn.disabled = true; btn.textContent = 'Loading…';
    setTimeout(() => {
      el.classList.remove('row');
      for (let i = 0; i < batch; i++) el.insertAdjacentHTML('beforeend', cards[name](pool[at++ % pool.length]));
      btn.disabled = false; btn.textContent = 'Load more'; fillViews();
      const chip = $('.chip.on'); if (chip) chip.click();
    }, 450);
  });
});

// Music and sounds can be listened to before getting them. One player for the whole page: the button that started it
// shows the state, the sound's waveform fills as it plays, and a bar at the bottom keeps it in reach while scrolling.
const audio = new Audio();
let playing;
const clockOf = t => (isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00');
// a waveform drawn from the item's name, so every sound has its own shape
function waveBars(id, n = 18) { let h = 2166136261; for (const ch of String(id)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; let last = 50; return Array.from({ length: n }, () => { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; last = Math.max(12, Math.min(100, last * .25 + (h % 100) * .8)); return `<i style="height:${Math.round(last)}%"></i>`; }).join(''); }
document.body.insertAdjacentHTML('beforeend', '<div class="nowbar" hidden><button class="btn icon" data-now="toggle" aria-label="Pause or play">❚❚</button><div class="nowinfo"><b></b><span class="muted small"></span></div><input type="range" min="0" max="1000" value="0" data-now="seek" aria-label="Position"><span class="nowtime muted small"></span><button class="btn icon bare" data-now="close" aria-label="Stop">✕</button></div>');
const nowbar = $('.nowbar');
const showState = on => {
  if (!playing) return;
  playing.classList.toggle('playing', on); playing.textContent = on ? (playing.dataset.pause || '❚❚ Playing') : playing.dataset.label;
  $('[data-now="toggle"]', nowbar).textContent = on ? '❚❚' : '▶';
};
const stopAudio = () => { audio.pause(); showState(false); playing?.closest('.arow, .card')?.querySelectorAll('.awave i.on').forEach(i => i.classList.remove('on')); playing = null; nowbar.hidden = true; };
audio.addEventListener('ended', stopAudio);
audio.addEventListener('timeupdate', () => {
  if (!playing) return;
  const p = audio.duration ? audio.currentTime / audio.duration : 0, bars = playing.closest('.arow, .card')?.querySelectorAll('.awave i') || [];
  bars.forEach((el, i) => el.classList.toggle('on', i / bars.length < p));
  if (document.activeElement !== $('[data-now="seek"]', nowbar)) $('[data-now="seek"]', nowbar).value = Math.round(p * 1000);
  $('.nowtime', nowbar).textContent = `${clockOf(audio.currentTime)} / ${clockOf(audio.duration)}`;
});
$('[data-now="seek"]', nowbar).addEventListener('input', e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
document.addEventListener('click', e => {
  const now = e.target.closest('[data-now]'), wave = e.target.closest('.arow .awave');
  if (now && now.dataset.now === 'close') return stopAudio();
  if (now && now.dataset.now === 'toggle' && playing) { audio.paused ? audio.play() : audio.pause(); return showState(!audio.paused); }
  // a click on a row's waveform jumps to that point (and starts the sound if it is not playing)
  if (wave) {
    const btn = wave.closest('.arow').querySelector('[data-audio]'), at = (e.clientX - wave.getBoundingClientRect().left) / wave.offsetWidth;
    if (playing !== btn) btn.click();
    const jump = () => { if (audio.duration) audio.currentTime = at * audio.duration; };
    audio.duration ? jump() : audio.addEventListener('loadedmetadata', jump, { once: true });
    return;
  }
  const b = e.target.closest('[data-audio]');
  if (!b) return;
  e.stopPropagation(); e.preventDefault();
  if (playing === b) { audio.paused ? audio.play() : audio.pause(); return showState(!audio.paused); }
  stopAudio();
  b.dataset.label = b.textContent; playing = b;
  const host = b.closest('.arow, .card, .row');
  $('.nowinfo b', nowbar).textContent = b.dataset.title || host?.querySelector('h3, b')?.textContent || 'Playing';
  $('.nowinfo span', nowbar).textContent = b.dataset.by || '';
  $('.nowtime', nowbar).textContent = ''; $('[data-now="seek"]', nowbar).value = 0; nowbar.hidden = false;
  audio.src = b.dataset.audio; audio.play().catch(() => {}); showState(true);
}, true);

/* ---------- cast and crew split ---------- */

// A person as a large portrait card; the whole card opens their page.
const personCard = (name, role, pct, wallet) => {
  const pic = who[name]?.pic ? who[name].pic.replace('/120px-', '/500px-') : '';
  // someone on a film released here is found by their wallet; everyone else by their page
  return `<a class="crewcard" href="${wallet ? 'artist.html?wallet=' + wallet : artistUrl(name)}" aria-label="${esc(name)}, ${esc(role)}">
    <span class="cc-media">${pic ? `<img src="${pic}" alt="" loading="lazy">` : `<span class="crewinit" style="--t:${tone(name)}">${initials(name)}</span>`}
      <span class="crewname"><b>${esc(name)}</b><span>${esc(role)}</span></span>
      ${pct ? `<span class="crewpct">${pct}%</span>` : ''}</span>
    <span class="notch"><i>↗</i></span>
  </a>`;
};
$$('[data-crew]').forEach(el => {
  el.innerHTML = `
    <div class="crewtop"><h2>Cast and crew</h2><button class="btn icon crewclose" data-close aria-label="Close">✕</button></div>
    <div class="crewcol"><div class="grid crewcards" data-slider>${crew.map(c => personCard(c.name, c.role, c.pct, c.wallet)).join('')}</div></div>`;
});

/* ---------- pages about one film: watch and live ---------- */

$$('[data-cast]').forEach(el => {
  el.innerHTML = page === 'watch' ? crew.map(c => personCard(c.name, c.role, c.pct, c.wallet)).join('')
    : `<a class="btn dark" href="#crew">All cast &amp; crew</a>` + crew.map(c => `<a class="castp" href="${artistUrl(c.name)}">${mug(c)}<span><b>${c.name}</b><span class="muted small">${c.role}</span></span></a>`).join('');
});

const fill = (key, html) => $$(`[data-f="${key}"]`).forEach(el => { el.innerHTML = html; });
const video = $('video[data-f-video]');
if (video) {
  const live = page === 'live';
  document.title = `${cur.title} — dein.art`;
  const posterAt = live && cur.scenes[1] ? cur.scenes[1][0] : cur.at;
  // the Archive's picture of a film is small, so it sits blurred behind the play button instead of being stretched
  if (cur.ia) { $('.player').classList.add('softposter'); $('.player').style.setProperty('--poster', `url("${cur.pic}")`); } else video.poster = frame(cur, posterAt, 1280);
  video.innerHTML = sources(cur);
  $('.stage .glow').src = frame(cur, posterAt, 330);
  // Viewing modes: Normal keeps the page around the film; Cinematic dims everything else and gives the film the screen.
  $('.player').insertAdjacentHTML('beforeend', `<label class="viewmodes"><span>Cinematic</span>${gooSwitch('cinema', false, 'Cinematic mode')}</label>`);
  const savedTheme = root.dataset.theme, savedSide = root.dataset.side;
  const setMode = (mode, remember = true) => {
    const cinema = mode === 'cinema';
    root.dataset.cinema = cinema ? 'on' : '';
    root.dataset.theme = cinema ? 'dark' : (() => { try { return localStorage.getItem('theme') || savedTheme; } catch { return savedTheme; } })();
    root.dataset.side = cinema ? 'closed' : savedSide;
    $$('[data-goo="cinema"]').forEach(sw => setGoo(sw, cinema, true));
    if (remember) try { localStorage.setItem('viewmode', mode); } catch {}
    if (cinema && remember) scrollTo({ top: $('.stage').getBoundingClientRect().top + scrollY - 92, behavior: 'smooth' });
  };
  document.addEventListener('goo', e => { if (e.detail.name === 'cinema') setMode(e.detail.on ? 'cinema' : 'normal'); });
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (e.key === 'c' || e.key === 'C') setMode(root.dataset.cinema === 'on' ? 'normal' : 'cinema');
    if (e.key === 'Escape' && root.dataset.cinema === 'on' && !$('dialog[open]')) setMode('normal');
  });
  setMode((() => { try { return localStorage.getItem('viewmode'); } catch { return null; } })() === 'cinema' ? 'cinema' : 'normal', false);
  const play = $('.player .play');
  if (play) {
    play.addEventListener('click', () => {
      // a film that lives on YouTube or Vimeo plays in their player, loaded only once someone asks for it
      if (cur.embed) {
        const src = cur.embed.site === 'youtube' ? `https://www.youtube-nocookie.com/embed/${cur.embed.id}?autoplay=1&rel=0` : `https://player.vimeo.com/video/${cur.embed.id}?autoplay=1&dnt=1`;
        video.hidden = true; play.hidden = true;
        video.insertAdjacentHTML('afterend', `<iframe class="embed" src="${src}" title="${esc(cur.title)}" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`);
        video.dispatchEvent(new Event('play'));
        return;
      }
      video.dataset.wanted = '1'; video.play().catch(() => {});
    });
    video.addEventListener('play', () => { play.hidden = true; $('.player').classList.remove('softposter'); });
  }
  const lead = cur.creator, p = who[lead];
  fill('title', live ? `Now screening: ${cur.title}` : cur.title);
  fill('proof', `<span class="muted small">On-chain record · demo</span>
    <a class="link" href="${cur.page}" target="_blank" rel="noopener" title="Where the film file comes from">${esc(cur.lic)} · ${cur.source || 'Wikimedia Commons'}</a>
    ${cur.wd ? `<a class="link" href="https://www.wikidata.org/wiki/${cur.wd}" target="_blank" rel="noopener" title="Title, credits and dates">Wikidata</a>` : ''}
    ${cur.imdb ? `<a class="link" href="https://www.imdb.com/title/${cur.imdb}/" target="_blank" rel="noopener">IMDb</a>` : ''}`);
  const studioLink = cur.company[0] ? ((st => (st ? `<a class="link" href="studio.html?s=${st.slug}">${st.name}</a>` : esc(cur.company[0])))(typeof STUDIOS !== 'undefined' && STUDIOS.find(x => x.company === cur.company[0]))) : '';
  if (cur.owner && !live) {
    // A film released here by its makers: real people, real wallets, and a split that is recorded on the test network.
    const ownerUrl = 'artist.html?wallet=' + cur.owner;
    fill('meta', `<span data-views="${cur.key}" data-views-lead></span>${[cur.year, esc(cur.kind), cur.dur].filter(Boolean).join(' · ')} <span class="pill tint">Released on dein.art</span>`);
    fill('byline', `<a href="${ownerUrl}"><span class="avatar" style="background:linear-gradient(135deg,#${cur.owner.slice(2, 8)},#${cur.owner.slice(-6)})"></span></a>
      <a class="who" href="${ownerUrl}"><b>${esc(byline(cur))}</b><span class="muted small">Released by ${ensTag(cur.owner)}</span></a>
      <button class="btn follow" data-follow="${esc(lead)}">Follow</button>`);
    fill('acts', `${cur.support ? '<button class="btn primary" data-chain-support>♥ Support</button>' : ''}
      <button class="btn" data-mylist aria-pressed="${watchlist.has(cur.key)}">${watchlist.has(cur.key) ? '✓ In my list' : '+ My list'}</button>
      <button class="btn" data-share>Share</button>`);
    fill('about', `<h2>About</h2><p class="lead">${esc(cur.blurb)}</p>
      <dl class="facts">${[['Year', cur.year], ['Kind', esc(cur.kind)], ['Language', esc(cur.language)], ['Running time', cur.dur], ['Released', new Date(cur.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })],
        ['Released by', `<a class="link" href="${ownerUrl}">${ensTag(cur.owner)}</a>`], ['Plays from', cur.embed ? (cur.embed.site === 'youtube' ? 'YouTube' : 'Vimeo') : 'dein.art']]
        .filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <p class="muted small" style="margin-top:14px">Free to watch. <span data-owner-tools></span></p>`);
    // the split is read from the test network by chainpay.js, which draws into this
    fill('split', `<h2>Where support goes</h2><div data-chain-split><p class="muted small">Reading the split…</p></div>`);
    if (!crew.some(c => c.pct > 0) || !cur.support) $$('[data-f="split"]').forEach(el => { el.hidden = true; el.parentElement.classList.add('solo'); });
  } else if (live) {
    fill('byline', `<a href="${artistUrl(lead)}">${avatar(lead)}</a>
      <a class="who" href="${artistUrl(lead)}"><b>${byline(cur)}</b><span class="muted small">Running on the clock for everyone · now at ${clock(nowAt(cur))} of ${cur.dur}</span></a>
      <button class="btn follow" data-follow="${esc(lead)}">Follow</button>
      <button class="btn primary" data-pay="tip" data-split>♥ Tip</button>`);
    $$('[data-live-own]').forEach(el => { el.href = watchUrl(cur); });
    fill('about', `<p>${cur.blurb || ''} A screening runs on the clock: whoever opens this page is at the same moment of the film as everyone else. Tips are shared across the cast and crew, the same way everything else a film earns is.</p>`);
    // pressing play joins the screening where it is now
    video.addEventListener('play', () => { const go = () => { video.currentTime = nowAt(cur); }; video.readyState ? go() : video.addEventListener('loadedmetadata', go, { once: true }); }, { once: true });
  } else {
    // under the film: what it is, who made it, and the three things you can do
    fill('meta', `<span data-views="${cur.key}" data-views-lead></span>${[cur.year, cur.kind, cur.country[0], cur.dur].filter(Boolean).join(' · ')} <span class="pill tint">${esc(cur.lic)}</span>`);
    fill('byline', `<a href="${artistUrl(lead)}">${avatar(lead)}</a>
      <a class="who" href="${artistUrl(lead)}"><b>${esc(byline(cur))}</b><span class="muted small">${p ? p.role + (years(p) ? ' · ' + years(p) : '') : lead === 'Unknown maker' ? esc(cur.kind) : 'Maker'}</span></a>
      ${lead === 'Unknown maker' ? '' : `<button class="btn follow" data-follow="${esc(lead)}">Follow</button>`}`);
    // support goes to the people credited; a film with nobody credited here has no one to send it to yet
    fill('acts', `${crew.length ? '<button class="btn primary" data-pay="support" data-split>♥ Support</button>' : ''}
      <button class="btn" data-mylist aria-pressed="${watchlist.has(cur.key)}">${watchlist.has(cur.key) ? '✓ In my list' : '+ My list'}</button>
      <button class="btn" data-share>Share</button>`);
    const wrong = `https://github.com/osmangulveren/dein-art/issues/new?title=${encodeURIComponent('Not public domain: ' + cur.title)}&body=${encodeURIComponent(location.href)}`;
    fill('about', `<h2>About</h2><p class="lead" data-blurb>${cur.blurb || (cur.ia ? '<span class="muted">Reading the description from the Internet Archive…</span>' : '')}</p>
      <dl class="facts">${[['Year', cur.year], ['Kind', esc(cur.kind)], ['Country', cur.country.join(', ')], ['Studio', studioLink], ['Running time', `<span data-runtime>${cur.dur}</span>`],
        [cur.why ? 'Why it is free' : 'Licence', esc(cur.why ? FILMS.why(cur) : cur.lic)],
        ['Film file', `<a class="link" href="${cur.page}" target="_blank" rel="noopener">${cur.source || 'Wikimedia Commons'} ↗</a>`],
        ['Credits', [cur.wd && `<a class="link" href="https://www.wikidata.org/wiki/${cur.wd}" target="_blank" rel="noopener">Wikidata ↗</a>`, cur.imdb && `<a class="link" href="https://www.imdb.com/title/${cur.imdb}/" target="_blank" rel="noopener">IMDb ↗</a>`].filter(Boolean).join(' · ')]]
        .filter(r => r[1] && r[1] !== '<span data-runtime></span>' || (r[0] === 'Running time' && cur.ia)).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <p class="muted small" style="margin-top:14px">Free to watch. The film's record on-chain is a demo.${cur.why === 'marked' ? ` This film is here because its page at the Internet Archive marks it public domain; nobody at dein.art has checked that. <a class="link" href="${wrong}" target="_blank" rel="noopener">Tell us if it is wrong</a>.` : cur.why ? ` <a class="link" href="${wrong}" target="_blank" rel="noopener">Report a mistake</a>.` : ''}</p>`);
    // the thing this platform is for: whatever the film earns goes to everyone who made it
    const top = [...crew].sort((x, y) => y.pct - x.pct);
    // a film with nobody credited here has no split to show, and no cast row
    if (!crew.length) { $$('[data-f="split"]').forEach(el => { el.hidden = true; el.parentElement.classList.add('solo'); }); $$('[data-cast]').forEach(el => { el.closest('section').hidden = true; }); }
    else fill('split', `<h2>Where support goes</h2>
      <p class="muted small">Whatever this film earns is split across the people who made it, automatically, minus a flat ${money(FEE)} for dein.art each time.</p>
      <div class="splitbar" role="img" aria-label="Shares of cast and crew">${top.map(c => `<i style="flex:${c.pct};background:${tone(c.name)}" title="${esc(c.name)} · ${c.pct}%"></i>`).join('')}</div>
      <div class="splitlist">${top.slice(0, 4).map(c => `<a class="splitrow" href="${artistUrl(c.name)}"><i style="background:${tone(c.name)}"></i><span><b>${esc(c.name)}</b><small>${esc(c.role)}</small></span><em>${c.pct}%</em></a>`).join('')}</div>
      <div class="splitfoot">${top.length > 4 ? `<a class="link" href="#crew">and ${top.length - 4} more</a>` : '<span></span>'}<button class="btn primary small" data-pay="support" data-split>♥ Support the film</button></div>
      <p class="muted small" style="margin-top:10px">Prototype: the percentages are an example of a split, and nothing is charged.</p>`);
  }
  fill('related', related.every(f => f.by.some(n => cur.by.includes(n))) ? `More from ${byline(cur)}` : 'More to watch');

  // Moments of the film that viewers can collect, marked on the timeline. A click jumps the film there.
  const marks = $('[data-marks]'), sceneBox = $('[data-scene]');
  if (marks) {
    const scenes = cur.scenes.filter(s => s[1]).map(([t, name]) => ({ t, name }));
    sceneBox.addEventListener('click', e => { const b = e.target.closest('[data-from]'); if (b) { video.currentTime = Number(b.dataset.from); video.play().catch(() => {}); } });
    const showScene = (s, jump) => {
      sceneBox.innerHTML = `<img src="${frame(cur, s.t, 330)}" alt=""><div><b>Scene: ${s.name}</b><span class="muted small">At ${clock(s.t)}</span></div><button class="btn dark" data-from="${s.t}">▶ Play from here</button>`;
      $$('.mark', marks).forEach((m, i) => m.classList.toggle('on', scenes[i] === s));
      if (jump) { video.currentTime = s.t; $('span', marks).style.width = s.t / cur.secs * 100 + '%'; }
    };
    scenes.forEach(s => {
      const m = document.createElement('button');
      m.className = 'mark'; m.style.left = s.t / cur.secs * 100 + '%'; m.setAttribute('aria-label', 'Scene: ' + s.name);
      m.addEventListener('click', () => showScene(s, true));
      marks.append(m);
    });
    video.addEventListener('timeupdate', () => { $('span', marks).style.width = video.currentTime / cur.secs * 100 + '%'; });
    if (scenes.length) showScene(scenes[Math.min(2, scenes.length - 1)]); else { marks.hidden = true; sceneBox.hidden = true; }
  }
}
if (video && cur.ia) (async () => {
  const say = html => $$('[data-blurb]').forEach(el => { el.innerHTML = html; });
  try {
    const d = await (await fetch('https://archive.org/metadata/' + encodeURIComponent(cur.ia))).json(), meta = d.metadata || {};
    if (!cur.mp4) {
      // the same choice the catalogue build makes: the longest film in the item, in the lightest version that plays everywhere
      const order = ['h.264', 'h.264 IA', '512Kb MPEG4', 'MPEG4', 'HiRes MPEG4', 'h.264 HD'], len = f => { const v = String(f.length || ''), m = v.split(':').map(Number); return m.length > 1 ? m.reduce((a, x) => a * 60 + x, 0) : Number(v) || 0; };
      const vids = (d.files || []).filter(f => /\.mp4$/i.test(f.name) && order.includes(f.format)), longest = Math.max(0, ...vids.map(len));
      const best = vids.filter(f => len(f) >= longest * .95).sort((a, b) => order.indexOf(a.format) - order.indexOf(b.format))[0];
      if (!best) throw new Error('no film file');
      cur.mp4 = FILMS.mp4(cur.ia, best.name);
      if (!cur.secs && longest) { cur.secs = Math.round(longest); cur.dur = clock(cur.secs); $$('[data-runtime]').forEach(el => { el.textContent = cur.dur; }); }
      video.innerHTML = sources(cur); video.load();
      if (video.dataset.wanted) video.play().catch(() => {});
    }
    const text = [].concat(meta.description || []).join(' '), box = document.createElement('div'); box.innerHTML = text.replace(/<br\s*\/?>(\s*)/gi, ' ');
    const plain = box.textContent.replace(/\s+/g, ' ').trim();
    if (!cur.blurb) say(plain ? `${esc(plain.length > 700 ? plain.slice(0, 700).replace(/\s+\S*$/, '') + '…' : plain)} <span class="muted small">Description from its page at the <a class="link" href="${cur.page}" target="_blank" rel="noopener">Internet Archive</a>.</span>` : `<span class="muted">The Internet Archive has no description of this film.</span>`);
  } catch (e) {
    if (!cur.blurb) say('');
    if (!cur.mp4) { $('.player').insertAdjacentHTML('beforeend', `<div class="nofile"><b>This film could not be loaded from the Internet Archive.</b><a class="btn white" href="${cur.page}" target="_blank" rel="noopener">Open it there ↗</a></div>`); const pl = $('.player .play'); if (pl) pl.hidden = true; }
  }
})();
if (video && page === 'watch') {
  // Scenes of the film as a strip of chapters under the player: a click jumps there, and the one that is playing is lit.
  const strip = $('[data-chapters]'), scenes = cur.scenes.filter(sc => sc[1]).map(([t, name]) => ({ t, name }));
  if (strip && scenes.length > 1) {
    strip.innerHTML = scenes.map((sc, i) => `<button class="chapter" data-at="${sc.t}"${cur.auto ? ` aria-label="Play from ${sc.name}"` : ''}><span class="thumb"><img src="${frame(cur, sc.t, 250)}" alt="" loading="lazy"><span class="badge dur">${clock(sc.t)}</span></span>${cur.auto ? '' : `<b>${esc(sc.name)}</b>`}</button>`).join('');
    strip.addEventListener('click', e => { const b = e.target.closest('[data-at]'); if (b) { video.currentTime = Number(b.dataset.at); video.play().catch(() => {}); } });
    const light = () => { const at = scenes.reduce((k, sc, i) => (video.currentTime >= sc.t ? i : k), -1); $$('.chapter', strip).forEach((c, i) => c.classList.toggle('on', i === at)); };
    video.addEventListener('timeupdate', light); video.addEventListener('seeked', light);
  } else if (strip) strip.hidden = true;

  // what the marketplace holds from this film: stills, posters, merch
  const mine = MARKET.filter(x => x.film === cur.key), shelf = $('[data-fromfilm]');
  if (shelf && mine.length) { shelf.hidden = false; $('[data-fromfilm-list]').innerHTML = mine.slice(0, 12).map(cards.assets).join(''); $('[data-fromfilm-all]').href = 'market.html?q=' + encodeURIComponent(cur.title); }

  // my list
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-mylist]'); if (!b) return;
    watchlist.has(cur.key) ? watchlist.delete(cur.key) : watchlist.add(cur.key);
    try { localStorage.setItem('watchlist', JSON.stringify([...watchlist])); } catch {}
    FILMS.remember(cur);
    b.textContent = watchlist.has(cur.key) ? '✓ In my list' : '+ My list'; b.setAttribute('aria-pressed', watchlist.has(cur.key));
  });

  // What plays next: the first film in the rail. With autoplay on it starts after a short count; either way the end of a film offers it.
  const next = [...related, ...films].find(f => f !== cur), card = $('[data-endcard]');
  let auto = (() => { try { return localStorage.getItem('autonext') !== 'off'; } catch { return true; } })(), timer;
  $('[data-autonext]').innerHTML = gooSwitch('autonext', auto, 'Play the next film automatically');
  document.addEventListener('goo', e => { if (e.detail.name !== 'autonext') return; auto = e.detail.on; try { localStorage.setItem('autonext', auto ? 'on' : 'off'); } catch {} });
  const stopCount = () => { clearInterval(timer); timer = null; };
  video.addEventListener('ended', () => {
    if (!next || !card) return;
    let left = 8;
    const draw = () => { card.innerHTML = `<div><span class="muted small">Up next</span><b>${esc(next.title)}</b><span class="muted small">${esc(under(next, next.dur))}</span>
      <div class="endacts"><a class="btn white" href="${watchUrl(next)}">▶ Play${auto && timer ? ` in ${left}` : ' now'}</a><button class="btn glass" data-replay>Watch again</button>${auto && timer ? '<button class="btn glass" data-endstop>Cancel</button>' : ''}</div></div>
      <img src="${frame(next, next.at, 500)}" alt="">`; };
    card.hidden = false;
    if (auto) timer = setInterval(() => { left--; if (left <= 0) { stopCount(); location.href = watchUrl(next); } else draw(); }, 1000);
    draw();
    card.onclick = e => { if (e.target.closest('[data-endstop]')) { stopCount(); draw(); } if (e.target.closest('[data-replay]')) { stopCount(); card.hidden = true; video.currentTime = 0; video.play().catch(() => {}); } };
  });
  video.addEventListener('play', () => { stopCount(); if (card) card.hidden = true; });

  // keys, as on every player people already know
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey || $('dialog[open]')) return;
    const k = e.key.toLowerCase(), seek = d => { video.currentTime = Math.max(0, Math.min((video.duration || cur.secs) - 1, video.currentTime + d)); };
    if (k === ' ' || k === 'k') { e.preventDefault(); video.paused ? video.play().catch(() => {}) : video.pause(); }
    else if (k === 'arrowleft') seek(-5); else if (k === 'arrowright') seek(5);
    else if (k === 'j') seek(-10); else if (k === 'l') seek(10);
    else if (k === 'm') video.muted = !video.muted;
    else if (k === 'f') (document.fullscreenElement ? document.exitFullscreen() : video.requestFullscreen?.())?.catch?.(() => {});
    else if (k === 'n' && next) location.href = watchUrl(next);
    else if (/^[0-9]$/.test(k)) video.currentTime = (video.duration || cur.secs) * Number(k) / 10;
  });
}
function clock(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(Math.floor(s % 60)).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; }

const reviews = $('[data-reviews]');
if (reviews) {
  const key = 'reviews:' + cur.key, read = () => { try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; } };
  const form = $('[data-review-form]'), starBox = $('[data-stars]'); let rating = 0;
  const stars = n => '★★★★★'.slice(0, n) + '<i>' + '★★★★★'.slice(n) + '</i>';
  const drawStars = () => { starBox.innerHTML = [1, 2, 3, 4, 5].map(n => `<button type="button" class="star${n <= rating ? ' on' : ''}" data-star="${n}" role="radio" aria-checked="${n === rating}" aria-label="${n} of 5">★</button>`).join(''); };
  const draw = () => {
    const list = read();
    reviews.innerHTML = list.map(r => `<div class="review">${avatar(ME)}<div><b>You <span class="rstars">${stars(r.stars)}</span></b><p>${esc(r.text)}</p><span class="muted small">${esc(r.at)}</span></div></div>`).join('') || '<p class="muted" data-noreviews>No reviews yet. Be the first.</p>';
    $('[data-review-avg]').textContent = list.length ? `${(list.reduce((n, r) => n + r.stars, 0) / list.length).toFixed(1)} of 5 · ${list.length} ${list.length === 1 ? 'review' : 'reviews'}` : '';
  };
  starBox.addEventListener('click', e => { const b = e.target.closest('[data-star]'); if (b) { rating = Number(b.dataset.star); drawStars(); } });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const text = $('textarea', form).value.trim();
    if (!rating && !text) return;
    try { localStorage.setItem(key, JSON.stringify([{ stars: rating || 5, text, at: new Date().toISOString().slice(0, 10) }, ...read()])); } catch {}
    $('textarea', form).value = ''; rating = 0; drawStars(); draw();
  });
  drawStars(); draw();
}

/* ---------- home: straight to a kind of film, or to something to use in one ---------- */
const kindChips = () => CATEGORIES.filter(([slug]) => FILMS.counts[slug]).map(([slug]) => `<a class="chip" href="category.html?c=${slug}">${LIBRARY_KINDS[slug]} <small>${FILMS.counts[slug].toLocaleString('en-US')}</small></a>`).join('');
$$('[data-home-chips]').forEach(el => { el.innerHTML = kindChips(); });
$$('[data-library-chips]').forEach(el => { el.innerHTML = kindChips(); });

/* ---------- home: the featured film ---------- */

const hero = $('.hero[data-hero]');
if (hero) {
  const f = film['trip-to-the-moon'];
  hero.href = watchUrl(f);
  $('img', hero).src = frame(f, f.at, 1280);
  $('h1', hero).textContent = f.title;
  $('.cta .btn.white', hero).outerHTML = '<span class="btn white" data-magnetic><span class="mag-in">▶ Watch free</span></span>';
  $('[data-hero-meta]', hero).textContent = `${f.kind} · ${f.year} · ${Math.round(f.secs / 60)} min`;
  $('p', hero).textContent = `${f.blurb} Free to watch. Whatever it earns is shared across its cast and crew.`;
}

$$('[data-campaign-pic]').forEach(i => { i.src = frame(film['conquest-of-the-pole'], undefined, 960); });

/* ---------- people: artist pages and the Credits tab of a profile ---------- */

const chev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const knownExternal = p => { const seen = new Set(); return p.credits.flatMap(c => c.list).filter(x => x.img && !seen.has(x.title) && seen.add(x.title)).slice(0, 4)
  .map(x => `<a class="poster" href="https://www.imdb.com/title/${x.imdb}/" target="_blank" rel="noopener"><div class="thumb"><img src="${x.img}" alt="" loading="lazy"></div><b>${x.title}</b><span class="muted small">${x.year || 'Upcoming'}</span><span class="muted small">${x.kind}</span></a>`).join(''); };
const knownHtml = p => !p.films.length && p.credits.length ? knownExternal(p) : filmsOf(p).slice(0, 4).map(f => `<a class="poster" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f)}" alt="" loading="lazy"></div><b>${f.title}</b><span class="muted small">${f.crew.find(c => c.name === p.name)?.role || p.role} · ${f.year}</span><span class="muted small">${f.kind}</span></a>`).join('');
const creditsHtml = p => p.credits.map((c, i) => `
  <details class="fold"${i ? '' : ' open'}>
    <summary><span><b>${c.role}</b><span class="muted small">${c.total} ${c.total === 1 ? 'title' : 'titles'}</span></span>${chev}</summary>
    <div class="rows">${c.list.map(x => {
      const f = film[x.key];
      const note = f ? `${f.kind} · ${f.dur}` : x.added ? (page === 'creator' ? 'Added by you' : 'Added on dein.art') : x.kind ? [x.kind, x.credited, x.eps && `${x.eps} episodes`, x.upcoming && 'in post-production'].filter(Boolean).join(' · ') : 'Not on dein.art yet';
      return `<div class="row credit"><div class="thumb">${f ? `<img src="${frame(f, f.at, 250)}" alt="" loading="lazy">` : x.img ? `<img src="${x.img}" alt="" loading="lazy">` : ''}</div><div class="info"><b>${x.title}</b><span class="muted small">${note}</span></div><span class="year">${x.year || (x.upcoming ? 'Upcoming' : '')}</span>${f ? `<a class="btn" href="${watchUrl(f)}">Play</a>` : x.id && addedTitles[x.id] ? `<a class="btn" href="title.html?id=${encodeURIComponent(x.id)}">Open</a>` : x.imdb ? `<a class="btn" href="https://www.imdb.com/title/${x.imdb}/" target="_blank" rel="noopener">IMDb ↗</a>` : ''}</div>`;
    }).join('')}${c.total > c.list.length ? `<div class="row credit"><div class="info"><span class="muted small">and ${c.total - c.list.length} more</span></div><a class="link" href="https://www.wikidata.org/wiki/${p.wd}" target="_blank" rel="noopener">Full list on Wikidata</a></div>` : ''}</div>
  </details>`).join('');
const totalCredits = p => p.credits.reduce((a, c) => a + c.total, 0);
$$('[data-known]').forEach(el => { el.innerHTML = knownHtml(subject); });
$$('[data-credits]').forEach(el => { el.innerHTML = creditsHtml(subject); });
$$('[data-credit-count]').forEach(el => { el.textContent = `${totalCredits(subject)} titles`; });

// One tile per NFT collection; it opens the collection's own page.
const collUrl = (a, c) => `collection.html?artist=${encodeURIComponent(a.name)}&c=${c.slug}`;
const tile = (c, cls = '') => c.tokens.length ? `<div class="thumb sq ${cls}"><img src="${c.tokens[0].img}" alt="" loading="lazy"></div>` : `<div class="thumb sq typo ${cls}"><span>${c.name}</span></div>`;
const collCard = (a, c) => `<a class="card" href="${collUrl(a, c)}">${tile(c)}<h3>${c.name}</h3><p>${[c.year, c.minted && `${c.minted.toLocaleString('en-US')} pieces`, c.own && c.chain, c.cc0 && 'CC0'].filter(Boolean).join(' · ')}</p></a>`;

// A profile: the same page for every artist, and for the signed-in account.
if (page === 'artist' || page === 'creator') {
  const a = subject, me = a.name === ME, chain = a.chain, mine = filmsOf(a);
  const set = (key, html) => $$(`[data-p="${key}"]`).forEach(el => { el.innerHTML = html; });
  const ext = (href, label) => `<a class="link" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  document.title = `${a.name} — dein.art`;
  set('avatar', avatar(a.name, 'lg').replace('/120px-', '/250px-'));
  set('name', a.name);
  set('acts', `<button class="btn follow" data-follow="${esc(a.name)}">Follow</button><button class="btn" data-share>Share</button>${me ? `<button class="btn primary" data-pay="support" data-title="Support ${esc(a.name)}" data-creator="${esc(a.name)}">♥ Support</button>` : ''}`);
  $$('[data-chain-only]').forEach(el => { el.hidden = !chain; });
  const myMerch = [...merch.filter(m => m.creator === a.name), ...(edits.merch || []).map(m => ({ ...m, creator: a.name, added: true }))];
  $$('[data-merch]').forEach(el => { el.innerHTML = myMerch.length ? myMerch.map(merchCard).join('') : '<p class="muted empty">No merch yet.</p>'; });
  $$('[data-has-credits]').forEach(el => { el.hidden = !a.credits.length; });
  set('creditnote', a.credits.length ? `Credits are added when a film is published and its crew is listed, so every cast and crew member builds a page like this one. These come from ${a.imdb && chain ? 'IMDb' : 'Wikidata'}.`
    : 'No credits yet. Credits are added when a work is published and the people who made it are listed.');
  const with_ = [...new Set(mine.flatMap(f => f.crew.map(c => c.name)))].filter(n => n !== a.name && who[n]).slice(0, 6);
  set('with', with_.map(n => cards.castp({ name: n, role: who[n].role })).join(''));
  $$('[data-p="withpanel"]').forEach(el => { el.hidden = !with_.length; });

  // a page opens on a picture of the work: a still from the person's best-known film
  if (!chain && mine.length && !$('.pbanner')) { const f = mine[0]; $('.profile').insertAdjacentHTML('beforebegin', `<a class="pbanner still" href="${watchUrl(f)}" style="background-image:url('${frame(f, f.at, 1280)}')" aria-label="${esc(f.title)}"><span>${esc(f.title)} · ${f.year}</span></a>`); }
  if (chain) {
    if (chain.film) $('[data-panel="videos"]').innerHTML = `<a class="card" href="${chain.film.page}" target="_blank" rel="noopener"><div class="thumb typo"><span>${chain.film.title}</span><span class="badge dur">On the artist's site ↗</span></div><div class="meta">${face(a.name)}<div><h3>${chain.film.title}</h3><p>${a.name} · plays on ${chain.film.page.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p></div></div></a>`;
    const pieces = chain.collections.reduce((n, c) => n + (c.minted || 0), 0), first = chain.collections.map(c => c.year).sort()[0] || '—';
    set('line', chain.line ? `${chain.line} · ${ensTag(chain.address)}` : `Artist · ${ensTag(chain.address)} · ${chain.collections.length} ${chain.collections.length === 1 ? 'collection' : 'collections'} · ${pieces.toLocaleString('en-US')} pieces counted on-chain`);
    if (chain.banner) $('.profile').insertAdjacentHTML('beforebegin', `<div class="pbanner" style="background-image:url('${chain.banner}')"></div>`);
    if (chain.listed === false && !edits.name) resolveEns(chain.address).then(n => { if (n) { set('name', esc(n)); document.title = `${n} — dein.art`; } });
    showNameEns();
    if (chain.bio) set('bio', esc(chain.bio)); else if (chain.listed === false) set('bio', 'A wallet page. Whoever holds this wallet can claim it and start publishing here.'); else
    set('bio', `Has released work on-chain since ${first}${chain.collections.length <= 3 ? ': ' + chain.collections.map(c => c.name).join(', ') : `, across ${chain.collections.length} collections`}. This page is built from public records${chain.site ? ' and the list of work on the artist\'s own site' : ''}.`);
    set('links', (chain.links || []).map(([l, u]) => ext(u, l)).join('') + ext(`https://etherscan.io/address/${chain.address}`, 'Wallet on Etherscan') + [chain.site, chain.website].filter(Boolean).map(u => ext(esc(u), esc(u.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')))).join(''));
    set('side', '<span class="pop" data-w="status"></span>');
    set('factstitle', 'On-chain record');
    set('facts', [['Wallet', ext(`https://etherscan.io/address/${chain.address}`, `${ensTag(chain.address)}`) + ' ' + copyBtn(chain.address)], ['ENS', chain.ens], ['Since', first !== '—' && first], ['Collections', chain.collections.length], ['Pieces counted', pieces && pieces.toLocaleString('en-US')]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  } else {
    const born = a.born ? `Born in ${a.born}${a.bornIn ? ' in ' + a.bornIn : ''}${a.died ? `, died in ${a.died}${a.diedIn ? ' in ' + a.diedIn : ''}` : ''}.` : '';
    const lead = `${a.desc && a.desc.length < 60 ? a.desc[0].toUpperCase() + a.desc.slice(1) + '. ' : ''}${born} On dein.art as ${a.role.toLowerCase()} of ${mine.slice(0, 3).map(f => `"${f.title}" (${f.year})`).join(', ')}.`;
    set('line', [a.role, ...a.occ.filter(o => o.toLowerCase() !== a.role.toLowerCase()).slice(0, 2).map(o => o[0].toUpperCase() + o.slice(1)), a.bornIn, years(a)].filter(Boolean).join(' · '));
    set('bio', me ? 'Stage magician and owner of the Théâtre Robert-Houdin in Paris, who began making films in 1896. He built one of the first film studios, at Montreuil, and made more than five hundred films, writing, designing, directing and acting in most of them.' : lead);
    set('links', [ext(`https://www.wikidata.org/wiki/${a.wd}`, 'Wikidata'), a.imdb && ext(`https://www.imdb.com/name/${a.imdb}/`, 'IMDb'), a.wiki && ext(`https://en.wikipedia.org/wiki/${encodeURIComponent(a.wiki.replace(/ /g, '_'))}`, 'Wikipedia')].filter(Boolean).join(''));
    set('side', me ? chartCard({ title: 'Your share of earnings', caption: 'last 7 months', total: '$63,790',
        data: [['May', 4120], ['Jun', 6380], ['Jul', 5240], ['Aug', 9810], ['Sep', 8460], ['Oct', 12900], ['Nov', 16880]].map(([label, value]) => ({ label, value, text: '$' + value.toLocaleString('en-US') })),
        note: 'Only you see this · example figures. Another $123,285 went to your cast and crew. <a class="link" href="dashboard.html">Open your dashboard</a>' })
      : '');
    set('factstitle', 'Personal details');
    set('facts', [['Born', a.born && `${a.born}${a.bornIn ? ' · ' + a.bornIn : ''}`], ['Died', a.died && `${a.died}${a.diedIn ? ' · ' + a.diedIn : ''}`], ['Worked as', a.occ.join(', ')]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  }
}

/* ---------- an NFT collection's own page ---------- */

if (page === 'collection' && !param('contract')) {   // a collection read live from its contract is drawn by chain.js
  const a = ONCHAIN.find(x => x.name === param('artist')) || ONCHAIN[0], c = a.collections.find(x => x.slug === param('c')) || a.collections[0];
  const set = (key, html) => $$(`[data-c="${key}"]`).forEach(el => { el.innerHTML = html; });
  const ext = (href, label, cls = 'link') => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  const scan = c.chain === 'Arbitrum' ? 'https://arbiscan.io' : c.chain === 'Base' ? 'https://basescan.org' : 'https://etherscan.io';
  const host = u => u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
  document.title = `${c.name} by ${a.name} — dein.art`;
  set('back', `<a class="muted small" href="${artistUrl(a.name)}#collections">← ${a.name}</a>`);
  set('cover', tile(c));
  set('name', c.name);
  set('by', `<a href="${artistUrl(a.name)}">${avatar(a.name)}</a><a class="who" href="${artistUrl(a.name)}"><b>${a.name}</b><span class="muted small">Artist · ${ensTag(a.address)}</span></a>`);
  set('about', c.about || `A collection by ${a.name}, minted on ${c.chain || 'a blockchain'} in ${c.year}.`);
  set('acts', [c.page && ext(c.page, `See it on ${host(c.page)} ↗`, 'btn primary'), c.market && ext(c.market, `${host(c.market)} ↗`, 'btn'), c.contract && ext(`${scan}/address/${c.contract}`, 'Contract ↗', 'btn')].filter(Boolean).join(''));
  set('facts', [['Year', c.year], ['Pieces', c.minted && `${c.minted.toLocaleString('en-US')} of ${c.max.toLocaleString('en-US')} minted`], ['Chain', c.chain], ['Contract', c.contract && ext(`${scan}/address/${c.contract}`, `<span class="mono">${short(c.contract)}</span>`) + ' ' + copyBtn(c.contract)],
    ['Licence', c.cc0 ? 'CC0' : 'Not stated'], ['Source', c.minted ? 'On-chain record, as indexed by Art Blocks' : `Listed on ${host(c.page || a.site || '')}`]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  if (c.own) set('facts', [['Created by', `${a.name} · ${ensTag(a.address)}`], ['Chain', c.chain], ['Source', 'Listed on the artist\'s OpenSea profile']].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  if (c.own) set('acts', ext(c.market, 'See the pieces on OpenSea ↗', 'btn primary'));
  set('pieces', c.own ? `<div class="box" style="margin-top:28px"><b>Made by ${a.name}</b><p>Shown here from its cover. Every piece in the collection is on OpenSea.</p></div>` : c.tokens.length ? `<div class="sec"><h2>Pieces</h2><p>${c.tokens.length} of ${c.minted.toLocaleString('en-US')} shown</p></div><div class="grid tokens">${c.tokens.map(t => `<a class="card" href="${t.live}" target="_blank" rel="noopener"><div class="thumb sq"><img src="${t.img}" alt="" loading="lazy"></div><p>#${t.n}</p></a>`).join('')}</div>`
    : `<div class="box" style="margin-top:28px"><b>No images here yet</b><p>Images are shown only for collections whose licence is confirmed as CC0. This one's licence is not stated, so the work stays on the artist's own pages${c.page ? `: ${ext(c.page, host(c.page))}` : ''}. When the artist claims this page, they decide what appears here.</p></div>`);
  const others = a.collections.filter(x => x !== c);
  set('more', others.length ? `<div class="sec"><h2>More by ${a.name}</h2><a href="${artistUrl(a.name)}#collections">All ${a.collections.length}</a></div><div class="grid shelf colls">${others.slice(0, 6).map(x => collCard(a, x)).join('')}</div>` : '');
}

// A page that goes by another name than its wallet's ENS name keeps the ENS name next to it.
function showNameEns() {
  const h = $('[data-p="name"]'), address = subject.chain && subject.chain.address; if (!h || !address) return;
  resolveEns(address).then(n => {
    $('.enschip', h)?.remove();
    if (n && h.textContent.trim().toLowerCase() !== n.toLowerCase()) h.insertAdjacentHTML('beforeend', ` <a class="enschip" href="https://app.ens.domains/${encodeURIComponent(n)}" target="_blank" rel="noopener" title="ENS name of ${address}">${esc(n)}</a>`);
  });
}

/* ---------- a wallet's page: what it shared and the credits it added, once the API answers ---------- */
if ((page === 'artist' || page === 'creator') && subject.chain) {
  const address = subject.chain.address;
  SHARED.then(() => {
    const mine = MARKET.filter(x => x.shared && x.owner === address); if (!mine.length) return;
    const panel = $('[data-panel="assets"]'); if (!panel) return;
    if (panel.querySelector('.empty')) panel.innerHTML = '';
    panel.insertAdjacentHTML('afterbegin', mine.map(cards.assets).join(''));
  });
  // films this wallet released, or is paid from
  RELEASES.then(list => {
    const mine = list.filter(f => f.owner === address || f.crew.some(c => c.wallet === address)); if (!mine.length) return;
    const panel = $('[data-panel="videos"]'); if (!panel) return;
    if (panel.querySelector('.empty')) panel.innerHTML = '';
    panel.insertAdjacentHTML('afterbegin', mine.map(cards.films).join('')); fillViews();
  });
  TITLES.then(list => {
    const mine = list.filter(t => t.owner === address); if (!mine.length) return;
    mine.forEach(t => { addedTitles[t.id] = t;
      if (subject.credits.some(c => c.list.some(x => x.id === t.id))) return;
      let g = subject.credits.find(x => x.role === t.role); if (!g) subject.credits.push(g = { role: t.role || 'Credit', total: 0, list: [] });
      g.list.unshift({ title: t.title, year: t.year, key: null, added: true, id: t.id, img: t.poster }); g.total++; });
    $$('[data-credits]').forEach(el => { el.innerHTML = creditsHtml(subject); });
    $$('[data-has-credits]').forEach(el => { el.hidden = false; });
  });
}

/* ---------- a profile's assets: one section per type; each asset opens its own page ---------- */

if (page === 'artist' || page === 'creator') {
  const mine = MARKET.filter(x => x.creator === subject.name && x.kind !== 'merch');
  const types = [...new Set(mine.map(x => x.shelf || x.sub))];
  if (types.length > 1) {
    const shape = { Posters: 'tall', Press: 'tall', Photographs: 'tall', Footage: 'wide' };
    const anchor = t => 'assets-' + slugify(t);
    const panel = $('[data-panel="assets"]');
    panel.classList.remove('grid');
    panel.innerHTML = `<div class="chips" style="margin-bottom:8px">${types.map(t => `<a class="chip" href="#${anchor(t)}">${t} <span class="muted">${mine.filter(x => (x.shelf || x.sub) === t).length}</span></a>`).join('')}</div>` +
      types.map(t => { const items = mine.filter(x => (x.shelf || x.sub) === t); return `
      <div class="sec" id="${anchor(t)}"><h2>${t}</h2><p>${items.length} ${items.length === 1 ? 'item' : 'items'}</p></div>
      <div class="grid shelf ${shape[t] || 'std'}">${items.map(i => `<a class="card" href="${itemUrl(i)}"><div class="thumb"><img src="${i.pic}" alt="" loading="lazy">${i.kind === 'video' ? `<span class="badge dur">${String(i.specs?.Length || '').split(' ')[0]}</span>` : ''}</div><h3>${i.title}</h3><p>${i.specs?.Year || 'Undated'} · ${priceTag(i)}</p></a>`).join('')}</div>`; }).join('');
  }
}

/* ---------- view counts: shared by everyone, kept by the site's small API (worker/index.js) ---------- */

const viewCount = n => n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : n >= 1e4 ? Math.round(n / 1e3) + 'K' : n.toLocaleString('en-US');
const showViews = (id, n) => $$(`[data-views="${id}"]`).forEach(el => { el.textContent = el.hasAttribute('data-views-lead') ? `${viewCount(n)} ${n === 1 ? 'view' : 'views'} · ` : ` · ${viewCount(n)} ${n === 1 ? 'view' : 'views'}`; });
async function fillViews() {
  const ids = [...new Set($$('[data-views]').filter(el => !el.textContent).map(el => el.dataset.views))];
  for (let i = 0; i < ids.length; i += 60) {
    try { const r = await fetch('/api/views?ids=' + ids.slice(i, i + 60).join(',')); if (!r.ok) return; Object.entries(await r.json()).forEach(([id, n]) => showViews(id, n)); } catch { return; }
  }
}
fillViews();
// a watch counts once per visit to the page, when the film starts playing
if (video && page === 'watch') {
  let last = 0, last5 = false;
  video.addEventListener('timeupdate', () => {
    if (Math.abs(video.currentTime - last) < 5) return; last = video.currentTime;
    progress[cur.key] = { t: Math.round(video.currentTime), at: Date.now(), of: Math.round(video.duration) || cur.secs }; try { localStorage.setItem('progress', JSON.stringify(progress)); } catch {}
    if (!last5) { last5 = true; FILMS.remember(cur); }
  });
  const was = progress[cur.key];
  if (was && was.t > 20 && was.t < cur.secs * .95) {
    const mmss = t => Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0');
    video.closest('.player').insertAdjacentHTML('beforeend', `<button class="resumechip" data-resume>▶ Carry on from ${mmss(was.t)}</button>`);
    document.addEventListener('click', e => { if (!e.target.closest('[data-resume]')) return; video.currentTime = was.t; video.play().catch(() => {}); });
    video.addEventListener('play', () => $('[data-resume]')?.remove(), { once: true });
  }
}
if (video) video.addEventListener('play', async () => {
  try { const r = await fetch('/api/views/' + cur.key, { method: 'POST' }); if (r.ok) showViews(cur.key, (await r.json()).views); } catch {}
}, { once: true });

// A still from a film is made by Wikimedia the first time anyone asks for it, and that first request can fail. Ask again, twice.
document.addEventListener('error', e => {
  const img = e.target;
  if (img.tagName !== 'IMG' || !/px-seek%3D/.test(img.src) || Number(img.dataset.tries) >= 2) return;
  img.dataset.tries = Number(img.dataset.tries || 0) + 1;
  setTimeout(() => { const src = img.src; img.src = ''; img.src = src; }, 2500 * img.dataset.tries);
}, true);

/* ---------- rows that slide: arrows, or drag with the mouse ---------- */

$$('[data-slider]').forEach(row => {
  row.classList.add('slider');
  row.insertAdjacentHTML('beforebegin', '<div class="slidenav"><button class="btn icon" data-slide="-1" aria-label="Scroll left">‹</button><button class="btn icon" data-slide="1" aria-label="Scroll right">›</button></div>');
  const nav = row.previousElementSibling;
  const sync = () => { const max = row.scrollWidth - row.clientWidth - 2; nav.children[0].disabled = row.scrollLeft <= 2; nav.children[1].disabled = row.scrollLeft >= max; nav.hidden = max <= 0; };
  nav.addEventListener('click', e => { const b = e.target.closest('[data-slide]'); if (b) row.scrollBy({ left: Number(b.dataset.slide) * row.clientWidth * .85, behavior: 'smooth' }); });
  row.addEventListener('scroll', sync, { passive: true }); new ResizeObserver(sync).observe(row); sync();   // also when a pop-up holding the row opens
  // dragging with the mouse; a drag does not count as a click on the card under it
  let down = null, moved = false;
  row.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; down = { x: e.clientX, left: row.scrollLeft }; moved = false; });
  addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x; if (Math.abs(dx) > 4) { moved = true; row.classList.add('dragging'); } row.scrollLeft = down.left - dx; });
  addEventListener('pointerup', () => { down = null; setTimeout(() => row.classList.remove('dragging'), 0); });
  row.addEventListener('click', e => { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; } }, true);
  row.addEventListener('dragstart', e => e.preventDefault());
});

initCharts(); initHeat();

/* ---------- a content category ---------- */

if (page === 'category') {
  const [slug, label] = CATEGORIES.find(c => c[0] === param('c')) || CATEGORIES[0];
  // what creators released comes first, then the hand-picked films, then the catalogue with the best known first
  const listAll = () => [...FILMS.releases.filter(f => categoryOf(f) === slug), ...CATALOG.films.filter(f => !f.owner && categoryOf(f) === slug)];
  let all = listAll();
  // In the library a kind goes by its library name; a kind that only creators fill keeps its own.
  const many = FILMS.counts[slug] ? LIBRARY_KINDS[slug] : label.replace(/y$/, 'ie').replace(/s$/, '') + 's';
  document.title = `${many} — dein.art`;
  $('[data-cat="title"]').textContent = many;
  $('[data-cat="chips"]').innerHTML = `<a class="chip" href="library.html">← Library</a>` + CATEGORIES.filter(([sl]) => FILMS.counts[sl] || sl === slug).map(([sl, l]) => `<a class="chip${sl === slug ? ' on' : ''}" href="category.html?c=${sl}">${FILMS.counts[sl] ? LIBRARY_KINDS[sl] : l}${FILMS.counts[sl] ? ` <small>${(FILMS.counts[sl] + CATALOG.films.filter(f => !f.source && categoryOf(f) === sl).length).toLocaleString('en-US')}</small>` : ''}</a>`).join('');
  $('[data-cat="chips"] .chip.on')?.scrollIntoView({ inline: 'center', block: 'nearest' });
  const grid = $('[data-cat="grid"]'), tools = $('[data-cat="tools"]');
  if (!all.length) grid.innerHTML = `<div class="box" style="grid-column:1/-1"><b>No ${many.toLowerCase()} here yet</b><p>This category is ready for the first one. <a class="link" href="release.html">Publish yours</a>.</p></div>`;
  else {
    // Thousands of films do not go on a page at once: sixty, then sixty more. The view is kept in the address, so it can be shared.
    const STEP = 60, fold = t => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const decades = [...new Set(all.map(f => f.year && Math.floor(f.year / 10) * 10).filter(Boolean))].sort();
    const state = { q: param('q') || '', sort: param('sort') || 'known', decade: Number(param('decade')) || 0, len: param('len') || '', shown: STEP };
    const SORTS = { known: ['Best known first', null], new: ['Newest first', (x, y) => (y.year || 0) - (x.year || 0)], old: ['Oldest first', (x, y) => (x.year || 9999) - (y.year || 9999)], az: ['A to Z', (x, y) => x.title.localeCompare(y.title)], long: ['Longest first', (x, y) => (y.secs || 0) - (x.secs || 0)], short: ['Shortest first', (x, y) => (x.secs || 1e9) - (y.secs || 1e9)] };
    const LENS = { '': ['Any length', () => true], s: ['Under 10 minutes', f => f.secs && f.secs < 600], m: ['10 to 40 minutes', f => f.secs >= 600 && f.secs < 2400], l: ['Over 40 minutes', f => f.secs >= 2400] };
    tools.hidden = false;
    tools.innerHTML = `<input class="field" type="search" data-cat-q placeholder="Find in ${many.toLowerCase()}: a title, a maker, a year" aria-label="Find in this category" value="${esc(state.q)}">
      <select class="field" data-cat-decade aria-label="Decade"><option value="0">Any year</option>${decades.map(d => `<option value="${d}"${d === state.decade ? ' selected' : ''}>${d}s</option>`).join('')}</select>
      <select class="field" data-cat-len aria-label="Length">${Object.entries(LENS).map(([k, [l]]) => `<option value="${k}"${k === state.len ? ' selected' : ''}>${l}</option>`).join('')}</select>
      <select class="field" data-cat-sort aria-label="Order">${Object.entries(SORTS).map(([k, [l]]) => `<option value="${k}"${k === state.sort ? ' selected' : ''}>${l}</option>`).join('')}</select>`;
    grid.insertAdjacentHTML('afterend', '<div class="more" data-cat-more hidden><button class="btn">Show more</button></div>');
    const moreBox = $('[data-cat-more]');
    const words = () => fold(state.q).split(/\s+/).filter(Boolean);
    const found = () => {
      const w = words(), len = (LENS[state.len] || LENS[''])[1];
      const list = all.filter(f => (!state.decade || (f.year >= state.decade && f.year < state.decade + 10)) && len(f) && (!w.length || (hay => w.every(x => hay.includes(x)))(fold(`${f.title} ${f.by.join(' ')} ${f.year} ${f.kind}`))));
      return SORTS[state.sort]?.[1] ? [...list].sort(SORTS[state.sort][1]) : list;
    };
    const draw = keep => {
      const list = found();
      if (!keep) state.shown = STEP;
      grid.innerHTML = list.slice(0, state.shown).map(cards.films).join('') || `<div class="box" style="grid-column:1/-1"><b>Nothing matches</b><p>Try fewer words, another decade or any length.</p></div>`;
      $('[data-cat="count"]').textContent = list.length === all.length ? `${all.length.toLocaleString('en-US')} to watch, free` : `${list.length.toLocaleString('en-US')} of ${all.length.toLocaleString('en-US')}`;
      moreBox.hidden = list.length <= state.shown; $('button', moreBox).textContent = `Show more (${(list.length - state.shown).toLocaleString('en-US')} left)`;
      const u = new URL(location.href); [['q', state.q], ['sort', state.sort === 'known' ? '' : state.sort], ['decade', state.decade || ''], ['len', state.len]].forEach(([k, v]) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k)));
      history.replaceState(null, '', u); fillViews();
    };
    let wait;
    tools.addEventListener('input', e => { if (e.target.matches('[data-cat-q]')) { state.q = e.target.value; clearTimeout(wait); wait = setTimeout(draw, 140); } });
    tools.addEventListener('change', e => {
      if (e.target.matches('[data-cat-sort]')) state.sort = e.target.value; else if (e.target.matches('[data-cat-decade]')) state.decade = Number(e.target.value); else if (e.target.matches('[data-cat-len]')) state.len = e.target.value; else return;
      draw();
    });
    $('button', moreBox).addEventListener('click', () => { state.shown += STEP; draw(true); });
    document.addEventListener('films-changed', () => { all = listAll(); draw(true); });
    draw();
  }
}

/* ---------- chips and tabs ---------- */

const chips = $$('.chip[data-kind]');   // only the chips that filter the cards on their page
const pickChip = chip => {
  chips.forEach(c => c.classList.toggle('on', c === chip));
  $$('.grid .card').forEach(card => { card.hidden = chip.dataset.kind !== 'all' && card.dataset.kind !== chip.dataset.kind; });
};
chips.forEach(chip => chip.addEventListener('click', () => pickChip(chip)));

$$('.tab').forEach(tab => tab.addEventListener('click', () => {
  $$('.tab').forEach(t => t.classList.toggle('on', t === tab));
  $$('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
}));
const kind = new URLSearchParams(location.search).get('kind'); // market.html?kind=Script opens that filter
if (kind) chips.find(c => c.dataset.kind === kind)?.click();

// A link to #something opens it: a profile tab (creator.html#merch), a folded section, or a pop-up (watch.html#crew).
const openHash = hash => {
  if (!/^#[\w-]+$/.test(hash)) return;
  $(`.tab[data-tab="${hash.slice(1)}"]`)?.click();
  const target = $(hash);
  if (target?.tagName === 'DETAILS') target.open = true;
  if (target?.tagName === 'DIALOG' && !target.open) target.showModal();
  markSide();
};
openHash(location.hash);
addEventListener('hashchange', () => openHash(location.hash));
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (a) { openHash(a.getAttribute('href')); if ($(a.getAttribute('href'))?.tagName === 'DIALOG') e.preventDefault(); } // a pop-up shouldn't move the page
  // pop-ups close from their Close button or a click outside them
  const box = e.target.closest('dialog');
  if (!box) return;
  const r = box.getBoundingClientRect(), outside = e.target === box && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom);
  if (e.target.closest('[data-close]') || outside) box.close();
});

/* ---------- live chat ---------- */

const msgs = $('.chat .msgs');
function addChat(name, text, tip) {
  if (!msgs) return;
  const row = document.createElement('div');
  if (tip) row.className = 'tip';
  row.innerHTML = '<b></b><span></span>';
  row.firstChild.textContent = name; row.lastChild.textContent = text;
  msgs.append(row); msgs.scrollTop = msgs.scrollHeight;
}
