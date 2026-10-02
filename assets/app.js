const FEE = 1; // flat platform fee per transaction, in dollars
const ME = 'Aras Demirkol';
const money = n => '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const img = (pic, w = 640, h = 360) => `https://picsum.photos/id/${pic}/${w}/${h}`;
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const page = document.body.dataset.page;

/* ---------- sample content ---------- */

const films = [
  { title: 'Last Train to Kars', creator: ME, meta: '1.2M views', dur: '1:18:22', pic: 220 },
  { title: 'Salt Road', creator: 'Leyla Sancak', meta: '412K views', dur: '1:24:05', pic: 196 },
  { title: 'Night Ferry', creator: 'Mika Tanoue', meta: '96K views', dur: '1:48:19', pic: 271 },
  { title: 'Hands of the Bazaar — Episode 1', creator: ME, meta: '630K views', dur: '52:30', pic: 139 },
  { title: 'The Last Projectionist', creator: 'Tomás Okafor', meta: '230K views', dur: '18:02', pic: 117 },
  { title: 'Paper Kites', creator: 'Arjun Melkote', meta: '58K views', dur: '34:27', pic: 258 },
  { title: 'Harbour at Dawn', creator: 'Mika Tanoue', meta: '41K views', dur: '9:48', pic: 273 },
  { title: 'Making Last Train to Kars', creator: ME, meta: '87K views', dur: '14:55', pic: 204 },
];

const streams = [
  { title: 'Editing Last Train to Kars live — ask me anything', creator: ME, viewers: '2.4K', pic: 180 },
  { title: 'Colour grading a night scene from scratch', creator: 'Mika Tanoue', viewers: '860', pic: 223 },
  { title: 'Location scout: walking the Salt Road', creator: 'Leyla Sancak', viewers: '1.1K', pic: 177 },
  { title: 'Paper Kites in concert — the full score, live', creator: 'Arjun Melkote', viewers: '540', pic: 158 },
];

const assets = [
  { title: 'Last Train to Kars — 4 hours of rushes, 4K', kind: 'Raw footage', creator: ME, price: 120, pic: 242, dur: '4:02:11' },
  { title: 'Night Ferry — shooting script, 96 pages', kind: 'Script', creator: 'Mika Tanoue', price: 15, pic: 171 },
  { title: 'Salt Road — collectible storyboards, edition of 250', kind: 'Storyboard', creator: 'Leyla Sancak', price: 40, pic: 184 },
  { title: 'Documentary title pack for Resolve and After Effects', kind: 'Template', creator: 'Arjun Melkote', price: 25, pic: 240 },
  { title: 'Anatolia aerials — 60 drone shots', kind: 'Raw footage', creator: 'Leyla Sancak', price: 45, pic: 162, dur: '38:10' },
  { title: 'Paper Kites — original score, stems included', kind: 'Music', creator: 'Arjun Melkote', price: 30, pic: 174 },
  { title: 'Last Train to Kars — script and treatment', kind: 'Script', creator: ME, price: 15, pic: 227 },
  { title: 'Film grain and light leak pack', kind: 'Template', creator: 'Tomás Okafor', price: 12, pic: 250 },
];

