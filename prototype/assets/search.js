/* Search: one box for films, people, studios, categories and everything on the marketplace.
   Suggestions appear while typing; Enter opens search.html with every match. */

(() => {
  const fold = s => String(s || '').toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const added = (() => { try { return Object.values(JSON.parse(localStorage.getItem('titles')) || {}); } catch { return []; } })();
  const studios = typeof STUDIOS !== 'undefined' ? STUDIOS : [];
  // every searchable thing: its group, what it is called, what else it can be found by, and where it lives
  const marketEntry = it => ({ g: 'Marketplace', title: it.title, more: [it.by, it.cat, it.sub, it.desc, it.specs && it.specs.Tags, it.film && film[it.film] && film[it.film].title].join(' '), sub: `${it.sub || it.cat} · ${it.price ? '$' + it.price : 'Free'}`, href: itemUrl(it), pic: it.kind === 'merch' ? '' : it.pic, ref: it });
  const index = [
    ...CATALOG.films.map(f => ({ g: 'Films', title: f.title, more: [f.by.join(' '), f.year, f.kind, f.country, f.company, (f.crew || []).map(c => c.name).join(' ')].join(' '), sub: `${byline(f)} · ${f.year} · ${f.kind}`, href: watchUrl(f), pic: frame(f, f.at, 250), ref: f })),
    ...added.map(t => ({ g: 'Films', title: t.title, more: [t.directors.map(d => d.name).join(' '), t.year, t.type, t.genres.join(' '), t.desc].join(' '), sub: `${t.directors.map(d => d.name).join(', ')} · ${t.year} · ${t.type}`, href: 'title.html?id=' + encodeURIComponent(t.id), pic: t.poster, added: t })),
    ...Object.values(who).map(p => { const ens = p.chain && (p.chain.ens || ensListed[p.chain.address] || (ensKnown[p.chain.address] || {}).n); return { g: 'People', title: p.name, more: [p.role, ens, p.chain && p.chain.address].join(' '), sub: [p.role, ens].filter(Boolean).join(' · '), href: artistUrl(p.name), person: p.name, address: p.chain && p.chain.listed !== false && !ens ? p.chain.address : null }; }),
    ...studios.map(s => ({ g: 'Studios', title: s.name, more: [s.type, s.place, s.about].join(' '), sub: [s.type, s.place].filter(Boolean).join(' · '), href: 'studio.html?s=' + s.slug, studio: s })),
    ...CATEGORIES.map(([slug, label]) => ({ g: 'Categories', title: label, more: '', sub: 'Category', href: 'category.html?c=' + slug })),
    ...MARKET.map(marketEntry),
  ].map(x => ({ ...x, t: fold(x.title), m: fold(x.more) }));
  // the big free library joins the search the first time the box is used (it is already there on the marketplace pages)
  let libraryAsked = typeof LIBRARY !== 'undefined';
  const withLibrary = then => {
    if (libraryAsked) return; libraryAsked = true;
    const sc = document.createElement('script'); sc.src = 'assets/library.js';
    sc.onload = () => { addLibrary(MARKET, addLibrary.seen).forEach(it => { const x = marketEntry(it); index.push({ ...x, t: fold(x.title), m: fold(x.more) }); }); then(); };
    document.head.append(sc);
  };
  const GROUPS = ['Wallets', 'Films', 'People', 'Studios', 'Categories', 'Marketplace'];
  // artists whose ENS name is not written down yet: ask once, then they are found by it
  index.filter(x => x.address).forEach(x => resolveEns(x.address).then(n => { if (n) { x.m += ' ' + fold(n); x.sub += ' · ' + n; } }));

  /* ---------- ENS: any name on Ethereum leads to its wallet's page ---------- */
  const ensAsked = {};
  const ensName = q => { const t = q.trim().toLowerCase(); return /^[a-z0-9-]{3,}(\.[a-z0-9-]{2,})*$/.test(t) && !/^0x[0-9a-f]{40}$/.test(t) ? (t.includes('.') ? t : t + '.eth') : null; };
  const ensLookup = name => ensAsked[name] ||= fetch('https://bens.services.blockscout.com/api/v1/1/domains/' + encodeURIComponent(name)).then(r => (r.ok ? r.json() : null))
    .then(d => { const a = d && d.resolved_address && d.resolved_address.hash; return a ? { name: d.name || name, address: a.toLowerCase() } : null; }).catch(() => null);
  const walletEntry = (name, address) => {
    const a = ONCHAIN.find(x => x.address === address && x.listed !== false), short = address.slice(0, 6) + '…' + address.slice(-4);
    return a ? { g: 'Wallets', title: a.name, sub: `${name || short} · ${who[a.name].role}`, href: artistUrl(a.name), person: a.name }
      : { g: 'Wallets', title: name || short, sub: `Wallet · ${short}`, href: 'artist.html?wallet=' + address, wallet: address };
  };
  // a wallet address, an ENS name, or a single word that is someone's .eth name
  const walletHit = async q => {
    const t = q.trim();
    if (/^0x[0-9a-fA-F]{40}$/.test(t)) return walletEntry(null, t.toLowerCase());
    const name = ensName(t), r = name && await ensLookup(name);
    return r ? walletEntry(r.name, r.address) : null;
  };

  function find(q) {
    const words = fold(q).split(/\s+/).filter(Boolean); if (!words.length) return [];
    return index.map(x => {
      let score = 0;
      for (const w of words) {
        // a word counts when something starts with it: "rain" finds "Rain and thunder", not "train"
        const i = x.t.indexOf(w), start = (' ' + x.t).search(new RegExp('[^a-z0-9]' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        if (i === 0) score += 4; else if (start >= 0) score += 3; else if ((' ' + x.m).search(new RegExp('[^a-z0-9]' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) >= 0) score += 1; else return null;
      }
      return { x, score: score + (x.t === words.join(' ') ? 5 : 0) };
    }).filter(Boolean).sort((a, b) => b.score - a.score).map(r => r.x);
  }
  const mark = (text, q) => { const w = q.trim().split(/\s+/).filter(Boolean).map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); return w.length ? esc(text).replace(new RegExp(`(${w.join('|')})`, 'gi'), '<mark>$1</mark>') : esc(text); };
  const thumb = x => x.wallet ? `<span class="avatar" style="background:${tone(x.wallet)}">◈</span>` : x.person ? avatar(x.person) : x.studio ? `<span class="clogo" style="background:${tone(x.title)}">${initials(x.title)}</span>` : x.pic ? `<img class="sthumb" src="${x.pic}" alt="">` : `<span class="sthumb blank">${x.g === 'Categories' ? '#' : x.ref && x.ref.kind === 'merch' ? '◆' : '♪'}</span>`;

  /* ---------- suggestions under the box ---------- */
  const form = $('.search'), input = form && $('input', form);
  if (form) {
    input.placeholder = 'Search films, people, ENS names, footage, music';
    input.setAttribute('autocomplete', 'off');
    if (page === 'search') input.value = param('q') || '';
    form.insertAdjacentHTML('beforeend', '<div class="suggest" hidden></div>');
    const box = $('.suggest', form); let at = -1, asked = 0, timer;
    const row = (x, q) => `<a class="sg" href="${x.href}">${thumb(x)}<span><b>${mark(x.title, q)}</b><small>${mark(x.sub, q)}</small></span></a>`;
    const go = q => { if (q.trim()) location.href = 'search.html?q=' + encodeURIComponent(q.trim()); };
    const draw = () => {
      const q = input.value, hits = find(q); at = -1;
      if (!q.trim()) { box.hidden = true; return; }
      const rows = GROUPS.flatMap(g => { const list = hits.filter(x => x.g === g).slice(0, g === 'Marketplace' ? 4 : 3); return list.length ? [`<p class="sg-h">${g}</p>`, ...list.map(x => row(x, q))] : []; });
      box.innerHTML = (rows.join('') || `<p class="sg-none">Nothing found for “${esc(q)}”</p>`) + (hits.length ? `<a class="sg all" href="search.html?q=${encodeURIComponent(q.trim())}">${hits.length === 1 ? 'See the result' : `See all ${hits.length} results`} <span>↵</span></a>` : '');
      box.hidden = false;
      // the wallet behind an ENS name arrives a moment later
      const mine = ++asked; clearTimeout(timer);
      // a bare word is tried as a .eth name only when nothing on dein.art matches it
      if ((ensName(q) && (q.includes('.') || !hits.length)) || /^0x[0-9a-fA-F]{40}$/.test(q.trim())) timer = setTimeout(() => walletHit(q).then(x => {
        if (mine !== asked || !x || $(`a.sg[href="${x.href}"]`, box)) return;
        $('.sg-none', box)?.remove();
        const html = `<p class="sg-h">Wallets</p>${row(x, q)}`;
        q.includes('.') || q.trim().startsWith('0x') || !$('.sg.all', box) ? box.insertAdjacentHTML('afterbegin', html) : $('.sg.all', box).insertAdjacentHTML('beforebegin', html);
      }), 250);
    };
    input.addEventListener('input', draw);
    input.addEventListener('focus', () => { withLibrary(() => { if (!box.hidden) draw(); }); draw(); });
    input.addEventListener('keydown', e => {
      const links = $$('a.sg', box);
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!links.length) return; at = (at + (e.key === 'ArrowDown' ? 1 : -1) + links.length + (at < 0 && e.key === 'ArrowUp' ? 1 : 0)) % links.length; links.forEach((l, i) => l.classList.toggle('on', i === at)); links[at].scrollIntoView({ block: 'nearest' }); }
      else if (e.key === 'Enter') { e.preventDefault(); if (at >= 0 && links[at]) location.href = links[at].href; else go(input.value); }
      else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
    });
    document.addEventListener('click', e => { if (!form.contains(e.target)) box.hidden = true; });
    // "/" jumps to the search box
    document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable) { e.preventDefault(); input.focus(); } });
  }

  /* ---------- the results page ---------- */
  const out = $('[data-search]');
  if (out) {
    const q = (param('q') || '').trim(), hits = find(q);
    let tab = param('in') && GROUPS.includes(param('in')) ? param('in') : 'All';
    document.title = q ? `${q} — search — dein.art` : 'Search — dein.art';
    const count = g => hits.filter(x => x.g === g).length;
    const card = {
      Films: x => x.ref ? cards.films(x.ref) : `<a class="card" href="${x.href}"><div class="thumb${x.pic ? '' : ' blank'}">${x.pic ? `<img src="${x.pic}" alt="">` : ''}<span class="badge kind">Added by you</span></div><div class="meta"><div><h3>${esc(x.title)}</h3><p>${esc(x.sub)}</p></div></div></a>`,
      Wallets: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      People: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      Studios: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      Categories: x => `<a class="chip" href="${x.href}">${esc(x.title)}</a>`,
      Marketplace: x => cards.assets(x.ref),
    };
    const wrap = { Wallets: 'cf-people', Films: 'grid', People: 'cf-people', Studios: 'cf-people', Categories: 'cf-chips', Marketplace: 'grid' };
    const draw = () => {
      const groups = GROUPS.filter(g => count(g) && (tab === 'All' || tab === g));
      out.innerHTML = `<div class="page-head"><h1>${q ? `Results for “${esc(q)}”` : 'Search'}</h1><p>${!q ? 'Type in the box above to search films, people, studios and the marketplace.' : hits.length ? `${hits.length} ${hits.length === 1 ? 'result' : 'results'}` : ''}</p></div>
        ${hits.length ? `<div class="chips">${['All', ...GROUPS.filter(count)].map(g => `<button class="chip${g === tab ? ' on' : ''}" data-in="${g}">${g}${g === 'All' ? '' : ` · ${count(g)}`}</button>`).join('')}</div>` : ''}
        ${groups.map(g => { const list = hits.filter(x => x.g === g), cut = tab === 'All' ? { Films: 8, Marketplace: 8, People: 8, Studios: 8 }[g] || 99 : 400;
          return `<div class="sec"><h2>${g}</h2>${list.length > cut ? `<button class="link" data-in="${g}">See all ${list.length}</button>` : `<p>${list.length}</p>`}</div><div class="${wrap[g]}">${list.slice(0, cut).map(card[g]).join('')}</div>`; }).join('')}
        ${q && !hits.length ? `<div class="box" style="margin-top:24px"><b>Nothing found for “${esc(q)}”</b><p>Check the spelling, try fewer words, or browse <a class="link" href="trending.html">what is trending</a> and the <a class="link" href="market.html">marketplace</a>.</p></div>` : ''}`;
      if (typeof fillViews === 'function') fillViews();
    };
    out.addEventListener('click', e => { const b = e.target.closest('[data-in]'); if (!b) return; tab = b.dataset.in; const u = new URL(location.href); tab === 'All' ? u.searchParams.delete('in') : u.searchParams.set('in', tab); history.replaceState(null, '', u); draw(); window.scrollTo(0, 0); });
    draw();
    if (q.includes('.') || q.startsWith('0x') || !hits.length) walletHit(q).then(x => { if (x && !hits.some(h => h.href === x.href)) { hits.unshift(x); draw(); } });
  }
})();
