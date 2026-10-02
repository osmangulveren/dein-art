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
ONCHAIN.forEach(a => { who[a.name] = { name: a.name, role: 'Artist', pic: a.collections.flatMap(c => c.tokens)[1]?.img, films: [], credits: [], occ: [], chain: a }; });

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

const stillOf = (f, i) => ({ title: `${f.title}: ${f.scenes[i][1]}`, kind: 'Image', creator: f.creator, pic: frame(f, f.scenes[i][0]), lic: f.lic, page: f.page });
const assets = [
  ...CATALOG.footage.map(a => ({ ...a, kind: 'Footage', creator: a.by, pic: frame(a, Math.round(a.secs * .3)) })),
  ...CATALOG.music.map(a => ({ ...a, kind: 'Music', creator: a.by, sub: a.perf })),
  ...CATALOG.images.map(a => ({ ...a, kind: 'Image', creator: a.by, sub: a.year })),
  stillOf(film['trip-to-the-moon'], 2), stillOf(film['impossible-voyage'], 2), stillOf(film['impossible-voyage'], 3),
  ...ONCHAIN.flatMap(a => a.collections.filter(c => c.tokens.length).flatMap(c => c.tokens.slice(2, 4).map(t => ({ title: `${c.name} #${t.n}`, kind: 'Image', creator: a.name, sub: c.date.slice(0, 4), pic: t.img, lic: 'CC0', page: t.live })))),
];
// mix the kinds so the first row of the marketplace shows all three
const mixed = [0, 5, 13, 1, 6, 14, 2, 7].map(i => assets[i]);
assets.sort((a, b) => (mixed.indexOf(a) + 1 || 99) - (mixed.indexOf(b) + 1 || 99));

const merchArt = {
  tee: '<path d="M35 12 10 26l9 18 11-5v49h40V39l11 5 9-18-25-14c-2 8-8 12-15 12s-13-4-15-12z"/>',
  poster: '<rect x="24" y="10" width="52" height="78" rx="3"/><rect x="31" y="18" width="38" height="40" fill="rgba(255,255,255,.4)"/><rect x="31" y="64" width="26" height="4" fill="rgba(255,255,255,.65)"/><rect x="31" y="72" width="18" height="4" fill="rgba(255,255,255,.45)"/>',
  tote: '<path d="M26 38h48l4 50H22z"/><path d="M38 38V26a12 12 0 0 1 24 0v12" fill="none" stroke="currentColor" stroke-width="5"/>',
  cap: '<path d="M18 62a32 32 0 0 1 64 0z"/><path d="M50 62h42c0 6-10 9-22 9s-20-3-20-9z" opacity=".65"/>',
  vinyl: '<circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="13" fill="rgba(255,255,255,.55)"/><circle cx="50" cy="50" r="2.5" fill="#fff"/>',
};
const merch = [
  { title: 'A Trip to the Moon tee', creator: ME, price: 28, art: 'tee', bg: '#efedff', ink: '#5b4bff' },
  { title: 'A Trip to the Moon poster, 1902 reprint', creator: ME, price: 35, art: 'poster', bg: '#fff1e0', ink: '#e0812a' },
  { title: 'Star Film tote bag', creator: ME, price: 18, art: 'tote', bg: '#e6f4ee', ink: '#0d8a4f' },
  { title: 'The Impossible Voyage cap', creator: ME, price: 22, art: 'cap', bg: '#e8f1ff', ink: '#2f6fed' },
].map(m => ({ ...m, kind: 'Merch' }));

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

