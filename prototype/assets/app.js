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

const film = Object.fromEntries(CATALOG.films.map(f => [f.key, f]));
const who = CATALOG.people;
CATALOG.films.forEach(f => { f.creator = f.by[0]; });
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
const frame = (f, t = f.at, want = 500) => `${f.tb}${WIDTHS.filter(w => w <= Math.min(want, f.w || 500)).pop()}px-seek%3D${t}-${f.tn}`;
const small = pic => pic.replace('/500px-', '/120px-');
const watchUrl = f => 'watch.html?f=' + f.key;
const sources = f => (f.webm ? `<source src="${f.webm}" type="video/webm">` : '') + (f.mov ? `<source src="${f.mov}" type="video/quicktime">` : '');

// The film this page is about: the one in the address, or the featured one.
const cur = film[param('f')] || film[page === 'live' ? 'nosferatu' : 'trip-to-the-moon'];

const front = ['trip-to-the-moon', 'man-with-a-movie-camera', 'nosferatu', 'nanook-of-the-north', 'sherlock-jr', 'battleship-potemkin', 'cabinet-of-dr-caligari', 'great-train-robbery'];
const films = front.map(k => film[k]);

// Screenings: a film played for everyone at once, with chat.
const screening = (key, viewers) => ({ ...film[key], viewers });
const streams = [screening('nosferatu', '2.4K'), screening('man-with-a-movie-camera', '1.1K'), screening('impossible-voyage', '860'), screening('the-general', '540')];

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
      const it = { id, cat, sub, title, by: credit || 'Freesound', price: 0, lic: 'CC0', lib: true, kind: 'audio', pic: '', big: '', dur: clock(secs), audio: path,
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
      pic: sound ? '' : thumb(500), big: sound ? '' : film ? thumb(960 > w ? 500 : 960) : cat === 'Scripts & documents' ? thumb(w >= 1000 ? 960 : 500) : thumb(1280), dur: secs ? clock(secs) : '',
      video: film ? `${up}transcoded/${enc}/${file}.480p.vp9.webm` : undefined, audio: sound ? (ext === 'mp3' ? up + enc : `${up}transcoded/${enc}/${file}.mp3`) : undefined,
      files: [{ name, size, url: up + enc }], source: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(name.replace(/ /g, '_')),
      specs: { ...(secs ? { Length: clock(secs) } : {}), ...(w ? { Size: `${w.toLocaleString('en-US')} × ${h.toLocaleString('en-US')} px` } : {}), Format: ext.toUpperCase() },
      desc: `${title}. ${cc0 ? 'Released under CC0' : 'In the public domain'}, free to use in any project.` };
    it.creator = it.by; seen.add(id); list.push(it); added.push(it);
  }));
  return added;
}
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
  CATALOG.films.forEach(f => f.scenes.slice(0, 2).forEach((sc, i) => { if (sc[1]) add(stillOf(f, i)); }));
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
const priceTag = it => it.price ? `<span class="price">$${it.price}</span>` : '<span class="price free">Free</span>';

const campaigns = [
  { title: 'The Conquest of the Pole', creator: ME, raised: 64200, goal: 90000, days: 18, pic: frame(film['conquest-of-the-pole']) },
  { title: 'The Merry Frolics of Satan: colouring the print', creator: ME, raised: 8400, goal: 15000, days: 31, pic: frame(film['merry-frolics-of-satan']) },
];

