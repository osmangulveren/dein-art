/* Search: one box for films, people, studios, categories and everything on the marketplace.
   Suggestions appear while typing; Enter opens search.html with every match. */

(() => {
  const fold = s => String(s || '').toLowerCase().replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const added = (() => { try { return Object.values(JSON.parse(localStorage.getItem('titles')) || {}); } catch { return []; } })();
  const studios = typeof STUDIOS !== 'undefined' ? STUDIOS : [];
  // every searchable thing: its group, what it is called, what else it can be found by, and where it lives
  const index = [
    ...CATALOG.films.map(f => ({ g: 'Films', title: f.title, more: [f.by.join(' '), f.year, f.kind, f.country, f.company, (f.crew || []).map(c => c.name).join(' ')].join(' '), sub: `${byline(f)} · ${f.year} · ${f.kind}`, href: watchUrl(f), pic: frame(f, f.at, 250), ref: f })),
    ...added.map(t => ({ g: 'Films', title: t.title, more: [t.directors.map(d => d.name).join(' '), t.year, t.type, t.genres.join(' '), t.desc].join(' '), sub: `${t.directors.map(d => d.name).join(', ')} · ${t.year} · ${t.type}`, href: 'title.html?id=' + encodeURIComponent(t.id), pic: t.poster, added: t })),
    ...Object.values(who).map(p => ({ g: 'People', title: p.name, more: [p.role, p.chain && p.chain.ens, p.chain && p.chain.address].join(' '), sub: p.role, href: artistUrl(p.name), person: p.name })),
    ...studios.map(s => ({ g: 'Studios', title: s.name, more: [s.type, s.place, s.about].join(' '), sub: [s.type, s.place].filter(Boolean).join(' · '), href: 'studio.html?s=' + s.slug, studio: s })),
    ...CATEGORIES.map(([slug, label]) => ({ g: 'Categories', title: label, more: '', sub: 'Category', href: 'category.html?c=' + slug })),
    ...MARKET.map(it => ({ g: 'Marketplace', title: it.title, more: [it.by, it.cat, it.sub, it.desc, it.specs && it.specs.Tags, it.film && film[it.film] && film[it.film].title].join(' '), sub: `${it.sub || it.cat} · ${it.price ? '$' + it.price : 'Free'}`, href: itemUrl(it), pic: it.kind === 'merch' ? '' : it.pic, ref: it })),
  ].map(x => ({ ...x, t: fold(x.title), m: fold(x.more) }));
  const GROUPS = ['Films', 'People', 'Studios', 'Categories', 'Marketplace'];

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
  const thumb = x => x.person ? avatar(x.person) : x.studio ? `<span class="clogo" style="background:${tone(x.title)}">${initials(x.title)}</span>` : x.pic ? `<img class="sthumb" src="${x.pic}" alt="">` : `<span class="sthumb blank">${x.g === 'Categories' ? '#' : x.ref && x.ref.kind === 'merch' ? '◆' : '♪'}</span>`;

  /* ---------- suggestions under the box ---------- */
  const form = $('.search'), input = form && $('input', form);
  if (form) {
    input.placeholder = 'Search films, people, studios, footage, music';
    input.setAttribute('autocomplete', 'off');
    if (page === 'search') input.value = param('q') || '';
    form.insertAdjacentHTML('beforeend', '<div class="suggest" hidden></div>');
    const box = $('.suggest', form); let at = -1;
    const go = q => { if (q.trim()) location.href = 'search.html?q=' + encodeURIComponent(q.trim()); };
    const draw = () => {
      const q = input.value, hits = find(q); at = -1;
      if (!q.trim()) { box.hidden = true; return; }
      const rows = GROUPS.flatMap(g => { const list = hits.filter(x => x.g === g).slice(0, g === 'Marketplace' ? 4 : 3); return list.length ? [`<p class="sg-h">${g}</p>`, ...list.map(x => `<a class="sg" href="${x.href}">${thumb(x)}<span><b>${mark(x.title, q)}</b><small>${esc(x.sub)}</small></span></a>`)] : []; });
      box.innerHTML = (rows.join('') || `<p class="sg-none">Nothing found for “${esc(q)}”</p>`) + (hits.length ? `<a class="sg all" href="search.html?q=${encodeURIComponent(q.trim())}">${hits.length === 1 ? 'See the result' : `See all ${hits.length} results`} <span>↵</span></a>` : '');
      box.hidden = false;
    };
    input.addEventListener('input', draw);
    input.addEventListener('focus', draw);
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
      People: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      Studios: x => `<a class="castp" href="${x.href}">${thumb(x)}<span><b>${esc(x.title)}</b><span class="muted small">${esc(x.sub)}</span></span></a>`,
      Categories: x => `<a class="chip" href="${x.href}">${esc(x.title)}</a>`,
      Marketplace: x => cards.assets(x.ref),
    };
    const wrap = { Films: 'grid', People: 'cf-people', Studios: 'cf-people', Categories: 'cf-chips', Marketplace: 'grid' };
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
  }
})();