// Sidebar: every place on the site, one click away. [key, label, href, icon, shown in the narrow rail]
const side = {
  main: [['home', 'Home', 'index.html', 'home', 1], ['trending', 'Trending', 'trending.html', 'trend', 1], ['live', 'Live', 'live.html', 'live', 1], ['market', 'Marketplace', 'market.html', 'market', 1]],
  you: [['creator', 'Your page', 'creator.html', 'user', 1], ['creator#credits', 'Credits', 'creator.html#credits', 'list'], ['creator#merch', 'Merch', 'creator.html#merch', 'merch'],
        ['creator#funding', 'Funding', 'creator.html#funding', 'fund'], ['create', 'Create', 'upload.html', 'upload', 1]],
  explore: [['', 'Documentaries', 'watch.html?f=man-with-a-movie-camera', 'film'], ['', 'Short films', 'watch.html?f=great-train-robbery', 'film'], ['', 'Animation', 'watch.html?f=gertie-the-dinosaur', 'film'],
            ['', 'Footage', 'market.html?kind=Footage', 'market'], ['', 'Music', 'market.html?kind=Music', 'market'], ['', 'Images', 'market.html?kind=Image', 'market']],
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
  <a href="creator.html" aria-label="Your profile">${avatar(ME)}</a>
</div></header>
<aside class="sidebar" aria-label="Site navigation">
  ${side.main.map(sideLink).join('')}
  <hr><h4>You</h4>
  ${side.you.map(sideLink).join('')}
  <hr><h4>Following</h4>
  ${['F. W. Murnau', 'XCOPY', 'Buster Keaton', 'Jack Butcher'].filter(n => who[n]).map(n => `<a class="sl" href="${artistUrl(n)}">${avatar(n, 'xxs')}<span>${n}</span></a>`).join('')}
  <hr><h4>Explore</h4>
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
  $('.amounts', dialog).hidden = !mode.pick;
  $('.confirm', dialog).textContent = mode.confirm;
  $('.src', dialog).textContent = 'Prototype: nothing is charged.';
  $$('.amounts .pick', dialog).forEach(p => p.classList.toggle('on', p.dataset.amount === '10'));
  $('.form', dialog).hidden = false; $('.thanks', dialog).hidden = true;
  drawSum();
  dialog.showModal();
});
$$('.amounts .pick', dialog).forEach(p => p.addEventListener('click', () => {
  $$('.amounts .pick', dialog).forEach(x => x.classList.toggle('on', x === p));
  order.amount = Number(p.dataset.amount); drawSum();
}));
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
  films: f => `<a class="card" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div class="meta">${face(f.creator)}<div><h3>${f.title}</h3><p>${byline(f)} · ${f.year}</p></div></div></a>`,
  next: f => `<a class="next" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f, f.at, 330)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div><h3>${f.title}</h3><p class="muted small">${byline(f)}<br>${f.year} · ${f.kind}</p></div></a>`,
  live: s => `<a class="card" href="live.html?f=${s.key}"><div class="thumb"><img src="${frame(s, s.scenes[1][0])}" alt="" loading="lazy"><span class="badge live">LIVE</span><span class="badge dur">${s.viewers} watching</span></div><div class="meta">${face(s.creator)}<div><h3>Now screening: ${s.title}</h3><p>${byline(s)} · ${s.year}</p></div></div></a>`,
  assets: a => `<a class="card" data-kind="${a.kind}" href="${a.page}" target="_blank" rel="noopener" title="Free: opens the original"><div class="thumb${a.pic ? '' : ' blank'}">${a.pic ? `<img src="${a.pic}" alt="" loading="lazy">` : ''}<span class="badge kind">${a.kind}</span>${a.src ? `<span class="badge dur listen" data-audio="${a.src}">▶ ${a.dur}</span>` : a.dur ? `<span class="badge dur">${a.dur}</span>` : ''}</div><h3>${a.title}</h3><p>${a.creator}${a.sub ? ' · ' + a.sub : ''} · <span class="price free">Free</span> · ${a.lic.replace(/^cc0.*/i, 'CC0')}</p></a>`,
  merch: m => `<button class="card" data-kind="Merch" data-pay="merch" data-title="${esc(m.title)}" data-price="${m.price}" data-creator="${esc(m.creator)}" ${m.creator === ME ? 'data-split' : ''}><div class="thumb merch" style="background:${m.bg};color:${m.ink}"><svg viewBox="0 0 100 100" fill="currentColor">${merchArt[m.art]}</svg></div><h3>${m.title}</h3><p>${m.creator} · <span class="price">$${m.price}</span></p></button>`,
  trending: f => `<a class="card" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f)}" alt="" loading="lazy"><span class="badge rank">${f.rank}</span><span class="badge dur">${f.dur}</span></div><div class="meta">${face(f.creator)}<div><h3>${f.title}</h3><p>${byline(f)} · <span class="up">▲ ${f.up}%</span> this week</p></div></div></a>`,
  rankrow: f => `<a class="rankrow" href="${watchUrl(f)}"><span class="num">${f.rank}</span><div class="thumb"><img src="${frame(f, f.at, 330)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div class="info"><h3>${f.title}</h3><p class="muted small">${byline(f)} · ${f.year} · ${f.kind}</p></div><span class="up">▲ ${f.up}%</span></a>`,
  castp: a => `<a class="castp" href="${artistUrl(a.name)}">${person(a)}<span><b>${a.name}</b><span class="muted small">${a.role}</span></span></a>`,
  artists: a => `<a class="rankrow" href="${artistUrl(a.name)}"><span class="num">${a.rank}</span>${person(a)}<div class="info"><h3>${a.name}</h3><p class="muted small">${a.role} · known for ${a.known}</p></div><span class="up">▲ ${a.up}%</span></a>`,
  channels: c => `<div class="channel"><span class="clogo" style="background:${c.tone}">${initials(c.name)}</span><a class="info" href="${c.href}"><b>${c.name}</b><span class="muted small">${c.about}</span></a><button class="btn follow">Follow</button></div>`,
  campaigns: c => {
    const pct = Math.round(c.raised / c.goal * 100);
    return `<a class="card" href="fund.html"><div class="thumb"><img src="${c.pic}" alt="" loading="lazy"><span class="badge kind">Funding</span></div><h3>${c.title}</h3><p>${c.creator}</p><div class="progress"><span style="width:${pct}%"></span></div><p><span class="price">$${c.raised.toLocaleString('en-US')}</span> raised · ${pct}% · ${c.days} days left</p></a>`;
  },
};