const merchArt = {
  tee: '<path d="M35 12 10 26l9 18 11-5v49h40V39l11 5 9-18-25-14c-2 8-8 12-15 12s-13-4-15-12z"/>',
  poster: '<rect x="24" y="10" width="52" height="78" rx="3"/><rect x="31" y="18" width="38" height="40" fill="rgba(255,255,255,.4)"/><rect x="31" y="64" width="26" height="4" fill="rgba(255,255,255,.65)"/><rect x="31" y="72" width="18" height="4" fill="rgba(255,255,255,.45)"/>',
  tote: '<path d="M26 38h48l4 50H22z"/><path d="M38 38V26a12 12 0 0 1 24 0v12" fill="none" stroke="currentColor" stroke-width="5"/>',
  cap: '<path d="M18 62a32 32 0 0 1 64 0z"/><path d="M50 62h42c0 6-10 9-22 9s-20-3-20-9z" opacity=".65"/>',
  vinyl: '<circle cx="50" cy="50" r="38"/><circle cx="50" cy="50" r="13" fill="rgba(255,255,255,.55)"/><circle cx="50" cy="50" r="2.5" fill="#fff"/>',
};
const merch = [
  { title: 'Last Train to Kars tee', creator: ME, price: 28, art: 'tee', bg: '#efedff', ink: '#5b4bff' },
  { title: 'Last Train to Kars festival poster, signed', creator: ME, price: 35, art: 'poster', bg: '#fff1e0', ink: '#e0812a' },
  { title: 'Hands of the Bazaar tote bag', creator: ME, price: 18, art: 'tote', bg: '#e6f4ee', ink: '#0d8a4f' },
  { title: 'Salt Road soundtrack on vinyl', creator: 'Leyla Sancak', price: 32, art: 'vinyl', bg: '#f1f1f4', ink: '#101216' },
  { title: 'Night Ferry crew cap', creator: 'Mika Tanoue', price: 22, art: 'cap', bg: '#e8f1ff', ink: '#2f6fed' },
  { title: 'The Last Projectionist poster', creator: 'Tomás Okafor', price: 20, art: 'poster', bg: '#fdeaea', ink: '#d6454a' },
].map(m => ({ ...m, kind: 'Merch' }));

const campaigns = [
  { title: 'Hands of the Bazaar — Season 2', creator: ME, raised: 64200, goal: 90000, days: 18, pic: 139 },
  { title: 'Night Ferry: the director\'s cut', creator: 'Mika Tanoue', raised: 21750, goal: 30000, days: 9, pic: 249 },
  { title: 'The Beekeepers of Hemşin — a first feature', creator: 'Leyla Sancak', raised: 8400, goal: 45000, days: 31, pic: 110 },
  { title: 'Paper Kites, part two', creator: 'Arjun Melkote', raised: 12900, goal: 15000, days: 4, pic: 129 },
];

// Shown when someone presses "Load more"; after these run out the lists repeat.
const more = {
  films: [
    { title: 'The Red Boat', creator: 'Leyla Sancak', meta: '73K views', dur: '22:14', pic: 124 },
    { title: 'Postman of the Shore', creator: 'Tomás Okafor', meta: '120K views', dur: '41:09', pic: 203 },
    { title: 'Snow Over the Rooftops', creator: 'Mika Tanoue', meta: '310K views', dur: '1:02:33', pic: 188 },
    { title: 'Lamplight', creator: 'Arjun Melkote', meta: '19K views', dur: '12:40', pic: 232 },
    { title: 'The Canal Keepers', creator: 'Tomás Okafor', meta: '64K views', dur: '47:51', pic: 164 },
    { title: 'A Forest in Fog', creator: 'Leyla Sancak', meta: '88K views', dur: '28:03', pic: 229 },
    { title: 'City of Glass', creator: 'Mika Tanoue', meta: '205K views', dur: '1:31:20', pic: 238 },
    { title: 'Sundown Pier', creator: 'Arjun Melkote', meta: '33K views', dur: '7:15', pic: 265 },
  ],
  live: [
    { title: 'Night shoot on the bridge — behind the camera', creator: 'Mika Tanoue', viewers: '310', pic: 249 },
    { title: 'Sound walk through the old town', creator: 'Tomás Okafor', viewers: '190', pic: 257 },
    { title: 'Storyboarding the opening scene', creator: 'Leyla Sancak', viewers: '420', pic: 208 },
    { title: 'Sunrise timelapse, live from the pier', creator: 'Arjun Melkote', viewers: '95', pic: 144 },
  ],
  assets: [
    { title: 'Mountain ridge aerials — 40 drone shots', kind: 'Raw footage', creator: 'Leyla Sancak', price: 35, pic: 231, dur: '24:36' },
    { title: 'City at night — b-roll pack', kind: 'Raw footage', creator: 'Mika Tanoue', price: 28, pic: 274, dur: '51:02' },
    { title: 'The Last Projectionist — screenplay', kind: 'Script', creator: 'Tomás Okafor', price: 10, pic: 235 },
    { title: 'Winter ambience — field recordings', kind: 'Music', creator: 'Arjun Melkote', price: 14, pic: 256 },
  ],
};