// Shown when someone presses "Load more"; after these run out the lists repeat.
const more = {
  films: CATALOG.films.filter(f => !front.includes(f.key)),
  live: [screening('sherlock-jr', '310'), screening('battleship-potemkin', '190'), screening('kino-eye', '420'), screening('gertie-the-dinosaur', '95')],
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
const artistUrl = name => name === ME ? 'creator.html' : who[name] ? 'artist.html?name=' + encodeURIComponent(name) : '#';
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
const categoryOf = f => f.kind === 'Documentary' ? 'documentary' : f.kind === 'Animation' ? 'animation' : f.kind === 'Short film' || f.secs < 2400 ? 'short-film' : 'feature-film';
// Sidebar: every place on the site, one click away. [key, label, href, icon, shown in the narrow rail]
const side = {
  main: [['home', 'Home', 'index.html', 'home', 1], ['trending', 'Trending', 'trending.html', 'trend', 1], ['live', 'Live', 'live.html', 'live', 1], ['market', 'Marketplace', 'market.html', 'market', 1], ['studios', 'Studios', 'studios.html', 'film', 1]],
  you: [['creator', 'Your page', 'creator.html', 'user', 1], ['creator#credits', 'Credits', 'creator.html#credits', 'list'], ['creator#merch', 'Merch', 'creator.html#merch', 'merch'],
        ['creator#funding', 'Funding', 'creator.html#funding', 'fund'], ['create', 'Create', 'upload.html', 'upload', 1]],
  explore: CATEGORIES.map(([slug, label]) => ['cat-' + slug, label, 'category.html?c=' + slug, 'film']),
};
const sideLink = ([key, label, href, ic, rail]) => `<a class="sl${rail ? ' rail' : ''}" data-key="${key}" href="${href}">${icons[ic]}<span>${label}</span></a>`;
document.body.insertAdjacentHTML('afterbegin', `
<header class="top"><div class="wrap">
  <button class="btn icon bare" id="menu" aria-label="Open or close the sidebar">${icons.menu}</button>
  <a class="logo" href="index.html"><span class="de">de</span><span class="in">in</span><i>.</i><b>art</b></a>
  <form class="search" onsubmit="return false"><input placeholder="Search films, footage, music" aria-label="Search"></form>
  <a class="btn primary" href="upload.html">Create</a>
  <button class="btn icon" id="theme" aria-label="Switch between light and dark mode" title="Light / dark">
    <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
    <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  </button>
  <span data-account><a href="creator.html" aria-label="Your profile">${avatar(ME)}</a></span>
</div></header>
<aside class="sidebar" aria-label="Site navigation">
  ${side.main.map(sideLink).join('')}
  <hr><h4>You</h4>
  ${side.you.map(sideLink).join('')}
  <hr><h4>Following</h4>
  ${['Osman Burak Gülveren', 'F. W. Murnau', 'XCOPY', 'Buster Keaton'].filter(n => who[n]).map(n => `<a class="sl" href="${artistUrl(n)}">${avatar(n, 'xxs')}<span>${n}</span></a>`).join('')}
  <hr><h4>Categories</h4>
  ${side.explore.map(sideLink).join('')}
  <hr><p class="side-foot">Own your narrative.</p>
</aside>
<div class="scrim"></div>`);

const root = document.documentElement;
// the tab icon is the dot too
document.head.insertAdjacentHTML('beforeend', `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#0e0f13"/><circle cx="16" cy="16" r="7" fill="#f5a623"/></svg>')}">`);
const markSide = () => {
  const key = page + (page === 'creator' && $(`.sl[data-key="creator${location.hash}"]`) ? location.hash : '');
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
  <span class="muted small">Blockchain-based · Watch · Live · Marketplace · Shared revenue</span>
  <p class="demo-note muted small">This is a prototype. The films, music and images are real public-domain and CC0 works from <a class="link" href="https://commons.wikimedia.org" target="_blank" rel="noopener">Wikimedia Commons</a>, with credits from <a class="link" href="https://www.wikidata.org" target="_blank" rel="noopener">Wikidata</a>, standing in for what creators would publish. Public-domain works are free. Counts, earnings, merch and campaigns are examples, and nothing is charged.</p>
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
const cards = {
  films: f => `<a class="card" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div class="meta">${face(f.creator)}<div><h3>${f.title}</h3><p>${byline(f)} · ${f.year}<span data-views="${f.key}"></span></p></div></div></a>`,
  next: f => `<a class="next" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f, f.at, 330)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div><h3>${f.title}</h3><p class="muted small">${byline(f)}<br>${f.year} · ${f.kind}<span data-views="${f.key}"></span></p></div></a>`,
  live: s => `<a class="card" href="live.html?f=${s.key}"><div class="thumb"><img src="${frame(s, s.scenes[1][0])}" alt="" loading="lazy"><span class="badge live">LIVE</span><span class="badge dur">${s.viewers} watching</span></div><div class="meta">${face(s.creator)}<div><h3>Now screening: ${s.title}</h3><p>${byline(s)} · ${s.year}</p></div></div></a>`,
  assets: a => `<a class="card" data-kind="${a.cat}" href="${itemUrl(a)}"><div class="thumb${a.kind === 'merch' ? ' merchthumb' : a.pic ? '' : ' blank'}${a.dark ? ' darkbg' : ''}">${a.kind === 'merch' ? mockup(a) : a.pic ? `<img src="${a.pic}" alt="" loading="lazy">` : `<span class="soundwave" aria-hidden="true">${'<i></i>'.repeat(18)}</span>`}<span class="badge kind">${a.sub === 'Packs' ? 'Sound pack' : a.cat === 'Photos & images' ? a.sub : a.cat === 'Merch' ? PRODUCTS[a.type] || 'Merch' : a.cat}</span>${a.audio ? `<span class="badge dur listen" data-audio="${a.audio}">▶ ${a.specs?.Length || 'Listen'}</span>` : a.specs?.Length ? `<span class="badge dur">${String(a.specs.Length).split(' ')[0].replace(',', '')}</span>` : ''}</div><h3>${a.title}</h3><p>${a.by} · ${priceTag(a)}${a.film && film[a.film] ? ` · from ${film[a.film].title}` : ''}</p></a>`,
  merch: m => merchCard(m),
  trending: f => `<a class="card" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f)}" alt="" loading="lazy"><span class="badge rank">${f.rank}</span><span class="badge dur">${f.dur}</span></div><div class="meta">${face(f.creator)}<div><h3>${f.title}</h3><p>${byline(f)} · <span class="up">▲ ${f.up}%</span> this week</p></div></div></a>`,
  rankrow: f => `<a class="rankrow" href="${watchUrl(f)}"><span class="num">${f.rank}</span><div class="thumb"><img src="${frame(f, f.at, 330)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div class="info"><h3>${f.title}</h3><p class="muted small">${byline(f)} · ${f.year} · ${f.kind}<span data-views="${f.key}"></span></p></div><span class="up">▲ ${f.up}%</span></a>`,
  castp: a => `<a class="castp" href="${artistUrl(a.name)}">${person(a)}<span><b>${a.name}</b><span class="muted small">${a.role}</span></span></a>`,
  artists: a => `<a class="rankrow" href="${artistUrl(a.name)}"><span class="num">${a.rank}</span>${person(a)}<div class="info"><h3>${a.name}</h3><p class="muted small">${a.role} · known for ${a.known}</p></div><span class="up">▲ ${a.up}%</span></a>`,
  channels: c => `<div class="channel"><span class="clogo" style="background:${c.tone}">${initials(c.name)}</span><a class="info" href="${c.href}"><b>${c.name}</b><span class="muted small">${c.about}</span></a><button class="btn follow">Follow</button></div>`,
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
const related = [...CATALOG.films.filter(f => f !== cur && f.by.some(n => cur.by.includes(n))), ...CATALOG.films.filter(f => f !== cur && f.kind === cur.kind && !f.by.some(n => cur.by.includes(n)))].slice(0, 12);
// What is rising this week: films, the people behind them, and the companies that made them.
const trending = ['nosferatu', 'sherlock-jr', 'man-with-a-movie-camera', 'trip-to-the-moon', 'the-general', 'cabinet-of-dr-caligari', 'impossible-voyage', 'nanook-of-the-north', 'within-our-gates', 'suspense']
  .map((k, i) => ({ ...film[k], rank: i + 1, up: [212, 148, 96, 81, 77, 64, 52, 40, 33, 21][i] }));
const artists = [['Osman Burak Gülveren', 88], ['Max Schreck', 64], ['XCOPY', 58], ['Buster Keaton', 51], ['Jack Butcher', 47], ['Yelizaveta Ignatevna Svilova', 43], ['F. W. Murnau', 38], ['Rosenlykke', 34], ['Lois Weber', 31], ['Dziga Vertov', 27], ['Han x Nicolas Daniel', 24], ['Oscar Micheaux', 22], ['Robert J. Flaherty', 15]]
  .filter(([n]) => who[n]).map(([name, up], i) => ({ name, up, role: who[name].role, known: who[name].chain ? (who[name].credits[0]?.list[0]?.title || who[name].chain.collections.find(c => c.cc0)?.name || who[name].chain.collections[0]?.name) : film[who[name].films[0]].title, rank: i + 1 }));
const channels = ['Star Film Company', 'Prana Film', 'Edison Studios', 'All-Ukrainian Photo-Cinema Administration', 'Metro Pictures', 'Hal Roach Studios']
  .map(n => CATALOG.companies.find(c => c.name === n)).filter(Boolean)
  .map(c => ({ name: c.name, tone: tone(c.name), href: (() => { const st = typeof STUDIOS !== 'undefined' && STUDIOS.find(x => x.company === c.name); return st ? 'studio.html?s=' + st.slug : watchUrl(film[c.films[0]]); })(),
               about: `${c.films.length} ${c.films.length === 1 ? 'film' : 'films'} here · founded ${c.founded}${c.place ? ', ' + c.place : ''}` }));
const lists = { films, live: streams, assets, merch, campaigns, related, trending, artists, channels };
$$('[data-list]').forEach(el => {
  const names = el.dataset.list.split(' ');
  // a profile shows everything by that person, not just the front page's pick
  const by = el.dataset.by === '@subject' ? subject.name : el.dataset.by;
  let items = names.flatMap(name => (by ? [...lists[name], ...(more[name] || [])] : lists[name]).map(item => ({ item, name })));
  // on a profile: what this person made, and the films they are credited on
  if (by) items = items.filter(x => x.item.creator === by || x.item.crew?.some(c => c.name === by));
  // someone with no assets of their own still has stills from the films they worked on
  if (by && names[0] === 'assets') items = items.filter(x => x.item.kind !== 'merch');
  if (by && names[0] === 'assets' && !items.length) items = filmsOf(who[by]).flatMap(f => f.scenes.slice(0, 2).map((_, i) => ({ item: stillOf(f, i), name: 'assets' }))).slice(0, 8);
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

// Music in the marketplace can be listened to before getting it.
const audio = new Audio();
let playing;
const stopAudio = () => { audio.pause(); if (playing) playing.textContent = playing.dataset.label; playing = null; };
audio.addEventListener('ended', stopAudio);
document.addEventListener('click', e => {
  const b = e.target.closest('[data-audio]');
  if (!b) return;
  e.stopPropagation(); e.preventDefault();
  if (playing === b) return stopAudio();
  stopAudio();
  b.dataset.label = b.textContent; b.textContent = '❚❚ Playing';
  audio.src = b.dataset.audio; audio.play(); playing = b;
}, true);

/* ---------- cast and crew split ---------- */

// A person as a large portrait card; the whole card opens their page.
const personCard = (name, role, pct) => {
  const pic = who[name]?.pic ? who[name].pic.replace('/120px-', '/500px-') : '';
  return `<a class="crewcard" href="${artistUrl(name)}" aria-label="${esc(name)}, ${esc(role)}">
    <span class="cc-media">${pic ? `<img src="${pic}" alt="" loading="lazy">` : `<span class="crewinit" style="--t:${tone(name)}">${initials(name)}</span>`}
      <span class="crewname"><b>${esc(name)}</b><span>${esc(role)}</span></span>
      ${pct ? `<span class="crewpct">${pct}%</span>` : ''}</span>
    <span class="notch"><i>↗</i></span>
  </a>`;
};
$$('[data-crew]').forEach(el => {
  el.innerHTML = `
    <div class="crewtop"><h2>Cast and crew</h2><button class="btn icon crewclose" data-close aria-label="Close">✕</button></div>
    <div class="crewcol"><div class="grid crewcards" data-slider>${crew.map(c => personCard(c.name, c.role, c.pct)).join('')}</div></div>`;
});

/* ---------- pages about one film: watch and live ---------- */

$$('[data-cast]').forEach(el => {
  el.innerHTML = `<a class="btn dark" href="#crew">All cast &amp; crew</a>` + crew.map(c => `<a class="castp" href="${artistUrl(c.name)}">${mug(c)}<span><b>${c.name}</b><span class="muted small">${c.role}</span></span></a>`).join('');
});

const fill = (key, html) => $$(`[data-f="${key}"]`).forEach(el => { el.innerHTML = html; });
const video = $('video[data-f-video]');
if (video) {
  const live = page === 'live';
  document.title = `${cur.title} — dein.art`;
  video.poster = frame(cur, live ? cur.scenes[1][0] : cur.at, 1280);
  video.innerHTML = sources(cur);
  $('.stage .glow').src = frame(cur, live ? cur.scenes[1][0] : cur.at, 330);
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
    if (e.target.closest('input, textarea, select')) return;
    if (e.key === 'c' || e.key === 'C') setMode(root.dataset.cinema === 'on' ? 'normal' : 'cinema');
    if (e.key === 'Escape' && root.dataset.cinema === 'on' && !$('dialog[open]')) setMode('normal');
  });
  setMode((() => { try { return localStorage.getItem('viewmode'); } catch { return null; } })() === 'cinema' ? 'cinema' : 'normal', false);
  const play = $('.player .play');
  if (play) {
    play.addEventListener('click', () => video.play());
    video.addEventListener('play', () => { play.hidden = true; });
  }
  const lead = cur.creator, p = who[lead];
  fill('title', live ? `Now screening: ${cur.title}` : cur.title);
  fill('proof', `<span class="muted small">On-chain record · demo</span>
    <a class="link" href="${cur.page}" target="_blank" rel="noopener" title="Where the film file comes from">${cur.lic} · Wikimedia Commons</a>
    <a class="link" href="https://www.wikidata.org/wiki/${cur.wd}" target="_blank" rel="noopener" title="Title, credits and dates">Wikidata</a>
    ${cur.imdb ? `<a class="link" href="https://www.imdb.com/title/${cur.imdb}/" target="_blank" rel="noopener">IMDb</a>` : ''}`);
  fill('byline', `<a href="${artistUrl(lead)}">${avatar(lead)}</a>
    <a class="who" href="${artistUrl(lead)}"><b>${byline(cur)}</b><span class="muted small">${live ? `${streams.concat(more.live).find(s => s.key === cur.key)?.viewers || '310'} watching · started 12 minutes ago` : `${p.role}${years(p) ? ' · ' + years(p) : ''}`}</span></a>
    <button class="btn follow">Follow</button>
    ${live ? '' : '<button class="btn">Share</button>'}
    <button class="btn primary" data-pay="${live ? 'tip' : 'support'}" data-split>♥ ${live ? 'Tip' : 'Support'}</button>`);
  fill('about', live
    ? `<p>${cur.blurb} Everyone watching sees the same moment at the same time. Tips are shared across the cast and crew, the same way everything else a film earns is.</p>`
    : `<b><span data-views="${cur.key}" data-views-lead></span>${[cur.year, cur.kind, cur.country[0]].filter(Boolean).join(' · ')}${cur.company[0] ? ' · ' + ((st => st ? `<a href="studio.html?s=${st.slug}">${st.name}</a>` : cur.company[0])(typeof STUDIOS !== 'undefined' && STUDIOS.find(x => x.company === cur.company[0]))) : ''}</b><p>${cur.blurb} Free to watch. Whatever it earns is shared across the people who made it.</p>`);
  fill('related', related.every(f => f.by.some(n => cur.by.includes(n))) ? `More from ${byline(cur)}` : 'More to watch');

  // Moments of the film that viewers can collect, marked on the timeline. A click jumps the film there.
  const marks = $('[data-marks]'), sceneBox = $('[data-scene]');
  if (marks) {
    const scenes = cur.scenes.filter(s => s[1]).map(([t, name]) => ({ t, name }));
    sceneBox.addEventListener('click', e => { const b = e.target.closest('[data-from]'); if (b) { video.currentTime = Number(b.dataset.from); video.play(); } });
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
function clock(s) { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(Math.floor(s % 60)).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; }

const reviews = $('[data-reviews]');
if (reviews) {
  const review = (name, text) => {
    const row = document.createElement('div');
    row.className = 'review';
    row.innerHTML = avatar(ME) + '<div><b></b><p></p></div>';
    $('b', row).textContent = name; $('p', row).textContent = text;
    return row;
  };
  $('.review-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('.review-form input');
    if (input.value.trim()) { reviews.prepend(review('You', input.value.trim())); $('[data-noreviews]')?.remove(); }
    input.value = '';
  });
}

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
      const note = f ? `${f.kind} · ${f.dur}` : x.added ? 'Added by you' : x.kind ? [x.kind, x.credited, x.eps && `${x.eps} episodes`, x.upcoming && 'in post-production'].filter(Boolean).join(' · ') : 'Not on dein.art yet';
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
  const a = subject, me = a.name === ME, chain = a.chain, mine = filmsOf(a), ranked = artists.find(x => x.name === a.name);
  const set = (key, html) => $$(`[data-p="${key}"]`).forEach(el => { el.innerHTML = html; });
  const ext = (href, label) => `<a class="link" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  document.title = `${a.name} — dein.art`;
  set('avatar', avatar(a.name, 'lg').replace('/120px-', '/250px-'));
  set('name', a.name);
  set('acts', `<button class="btn follow">Follow</button><button class="btn">Share</button>${me ? `<button class="btn primary" data-pay="support" data-title="Support ${esc(a.name)}" data-creator="${esc(a.name)}">♥ Support</button>` : ''}`);
  $$('[data-chain-only]').forEach(el => { el.hidden = !chain; });
  const myMerch = [...merch.filter(m => m.creator === a.name), ...(edits.merch || []).map(m => ({ ...m, creator: a.name, added: true }))];
  $$('[data-merch]').forEach(el => { el.innerHTML = myMerch.length ? myMerch.map(merchCard).join('') : '<p class="muted empty">No merch yet.</p>'; });
  $$('[data-has-credits]').forEach(el => { el.hidden = !a.credits.length; });
  set('creditnote', a.credits.length ? `Credits are added when a film is published and its crew is listed, so every cast and crew member builds a page like this one. These come from ${a.imdb && chain ? 'IMDb' : 'Wikidata'}.`
    : 'No credits yet. Credits are added when a work is published and the people who made it are listed.');
  const with_ = [...new Set(mine.flatMap(f => f.crew.map(c => c.name)))].filter(n => n !== a.name && who[n]).slice(0, 6);
  set('with', with_.map(n => cards.castp({ name: n, role: who[n].role })).join(''));
  $$('[data-p="withpanel"]').forEach(el => { el.hidden = !with_.length; });

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
        note: 'Only you see this · example figures. Another $123,285 went to your cast and crew.' })
      : ranked ? `<a class="pop" href="trending.html#artists"><span class="muted small">Trending</span><b>#${ranked.rank}</b><span class="up">▲ ${ranked.up}%</span></a>` : '');
    set('factstitle', 'Personal details');
    set('facts', [['Born', a.born && `${a.born}${a.bornIn ? ' · ' + a.bornIn : ''}`], ['Died', a.died && `${a.died}${a.diedIn ? ' · ' + a.diedIn : ''}`], ['Worked as', a.occ.join(', ')]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  }
}

/* ---------- an NFT collection's own page ---------- */

if (page === 'collection') {
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

initCharts(); initHeat();

/* ---------- a content category ---------- */

if (page === 'category') {
  const [slug, label] = CATEGORIES.find(c => c[0] === param('c')) || CATEGORIES[0];
  const list = CATALOG.films.filter(f => categoryOf(f) === slug);
  document.title = `${label} — dein.art`;
  const many = label.replace(/y$/, 'ie').replace(/s$/, '') + 's';
  $('[data-cat="title"]').textContent = many;
  $('[data-cat="count"]').textContent = list.length ? `${list.length} to watch, free` : '';
  $('[data-cat="chips"]').innerHTML = CATEGORIES.map(([sl, l]) => `<a class="chip${sl === slug ? ' on' : ''}" href="category.html?c=${sl}">${l}</a>`).join('');
  $('[data-cat="grid"]').innerHTML = list.map(cards.films).join('') || `<div class="box" style="grid-column:1/-1"><b>No ${many.toLowerCase()} here yet</b><p>This category is ready for the first one. <a class="link" href="upload.html">Publish yours</a>.</p></div>`;
  $$('.sl').forEach(l => l.classList.toggle('on', l.dataset.key === 'cat-' + slug));
  fillViews();
}

/* ---------- chips and tabs ---------- */

const chips = $$('.chip');
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
if (msgs) {
  [['mika', 'that shadow on the staircase'], ['arjun_r', 'is this the tinted print?'], ['leyla_s', 'tipped $25.00', true], ['tomas', 'no sound and I still jumped'],
   ['kerem', 'first time watching this one'], ['sofia.m', 'collected the ship scene yesterday'], ['deniz', 'a hundred years old and it still works']].forEach(m => addChat(...m));
  $('.chat form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('.chat input');
    if (input.value.trim()) addChat('You', input.value.trim());
    input.value = '';
  });
}

/* ---------- create flow ---------- */

const uploadZone = $('[data-upload]');
if (uploadZone) fileUpload(uploadZone, { onAll: files => {
  const next = $('[data-upload-next]'); next.disabled = false;
  const film = files.find(f => f.type.startsWith('video')) || files[0];
  const line = $('[data-step="2"] .muted.small'); if (line) line.textContent = `${film.name} · ${fileSize(film.size)} · uploaded`;
} });

const steps = $$('[data-step]');
if (steps.length) {
  const show = n => {
    steps.forEach(s => { s.hidden = Number(s.dataset.step) !== n; });
    $$('.steps').forEach(bar => $$('span', bar).forEach((s, i) => s.classList.toggle('on', i < n)));
    window.scrollTo(0, 0);
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b && !b.disabled) show(Number(b.dataset.go)); });

  // Step 3: who shares the earnings
  const shares = $('#shares'), total = $('#total'), next = $('#toEarn');
  const shareRow = (c = { name: '', role: '', pct: 0 }) => `<div class="share"><input class="field" value="${c.name}" placeholder="Name or email" aria-label="Name"><input class="field" value="${c.role}" placeholder="Role" aria-label="Role"><input class="field" type="number" min="0" max="100" value="${c.pct}" aria-label="Share in percent"></div>`;
  const sumShares = () => {
    const sum = $$('input[type=number]', shares).reduce((a, i) => a + Number(i.value), 0);
    total.textContent = sum === 100 ? '100% — all set' : `${sum}% — must add up to 100%`;
    total.className = sum === 100 ? 'good' : 'bad';
    next.disabled = sum !== 100;
  };
  shares.innerHTML = crew.map(shareRow).join('');
  shares.addEventListener('input', sumShares);
  $('#addPerson').addEventListener('click', () => { shares.insertAdjacentHTML('beforeend', shareRow()); sumShares(); });
  sumShares();

  // Step 4: what else to share
  $$('.sell').forEach(row => {
    const input = $('input[type=number]', row), check = $('input[type=checkbox]', row), get = $('.get', row), cost = Number(row.dataset.cost || 0);
    const update = () => {
      const net = Number(input.value) - cost - FEE;
      input.disabled = !check.checked;
      get.textContent = !check.checked ? 'Not shared' : net > 0 ? 'Crew gets ' + money(net) : 'Amount too low';
    };
    input.addEventListener('input', update); check.addEventListener('change', update); update();
  });
}