// The person an artist page or a profile is about.
const subject = page === 'artist' ? who[param('name')] || who['F. W. Murnau'] : who[ME];
const filmsOf = p => p.films.map(k => film[k]);

// Next to a film: the director's other films, then films of the same kind.
const related = [...CATALOG.films.filter(f => f !== cur && f.by.some(n => cur.by.includes(n))), ...CATALOG.films.filter(f => f !== cur && f.kind === cur.kind && !f.by.some(n => cur.by.includes(n)))].slice(0, 4);
// What is rising this week: films, the people behind them, and the companies that made them.
const trending = ['nosferatu', 'sherlock-jr', 'man-with-a-movie-camera', 'trip-to-the-moon', 'the-general', 'cabinet-of-dr-caligari', 'impossible-voyage', 'nanook-of-the-north', 'within-our-gates', 'suspense']
  .map((k, i) => ({ ...film[k], rank: i + 1, up: [212, 148, 96, 81, 77, 64, 52, 40, 33, 21][i] }));
const artists = [['Max Schreck', 64], ['XCOPY', 58], ['Buster Keaton', 51], ['Jack Butcher', 47], ['Yelizaveta Ignatevna Svilova', 43], ['F. W. Murnau', 38], ['Rosenlykke', 34], ['Lois Weber', 31], ['Dziga Vertov', 27], ['Han x Nicolas Daniel', 24], ['Oscar Micheaux', 22], ['Robert J. Flaherty', 15]]
  .filter(([n]) => who[n]).map(([name, up], i) => ({ name, up, role: who[name].role, known: who[name].chain ? who[name].chain.collections.find(c => c.cc0).name : film[who[name].films[0]].title, rank: i + 1 }));
