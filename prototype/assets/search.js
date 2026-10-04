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
  document.addEventListener('market-changed', e => e.detail.forEach(it => { const x = marketEntry(it); index.push({ ...x, t: fold(x.title), m: fold(x.more) }); }));
  const GROUPS = ['Wallets', 'Films', 'People', 'Studios', 'Categories', 'Marketplace'], LABEL = { Wallets: 'ENS names and wallets' };
  // artists whose ENS name is not written down yet: ask once, then they are found by it
  index.filter(x => x.address).forEach(x => resolveEns(x.address).then(n => { if (n) { x.m += ' ' + fold(n); x.sub += ' · ' + n; } }));

  /* ---------- ENS names and wallets: any name or address on Ethereum leads to its wallet's page ---------- */
  const shortAddr = a => a.slice(0, 6) + '…' + a.slice(-4);
  const isAddress = t => /^0x[0-9a-fA-F]{40}$/.test(t.trim());
  // the names to try for what was typed: the name as written, or the words run together as a .eth name
  const namesFor = q => {
    const t = q.trim().toLowerCase(); if (!t || isAddress(t)) return [];
    if (/^[^\s.]+(\.[^\s.]{2,})+$/.test(t)) return [t];
    const words = t.split(/\s+/).filter(w => /^[a-z0-9-]+$/.test(w)); if (words.length !== t.split(/\s+/).length) return [];
    return [...new Set([words.join(''), ...(words.length > 1 ? [words.join('-'), ...words] : [])])].filter(w => w.length >= 3).slice(0, 4).map(w => w + '.eth');
  };
  // one result per wallet: the name that was found, and every other ENS name on the same wallet
  async function walletHits(q) {
    const found = isAddress(q) ? [{ name: '', address: q.trim().toLowerCase() }] : (await Promise.all(namesFor(q).map(ensDomain))).filter(Boolean);
    const wallets = [...new Map(found.map(f => [f.address, f])).values()];
    return Promise.all(wallets.map(async f => {
      const { names, more } = await ensNamesOf(f.address), primary = await resolveEns(f.address);
      // anyone can point a name at someone else's wallet, so only the names the wallet itself owns are listed
      // and a name under someone else's name (word.theirs.eth) can be handed to any wallet, so those are left out too
      const mine = names.filter(n => n.owns).map(n => n.name), own = n => n.split('.').length <= 2 || mine.includes(n.split('.').slice(-2).join('.'));
      const all = [...new Set([f.name, primary, ...mine.filter(own)].filter(Boolean))], others = names.filter(n => !all.includes(n.name)).length;
      const artist = ONCHAIN.find(x => x.address === f.address && x.listed !== false), title = artist ? artist.name : f.name || primary || shortAddr(f.address);
      return { g: 'Wallets', title, sub: [artist ? f.name || primary : '', f.expired ? 'registration expired' : '', 'Wallet ' + shortAddr(f.address), all.length > 1 ? `${all.length} ENS names` : ''].filter(Boolean).join(' · '),
        href: artist ? artistUrl(artist.name) : 'artist.html?wallet=' + f.address, person: artist && artist.name, wallet: artist ? '' : f.address, address: f.address, names: all, others, more, expired: f.expired };
    }));
  }

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
      const rows = GROUPS.flatMap(g => { const list = hits.filter(x => x.g === g).slice(0, g === 'Marketplace' ? 4 : 3); return list.length ? [`<p class="sg-h">${LABEL[g] || g}</p>`, ...list.map(x => row(x, q))] : []; });
      box.innerHTML = (rows.join('') || `<p class="sg-none">Nothing found for “${esc(q)}”</p>`) + (hits.length ? `<a class="sg all" href="search.html?q=${encodeURIComponent(q.trim())}">${hits.length === 1 ? 'See the result' : `See all ${hits.length} results`} <span>↵</span></a>` : '');
      box.hidden = false;
      // names and wallets on Ethereum arrive a moment later: the wallet, then every ENS name on it
      const mine = ++asked; clearTimeout(timer);
      if (namesFor(q).length || isAddress(q)) timer = setTimeout(() => walletHits(q).then(list => {
        if (mine !== asked || !list.length) return;
        $('.sg-none', box)?.remove();
        const html = `<p class="sg-h">${LABEL.Wallets}</p>` + list.map(x => row(x, q) + x.names.filter(n => n !== x.title).slice(0, 4).map(n => `<a class="sg sgname" href="${x.href}"><span class="sthumb blank">◈</span><span><b>${mark(n, q)}</b><small>ENS name on ${esc(x.title)}</small></span></a>`).join('')
          + (x.names.filter(n => n !== x.title).length > 4 ? `<a class="sg sgname" href="search.html?q=${encodeURIComponent(q.trim())}&in=Wallets"><span class="sthumb blank">…</span><span><b>${x.names.filter(n => n !== x.title).length - 4} more names</b><small>on this wallet</small></span></a>` : '')).join('');
        q.includes('.') || isAddress(q) || !$('.sg.all', box) ? box.insertAdjacentHTML('afterbegin', html) : $('.sg.all', box).insertAdjacentHTML('beforebegin', html);
      }), 280);
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
      Wallets: x => `<div class="walletcard"><a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>
        ${x.names.length ? `<p class="edlabel">${x.names.length} ENS ${x.names.length === 1 ? 'name' : 'names'} on this wallet</p><div class="cf-chips">${x.names.map(n => `<a class="chip" href="${x.href}">${esc(n)}</a>`).join('')}</div>` : '<p class="muted small" style="margin-top:8px">No ENS name on this wallet.</p>'}
        ${x.others ? `<p class="muted small" style="margin-top:8px">${x.others}${x.more ? '+' : ''} more ${x.others === 1 ? 'name points' : 'names point'} here but belong to other wallets.</p>` : ''}${x.expired ? '<p class="muted small" style="margin-top:8px">The registration of the name you searched has expired.</p>' : ''}
        <p class="muted small mono" style="margin-top:10px">${x.address} ${copyBtn(x.address)}</p></div>`,
      People: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      Studios: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      Categories: x => `<a class="chip" href="${x.href}">${esc(x.title)}</a>`,
      Marketplace: x => cards.assets(x.ref),
    };
    const wrap = { Wallets: 'walletcards', Films: 'grid', People: 'cf-people', Studios: 'cf-people', Categories: 'cf-chips', Marketplace: 'grid' };
    const draw = () => {
      const groups = GROUPS.filter(g => count(g) && (tab === 'All' || tab === g));
      out.innerHTML = `<div class="page-head"><h1>${q ? `Results for “${esc(q)}”` : 'Search'}</h1><p>${!q ? 'Type in the box above to search films, people, studios and the marketplace.' : hits.length ? `${hits.length} ${hits.length === 1 ? 'result' : 'results'}` : ''}</p></div>
        ${hits.length ? `<div class="chips">${['All', ...GROUPS.filter(count)].map(g => `<button class="chip${g === tab ? ' on' : ''}" data-in="${g}">${LABEL[g] || g}${g === 'All' ? '' : ` · ${count(g)}`}</button>`).join('')}</div>` : ''}
        ${groups.map(g => { const list = hits.filter(x => x.g === g), cut = tab === 'All' ? { Films: 8, Marketplace: 8, People: 8, Studios: 8 }[g] || 99 : 400;
          return `<div class="sec"><h2>${LABEL[g] || g}</h2>${list.length > cut ? `<button class="link" data-in="${g}">See all ${list.length}</button>` : `<p>${list.length}</p>`}</div><div class="${wrap[g]}">${list.slice(0, cut).map(card[g]).join('')}</div>`; }).join('')}
        ${q && !hits.length ? `<div class="box" style="margin-top:24px"><b>Nothing found for “${esc(q)}”</b><p>Check the spelling, try fewer words, or browse <a class="link" href="trending.html">what is trending</a> and the <a class="link" href="market.html">marketplace</a>.</p></div>` : ''}`;
      if (typeof fillViews === 'function') fillViews();
    };
    out.addEventListener('click', e => { const b = e.target.closest('[data-in]'); if (!b) return; tab = b.dataset.in; const u = new URL(location.href); tab === 'All' ? u.searchParams.delete('in') : u.searchParams.set('in', tab); history.replaceState(null, '', u); draw(); window.scrollTo(0, 0); });
    draw();
    walletHits(q).then(list => { if (list.length) { hits.unshift(...list); draw(); } });
  }
})();