// Everyone who worked on the film gets a share of everything it earns.
const crew = [
  { name: ME, role: 'Director, producer', pct: 40 },
  { name: 'Elif Karabey', role: 'Cinematographer', pct: 20, photo: 47 },
  { name: 'Deniz Altıok', role: 'Editor', pct: 15, photo: 12 },
  { name: 'Marco Belluno', role: 'Sound', pct: 10, photo: 14 },
  { name: 'Aylin Yazgan', role: 'Composer', pct: 10, photo: 45 },
  { name: 'The train crew', role: 'Cast', pct: 5 },
];
const tones = { [ME]: '#101216', 'Leyla Sancak': '#c9772b', 'Mika Tanoue': '#2f6fed', 'Tomás Okafor': '#0d8a4f', 'Arjun Melkote': '#d6454a' };
const face = name => `<span class="avatar xs" ${name === ME ? '' : `style="background:${tones[name]}"`}>${initials(name)}</span>`;
const portrait = n => `https://i.pravatar.cc/96?img=${n}`;
const mug = c => c.photo ? `<img class="avatar" src="${portrait(c.photo)}" alt="">` : `<span class="avatar tint">${initials(c.name)}</span>`;
const person = a => a.photo ? `<img class="avatar" src="${portrait(a.photo)}" alt="">` : `<span class="avatar" style="background:${tones[a.name]}">${initials(a.name)}</span>`;
const initials = name => name.replace(/^The /, '').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

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
  you: [['creator', 'Your page', 'creator.html', 'user', 1], ['creator#credits', 'Credits', 'creator.html#credits', 'list'], ['creator#collections', 'NFT collections', 'creator.html#collections', 'gem'], ['creator#merch', 'Merch', 'creator.html#merch', 'merch'],
        ['creator#funding', 'Funding', 'creator.html#funding', 'fund'], ['create', 'Create', 'upload.html', 'upload', 1]],
  explore: [['', 'Documentaries', 'index.html', 'film'], ['', 'Short films', 'index.html', 'film'], ['', 'Series', 'index.html', 'film'],
            ['', 'Raw footage', 'market.html?kind=Raw footage', 'market'], ['', 'Scripts', 'market.html?kind=Script', 'market'], ['', 'Music', 'market.html?kind=Music', 'market']],
};
const sideLink = ([key, label, href, ic, rail]) => `<a class="sl${rail ? ' rail' : ''}" data-key="${key}" href="${href}">${icons[ic]}<span>${label}</span></a>`;
document.body.insertAdjacentHTML('afterbegin', `
<header class="top"><div class="wrap">
  <button class="btn icon bare" id="menu" aria-label="Open or close the sidebar">${icons.menu}</button>
  <a class="logo" href="index.html"><span class="de">de</span><span class="in">in</span><i>.</i><b>art</b></a>
  <form class="search" onsubmit="return false"><input placeholder="Search films, footage, scripts" aria-label="Search"></form>
  <a class="btn primary" href="upload.html">Create</a>
  <button class="btn icon" id="theme" aria-label="Switch between light and dark mode" title="Light / dark">
    <svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg>
    <svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
  </button>
  <a class="avatar" href="creator.html" aria-label="Your profile">AD</a>
</div></header>
<aside class="sidebar" aria-label="Site navigation">
  ${side.main.map(sideLink).join('')}
  <hr><h4>You</h4>
  ${side.you.map(sideLink).join('')}
  <hr><h4>Following</h4>
  ${['Leyla Sancak', 'Mika Tanoue', 'Tomás Okafor', 'Arjun Melkote'].map((n, i) => `<a class="sl" href="artist.html?name=${encodeURIComponent(n)}"><span class="avatar xxs" style="background:${tones[n]}">${initials(n)}</span><span>${n}</span>${i < 2 ? '<i class="dot" title="Live now"></i>' : ''}</a>`).join('')}
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
</div></footer>
<dialog id="pay">
  <div class="form">
    <h2></h2>
    <p class="lead muted small"></p>
    <div class="amounts">${[5, 10, 25].map(n => `<button class="pick" data-amount="${n}">$${n}</button>`).join('')}</div>
    <div class="pay"><button class="pick on">Card</button><button class="pick">Crypto wallet</button></div>
    <div class="sum"></div>
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
  if (!btn) return;
  const mode = payModes[btn.dataset.pay];
  order = { mode: btn.dataset.pay, amount: Number(btn.dataset.price) || 10, split: 'split' in btn.dataset, creator: btn.dataset.creator };
  $('h2', dialog).textContent = btn.dataset.title || mode.title;
  $('.lead', dialog).textContent = mode.lead;
  $('.amounts', dialog).hidden = !mode.pick;
  $('.confirm', dialog).textContent = mode.confirm;
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

const cards = {
  films: f => `<a class="card" href="watch.html"><div class="thumb"><img src="${img(f.pic)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div class="meta">${face(f.creator)}<div><h3>${f.title}</h3><p>${f.creator} · ${f.meta}</p></div></div></a>`,
  next: f => `<a class="next" href="watch.html"><div class="thumb"><img src="${img(f.pic, 320, 180)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div><h3>${f.title}</h3><p class="muted small">${f.creator}<br>${f.meta}</p></div></a>`,
  live: s => `<a class="card" href="live.html"><div class="thumb"><img src="${img(s.pic)}" alt="" loading="lazy"><span class="badge live">LIVE</span><span class="badge dur">${s.viewers} watching</span></div><div class="meta">${face(s.creator)}<div><h3>${s.title}</h3><p>${s.creator}</p></div></div></a>`,
  assets: a => `<button class="card" data-kind="${a.kind}" data-pay="buy" data-title="${a.title}" data-price="${a.price}" data-creator="${a.creator}" ${a.creator === ME ? 'data-split' : ''}><div class="thumb"><img src="${img(a.pic)}" alt="" loading="lazy"><span class="badge kind">${a.kind}</span>${a.dur ? `<span class="badge dur">${a.dur}</span>` : ''}</div><h3>${a.title}</h3><p>${a.creator} · <span class="price">$${a.price}</span></p></button>`,
  merch: m => `<button class="card" data-kind="Merch" data-pay="merch" data-title="${m.title}" data-price="${m.price}" data-creator="${m.creator}" ${m.creator === ME ? 'data-split' : ''}><div class="thumb merch" style="background:${m.bg};color:${m.ink}"><svg viewBox="0 0 100 100" fill="currentColor">${merchArt[m.art]}</svg></div><h3>${m.title}</h3><p>${m.creator} · <span class="price">$${m.price}</span></p></button>`,
  trending: f => `<a class="card" href="watch.html"><div class="thumb"><img src="${img(f.pic)}" alt="" loading="lazy"><span class="badge rank">${f.rank}</span><span class="badge dur">${f.dur}</span></div><div class="meta">${face(f.creator)}<div><h3>${f.title}</h3><p>${f.creator} · <span class="up">▲ ${f.up}%</span> this week</p></div></div></a>`,
  rankrow: f => `<a class="rankrow" href="watch.html"><span class="num">${f.rank}</span><div class="thumb"><img src="${img(f.pic, 320, 180)}" alt="" loading="lazy"><span class="badge dur">${f.dur}</span></div><div class="info"><h3>${f.title}</h3><p class="muted small">${f.creator} · ${f.meta}</p></div><span class="up">▲ ${f.up}%</span></a>`,
  castp: a => `<a class="castp" href="${artistUrl(a.name)}">${person(a)}<span><b>${a.name}</b><span class="muted small">${a.role}</span></span></a>`,
  artists: a => `<a class="rankrow" href="${artistUrl(a.name)}"><span class="num">${a.rank}</span>${person(a)}<div class="info"><h3>${a.name}</h3><p class="muted small">${a.role} · known for ${a.known}</p></div><span class="up">▲ ${a.up}%</span></a>`,
  channels: c => `<div class="channel"><span class="clogo" style="background:${c.tone}">${initials(c.name)}</span><a class="info" href="creator.html"><b>${c.name}</b><span class="muted small">${c.about}</span></a><button class="btn follow">Follow</button></div>`,
  collections: c => `<a class="card" href="#pieces"><div class="mosaic">${c.pics.map(p => `<img src="${img(p, 480, 480)}" alt="" loading="lazy">`).join('')}</div><h3>${c.title}</h3><p>${c.pieces} pieces · ${c.collectors} collectors · from <span class="price">$${c.from}</span></p></a>`,
  nfts: n => `<button class="card" data-pay="collect" data-split data-title="${n.title}" data-price="${n.price}"><div class="thumb sq"><img src="${img(n.pic, 480, 480)}" alt="" loading="lazy"><span class="badge kind">${n.edition}</span></div><h3>${n.title}</h3><p><span class="price">$${n.price}</span> · minted on-chain</p></button>`,
  campaigns: c => {
    const pct = Math.round(c.raised / c.goal * 100);
    return `<a class="card" href="fund.html"><div class="thumb"><img src="${img(c.pic)}" alt="" loading="lazy"><span class="badge kind">Funding</span></div><h3>${c.title}</h3><p>${c.creator}</p><div class="progress"><span style="width:${pct}%"></span></div><p><span class="price">$${c.raised.toLocaleString('en-US')}</span> raised · ${pct}% · ${c.days} days left</p></a>`;
  },
};
const related = [
  { title: 'Interview: the conductor of the night train', creator: ME, meta: '214K views', dur: '18:40', pic: 233 },
  { title: 'Behind the scenes: a week on board', creator: ME, meta: '143K views', dur: '26:12', pic: 197 },
  { title: 'The edit: cutting Last Train to Kars', creator: ME, meta: '56K views', dur: '41:05', pic: 180 },
  { title: 'Making Last Train to Kars', creator: ME, meta: '87K views', dur: '14:55', pic: 204 },
];
// What is rising this week: films, the people behind them, and the channels that publish them.
const trending = [films[0], more.films[2], films[1], films[4], more.films[1], films[2], more.films[6], films[3], more.films[0], films[5]]
  .map((f, i) => ({ ...f, rank: i + 1, up: [212, 148, 96, 81, 77, 64, 52, 40, 33, 21][i] }));