const channels = ['Star Film Company', 'Prana Film', 'Edison Studios', 'All-Ukrainian Photo-Cinema Administration', 'Metro Pictures', 'Hal Roach Studios']
  .map(n => CATALOG.companies.find(c => c.name === n)).filter(Boolean)
  .map(c => ({ name: c.name, tone: tone(c.name), href: c.name === 'Star Film Company' ? 'creator.html' : watchUrl(film[c.films[0]]),
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
  if (by && names[0] === 'assets' && !items.length) items = filmsOf(who[by]).flatMap(f => f.scenes.slice(0, 2).map((_, i) => ({ item: stillOf(f, i), name: 'assets' }))).slice(0, 8);
  if (!items.length && el.dataset.empty) { el.innerHTML = `<p class="muted empty">${el.dataset.empty}${subject.chain && !subject.claimed ? ' This opens up when the page is claimed.' : ''}</p>`; return; }
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
      btn.disabled = false; btn.textContent = 'Load more';
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

$$('[data-crew]').forEach(el => {
  el.innerHTML = `
    <div class="splitbar">${crew.map((c, i) => `<span style="width:${c.pct}%;opacity:${Math.max(.2, 1 - i * .12)}" title="${c.name} ${c.pct}%"></span>`).join('')}</div>
    <div class="crew">${crew.map(c => `<div class="person">${mug(c)}<span class="info"><b>${c.name}</b><span class="muted small">${c.role}</span></span><span class="pct">${c.pct}%</span></div>`).join('')}</div>
    <p class="muted small" style="margin-top:12px">The names and roles are this film's real credits, from Wikidata. The percentages are an example of a split.</p>`;
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
    : `<b>${[cur.year, cur.kind, cur.country[0], cur.company[0]].filter(Boolean).join(' · ')}</b><p>${cur.blurb} Free to watch. Whatever it earns is shared across the people who made it.</p>`);
  fill('related', cur.by.some(n => related[0]?.by.includes(n)) ? `More from ${byline(cur)}` : `More ${cur.kind.toLowerCase()}`);

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
  $('[data-hero-meta]', hero).textContent = `${f.kind} · ${f.year} · ${Math.round(f.secs / 60)} min`;
  $('p', hero).textContent = `${f.blurb} Free to watch. Whatever it earns is shared across its cast and crew.`;
}

$$('[data-campaign-pic]').forEach(i => { i.src = frame(film['conquest-of-the-pole'], undefined, 960); });

/* ---------- people: artist pages and the Credits tab of a profile ---------- */

const chev = '<svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
const knownHtml = p => filmsOf(p).slice(0, 4).map(f => `<a class="poster" href="${watchUrl(f)}"><div class="thumb"><img src="${frame(f)}" alt="" loading="lazy"></div><b>${f.title}</b><span class="muted small">${f.crew.find(c => c.name === p.name)?.role || p.role} · ${f.year}</span><span class="muted small">${f.kind}</span></a>`).join('');
const creditsHtml = p => p.credits.map((c, i) => `
  <details class="fold"${i ? '' : ' open'}>
    <summary><span><b>${c.role}</b><span class="muted small">${c.total} ${c.total === 1 ? 'title' : 'titles'}</span></span>${chev}</summary>
    <div class="rows">${c.list.map(x => {
      const f = film[x.key];
      return `<div class="row credit"><div class="thumb">${f ? `<img src="${frame(f, f.at, 250)}" alt="" loading="lazy">` : ''}</div><div class="info"><b>${x.title}</b><span class="muted small">${f ? `${f.kind} · ${f.dur}` : 'Not on dein.art yet'}</span></div><span class="year">${x.year || ''}</span>${f ? `<a class="btn" href="${watchUrl(f)}">Play</a>` : ''}</div>`;
    }).join('')}${c.total > c.list.length ? `<div class="row credit"><div class="info"><span class="muted small">and ${c.total - c.list.length} more</span></div><a class="link" href="https://www.wikidata.org/wiki/${p.wd}" target="_blank" rel="noopener">Full list on Wikidata</a></div>` : ''}</div>
  </details>`).join('');
const totalCredits = p => p.credits.reduce((a, c) => a + c.total, 0);
$$('[data-known]').forEach(el => { el.innerHTML = knownHtml(subject); });
$$('[data-credits]').forEach(el => { el.innerHTML = creditsHtml(subject); });
$$('[data-credit-count]').forEach(el => { el.textContent = `${totalCredits(subject)} titles`; });

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
  $$('[data-has-credits]').forEach(el => { el.hidden = !a.credits.length; });
  set('creditnote', a.credits.length ? 'Credits are added when a film is published and its crew is listed, so every cast and crew member builds a page like this one. These come from Wikidata.'
    : 'No credits yet. Credits are added when a work is published and the people who made it are listed.');
  const with_ = [...new Set(mine.flatMap(f => f.crew.map(c => c.name)))].filter(n => n !== a.name && who[n]).slice(0, 5);
  set('with', with_.map(n => cards.castp({ name: n, role: who[n].role })).join(''));
  $$('[data-p="withpanel"]').forEach(el => { el.hidden = !with_.length; });

  if (chain) {
    const pieces = chain.collections.reduce((n, c) => n + c.minted, 0), first = chain.collections.map(c => c.date).sort()[0];
    set('line', `Artist · <span class="mono">${short(chain.address)}</span> · ${chain.collections.length} ${chain.collections.length === 1 ? 'collection' : 'collections'} · ${pieces.toLocaleString('en-US')} pieces on-chain`);
    set('bio', `Has minted work on Ethereum since ${first.slice(0, 4)}: ${chain.collections.map(c => c.name).join(', ')}. This page is built from public on-chain records.`);
    set('links', ext(`https://etherscan.io/address/${chain.address}`, 'Wallet on Etherscan') + (chain.website ? ext(esc(chain.website), esc(chain.website.replace(/^https?:\/\/(www\.)?/, ''))) : ''));
    set('side', '<span class="pop" data-w="status"></span>');
    set('about', `<p class="lead">This page was built from public blockchain records, as indexed by Art Blocks. Until it is claimed, the artist has not joined dein.art and nothing here is offered by them through this site. Images are shown only for collections released under CC0.</p>`);
    set('factstitle', 'On-chain record');
    set('facts', [['Wallet', ext(`https://etherscan.io/address/${chain.address}`, `<span class="mono">${short(chain.address)}</span>`)], ['First mint', first], ['Collections', chain.collections.length], ['Pieces', pieces.toLocaleString('en-US')]].map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  } else {
    const born = a.born ? `Born in ${a.born}${a.bornIn ? ' in ' + a.bornIn : ''}${a.died ? `, died in ${a.died}${a.diedIn ? ' in ' + a.diedIn : ''}` : ''}.` : '';
    const lead = `${a.desc && a.desc.length < 60 ? a.desc[0].toUpperCase() + a.desc.slice(1) + '. ' : ''}${born} On dein.art as ${a.role.toLowerCase()} of ${mine.slice(0, 3).map(f => `"${f.title}" (${f.year})`).join(', ')}.`;
    set('line', [a.role, ...a.occ.filter(o => o.toLowerCase() !== a.role.toLowerCase()).slice(0, 2).map(o => o[0].toUpperCase() + o.slice(1)), a.bornIn, years(a)].filter(Boolean).join(' · '));
    set('bio', me ? 'Stage magician and owner of the Théâtre Robert-Houdin in Paris, who began making films in 1896. He built one of the first film studios, at Montreuil, and made more than five hundred films, writing, designing, directing and acting in most of them.' : lead);
    set('links', [ext(`https://www.wikidata.org/wiki/${a.wd}`, 'Wikidata'), a.imdb && ext(`https://www.imdb.com/name/${a.imdb}/`, 'IMDb'), a.wiki && ext(`https://en.wikipedia.org/wiki/${encodeURIComponent(a.wiki.replace(/ /g, '_'))}`, 'Wikipedia')].filter(Boolean).join(''));
    set('side', me ? `<div class="earn">
      <span class="muted small">Your share of earnings · only you see this · example figures</span>
      <div class="total">$63,790</div>
      <dl><dt>Marketplace</dt><dd>$42,000</dd><dt>Merch</dt><dd>$9,540</dd><dt>Support and live tips</dt><dd>$12,250</dd></dl>
      <p class="muted small" style="margin-top:10px">Another $123,285 went to your cast and crew.</p></div>`
      : ranked ? `<a class="pop" href="trending.html#artists"><span class="muted small">Trending</span><b>#${ranked.rank}</b><span class="up">▲ ${ranked.up}%</span></a>` : '');
    set('about', `<p class="lead">${lead}</p>${me ? '<p class="muted" style="margin-top:12px">The films are in the public domain. The earnings, merch and campaigns on this page are examples of what a creator\'s page holds.</p>' : ''}`);
    set('factstitle', 'Personal details');
    set('facts', [['Born', a.born && `${a.born}${a.bornIn ? ' · ' + a.bornIn : ''}`], ['Died', a.died && `${a.died}${a.diedIn ? ' · ' + a.diedIn : ''}`], ['Worked as', a.occ.join(', ')]].filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  }
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