const artists = [
  { name: 'Elif Karabey', role: 'Cinematographer', photo: 47, up: 64, known: 'Last Train to Kars' },
  { name: 'Mika Tanoue', role: 'Director', up: 51, known: 'Night Ferry' },
  { name: 'Deniz Altıok', role: 'Editor', photo: 12, up: 43, known: 'Last Train to Kars' },
  { name: 'Aylin Yazgan', role: 'Composer', photo: 45, up: 38, known: 'Last Train to Kars' },
  { name: 'Tomás Okafor', role: 'Director', up: 31, known: 'The Last Projectionist' },
  { name: 'Marco Belluno', role: 'Sound', photo: 14, up: 27, known: 'Salt Road' },
  { name: 'Leyla Sancak', role: 'Director', up: 22, known: 'Salt Road' },
  { name: 'Arjun Melkote', role: 'Composer', up: 18, known: 'Paper Kites' },
].map((a, i) => ({ ...a, rank: i + 1 }));
const artistUrl = name => name === ME ? 'creator.html' : 'artist.html?name=' + encodeURIComponent(name);
const channels = [
  { name: 'Kars Film Collective', about: '14 films · 186K followers', tone: '#5b4bff' },
  { name: 'Anatolia Docs', about: '32 films · 142K followers', tone: '#c9772b' },
  { name: 'Night Bus Pictures', about: '9 films · 98K followers', tone: '#2f6fed' },
  { name: 'Paper Kite Studio', about: '21 films · 77K followers', tone: '#d6454a' },
  { name: 'Harbour Light Films', about: '6 films · 54K followers', tone: '#0d8a4f' },
  { name: 'Studio Okafor', about: '11 films · 41K followers', tone: '#7d87a3' },
];
// NFT collections an artist has created, and single pieces from them.
const collections = [
  { title: 'Last Train to Kars — Scenes', pics: [242, 204, 188], pieces: 24, collectors: 212, from: 5 },
  { title: 'Stills from the Dining Car', pics: [192, 171, 223], pieces: 12, collectors: 87, from: 15 },
  { title: 'Storyboards, drawn by hand', pics: [240, 208, 144], pieces: 50, collectors: 39, from: 40 },
];
const nfts = [
  { title: 'Scene: Snow at Erzurum', pic: 188, edition: '340 collected', price: 5 },
  { title: 'Still: Tea at 3 a.m.', pic: 192, edition: '12 of 50 left', price: 15 },
  { title: 'Storyboard: The platform', pic: 240, edition: '1 of 1', price: 120 },
  { title: 'Scene: Arrival in Kars', pic: 204, edition: '97 collected', price: 5 },
];
const lists = { films, live: streams, assets, merch, campaigns, related, trending, artists, channels, collections, nfts };
$$('[data-list]').forEach(el => {
  const names = el.dataset.list.split(' ');
  let items = names.flatMap(name => lists[name].map(item => ({ item, name })));
  if (el.dataset.by) items = items.filter(x => x.item.creator === el.dataset.by);
  if (el.dataset.skip) items = items.slice(Number(el.dataset.skip));
  if (el.dataset.limit) items = items.slice(0, Number(el.dataset.limit));
  el.innerHTML = items.map(x => cards[el.dataset.card || x.name](x.item)).join('');

  // The public feeds never end: "Load more" keeps adding cards.
  const name = names[0];
  if (!more[name] || el.dataset.by || el.dataset.card) return;
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

/* ---------- cast and crew split ---------- */

$$('[data-crew]').forEach(el => {
  el.innerHTML = `
    <div class="splitbar">${crew.map((c, i) => `<span style="width:${c.pct}%;opacity:${1 - i * .15}" title="${c.name} ${c.pct}%"></span>`).join('')}</div>
    <div class="crew">${crew.map(c => `<div class="person">${mug(c)}<span class="info"><b>${c.name}</b><span class="muted small">${c.role}</span></span><span class="pct">${c.pct}%</span></div>`).join('')}</div>`;
});

/* ---------- watch page: cast strip, scenes, picks, reviews ---------- */

$$('[data-cast]').forEach(el => {
  el.innerHTML = `<a class="btn dark" href="#crew">All cast &amp; crew</a>` + crew.map(c => `<a class="castp" href="${c.photo ? artistUrl(c.name) : 'creator.html'}">${mug(c)}<span><b>${c.name}</b><span class="muted small">${c.role}</span></span></a>`).join('');
});

// Moments of the film that viewers can collect, marked on the timeline.
const scenes = [
  { at: 14, name: 'Leaving Ankara', pic: 242, by: 128 },
  { at: 38, name: 'The dining car', pic: 192, by: 212 },
  { at: 61, name: 'Snow at Erzurum', pic: 188, by: 340 },
  { at: 86, name: 'Arrival in Kars', pic: 204, by: 97 },
];
const marks = $('[data-marks]'), sceneBox = $('[data-scene]');
if (marks) {
  const showScene = s => {
    $('span', marks).style.width = s.at + '%';
    sceneBox.style.left = `clamp(8px, calc(${s.at}% - 110px), calc(100% - 228px))`;
    sceneBox.innerHTML = `<img src="${img(s.pic, 320, 180)}" alt=""><div><b>Scene: ${s.name}</b><span>Collected by ${s.by} people</span><button class="btn white" data-pay="collect" data-split data-title="Scene: ${s.name}" data-price="5">Collect · $5</button></div>`;
    $$('.mark', marks).forEach((m, i) => m.classList.toggle('on', scenes[i] === s));
  };
  scenes.forEach(s => {
    const m = document.createElement('button');
    m.className = 'mark'; m.style.left = s.at + '%'; m.setAttribute('aria-label', 'Scene: ' + s.name);
    m.addEventListener('click', () => showScene(s));
    marks.append(m);
  });
  showScene(scenes[0]);
}

const picks = $('[data-picks]');
if (picks) {
  const btn = $('[data-pay]', picks);
  const update = () => {
    const on = $$('input:checked', picks), sum = on.reduce((a, i) => a + Number(i.value), 0);
    $('[data-picked]', picks).textContent = on.length ? `${on.length} selected · $${sum}` : 'Nothing selected';
    btn.disabled = !on.length;
    btn.dataset.price = sum;
    btn.dataset.title = `Behind Last Train to Kars — ${on.length} ${on.length === 1 ? 'item' : 'items'}`;
  };
  picks.addEventListener('change', update); update();
}

const reviews = $('[data-reviews]');
if (reviews) {
  const review = (name, text, photo) => {
    const row = document.createElement('div');
    row.className = 'review';
    row.innerHTML = (photo ? `<img class="avatar" src="${portrait(photo)}" alt="">` : '<span class="avatar">AD</span>') + '<div><b></b><p></p></div>';
    $('b', row).textContent = name; $('p', row).textContent = text;
    return row;
  };
  [['@selin_k', 'I took this train as a child with my grandmother. The dining car scene is exactly how I remember it — the tea glasses, the window fogging up. Thank you for this.', 5],
   ['@jonas_w', 'No narration, no music telling you what to feel. Just people and a long night. The sound design alone is worth it.', 8],
   ['@farah.n', 'Got the raw footage for my film school project. Four hours of rushes and you can see every decision the editor made.', 9],
   ['@kemal.d', 'Knowing the conductor and the tea seller get a share every time someone supports this makes me want to support it more.', 11],
  ].forEach(r => reviews.append(review(...r)));
  $('.review-form').addEventListener('submit', e => {
    e.preventDefault();
    const input = $('.review-form input');
    if (input.value.trim()) reviews.prepend(review('You', input.value.trim()));
    input.value = '';
  });
}

/* ---------- artist page: one layout, filled in for whoever was clicked ---------- */

if (page === 'artist') {
  const a = artists.find(x => x.name === new URLSearchParams(location.search).get('name')) || artists[0];
  document.title = `${a.name} — dein.art`;
  $$('[data-artist]').forEach(el => {
    const key = el.dataset.artist;
    if (key === 'portrait') { if (!a.photo) el.innerHTML = `<span class="big" style="background:${tones[a.name]}">${initials(a.name)}</span>`; else $('img', el).src = `https://i.pravatar.cc/400?img=${a.photo}`; }
    else el.textContent = a[key];
  });
  $('[data-pay="support"]').dataset.creator = a.name;
  $('[data-pay="support"]').dataset.title = 'Support ' + a.name;
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
  [['mika', 'that cut on the drum hit is so good'], ['arjun_r', 'what are you grading in?'], ['leyla_s', 'tipped $25.00', true], ['tomas', 'can you show the timeline again?'],
   ['kerem', 'first time here, is the rushes pack the full interviews?'], ['sofia.m', 'bought the script yesterday, worth it'], ['deniz', 'the sound mix in this scene 👌']].forEach(m => addChat(...m));
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
