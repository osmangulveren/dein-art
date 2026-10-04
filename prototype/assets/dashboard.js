/* The creator's dashboard: what you released and shared, how it is doing, and where the money went.
   Logged in with a wallet, it shows that wallet's own things: what it shared, the credits it added, and the real counts
   of views and downloads kept by the site. Payments are not live, so there is no money to show yet, and it says so.
   Without a wallet it shows the sample account (Georges Méliès): money figures are examples and are marked as such;
   views and downloads are still the real counts. */

(() => {
  const root = $('[data-dash]'); if (!root) return;
  const me = sessionNow(), demo = !me, name = demo ? ME : null;
  const fmt = n => Number(n || 0).toLocaleString('en-US'), usd = n => '$' + fmt(Math.round(n));
  const eg = '<span class="eg" title="An example figure: nothing is charged in the prototype">example</span>', live = '<span class="eg live" title="Counted by the site for everyone">counted</span>';
  // the same key the item page counts downloads under
  const dlKey = id => { let h = 2166136261; for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; return 'dl-' + h.toString(36); };
  async function counts(ids) {
    const out = {};
    for (let i = 0; i < ids.length; i += 60) { try { const r = await fetch('/api/views?ids=' + ids.slice(i, i + 60).join(',')); if (r.ok) Object.assign(out, await r.json()); } catch {} }
    return out;
  }
  const spark = values => { const max = Math.max(...values, 1), pts = values.map((v, i) => `${(i / (values.length - 1 || 1) * 100).toFixed(1)},${(28 - v / max * 24).toFixed(1)}`).join(' ');
    return `<svg class="spark" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>`; };

  // the sample account's money: the same seven months its page shows, split by where it came from
  const MONTHS = [['May', 4120], ['Jun', 6380], ['Jul', 5240], ['Aug', 9810], ['Sep', 8460], ['Oct', 12900], ['Nov', 16880]];
  const SOURCES = [['Support and tips', .31, 'var(--accent)'], ['Marketplace', .44, 'var(--dot)'], ['Merch', .25, 'var(--ok)']];
  const CREW_SHARE = 123285 / 63790;       // what went to cast and crew for every dollar that went to the creator
  let span = 7;

  const films = demo ? filmsOf(who[ME]) : [];
  const myItems = () => (demo ? MARKET.filter(x => x.creator === ME || x.mine) : MARKET.filter(x => x.shared && x.owner === me.address));
  let viewsBy = {}, dlBy = {}, titles = [], claimed = null;

  function draw() {
    const months = MONTHS.slice(-span), mine = months.reduce((n, m) => n + m[1], 0), items = myItems();
    const views = films.reduce((n, f) => n + (viewsBy[f.key] || 0), 0), downloads = items.reduce((n, it) => n + (dlBy[dlKey(it.id)] || 0), 0);
    const weight = f => 1 + (f.secs % 7) + (viewsBy[f.key] || 0);                       // the sample films' share of the sample money
    const weights = films.reduce((n, f) => n + weight(f), 0) || 1;
    const todo = demo
      ? [['Log in with a wallet', false, '#', 'data-open-login'], ['Follow someone', following.size > 0, 'trending.html#artists'], ['Keep a film for later', watchlist.size > 0, 'index.html#films'], ['Add a credit', Object.keys(addedTitles).length > 0, 'add-credit.html'], ['Share an asset', MARKET.some(x => x.mine), 'share-asset.html']]
      : [['Claim your page', claimed === true, `artist.html?wallet=${me.address}`], ['Add a credit', titles.length > 0, 'add-credit.html'], ['Share an asset', items.length > 0, 'share-asset.html'],
         ['Tell people who you are', !!localStorage.getItem('edits:' + me.address), `artist.html?wallet=${me.address}`], ['Follow someone', following.size > 0, 'trending.html#artists']];
    const done = todo.filter(t => t[1]).length;
    const activity = demo
      ? [['A viewer sent $10 for A Trip to the Moon', '$9.00 split across four people', '2 hours ago'], ['The 1902 poster, reprinted was ordered', 'Printed and shipped for you', 'Yesterday'], ['Lucien Tainguy was paid $1.26', 'His 14% of a $10 support', 'Yesterday'],
         ['A Trip to the Moon passed 1,000 views this week', '', '3 days ago'], ['The Impossible Voyage tote was ordered', 'Printed and shipped for you', '5 days ago']]
      : [...items.map(it => [`You shared ${it.title}`, `${it.cat} · ${it.price ? '$' + it.price : 'Free'}`, it.added, itemUrl(it)]), ...titles.map(t => [`You added the credit ${t.title}`, `${t.role || 'Credit'} · ${t.year}`, new Date(t.at).toISOString().slice(0, 10), 'title.html?id=' + encodeURIComponent(t.id)])]
          .sort((x, y) => String(y[2]).localeCompare(String(x[2]))).slice(0, 6);

    root.innerHTML = `
      <header class="dashhead">
        <div><p class="cf-where">${demo ? 'Sample dashboard' : 'Your dashboard'}</p><h1>${demo ? esc(ME) : ensTag(me.address, '')}</h1>
          <p class="muted">${demo ? 'This is the sample account. Money figures are examples, and marked so. Views and downloads are counted for real. <button class="link" data-open-login>Log in with a wallet</button> to see your own.'
            : 'What you shared and added, with the counts the site keeps for everyone. Payments are not live yet, so there is no money to show.'}</p></div>
        <div class="dashacts">${demo ? `<div class="chips">${[[7, '7 months'], [3, '3 months'], [1, 'This month']].map(([n, l]) => `<button class="chip${span === n ? ' on' : ''}" data-span="${n}">${l}</button>`).join('')}</div>` : ''}
          <a class="btn primary" href="upload.html">+ Create</a></div>
      </header>

      <section class="kpis">
        ${demo ? `<div class="kpi"><span>Your share ${eg}</span><b>${usd(mine)}</b><small>${months.length === 1 ? months[0][0] : months[0][0] + ' to ' + months[months.length - 1][0]}</small>${spark(MONTHS.map(m => m[1]))}</div>
          <div class="kpi"><span>Paid to cast and crew ${eg}</span><b>${usd(mine * CREW_SHARE)}</b><small>Split automatically, the moment it came in</small>${spark(MONTHS.map(m => m[1] * CREW_SHARE))}</div>`
          : `<div class="kpi"><span>Your share</span><b>$0</b><small>Payments are not live yet</small></div>
          <div class="kpi"><span>Credits added</span><b>${fmt(titles.length)}</b><small>${titles.length ? 'On your page, for everyone' : 'Titles you worked on'}</small></div>`}
        <div class="kpi"><span>${demo ? 'Views of your films' : 'Things you shared'} ${demo ? live : ''}</span><b>${demo ? fmt(views) : fmt(items.length)}</b><small>${demo ? `${films.length} films` : items.length ? 'In the marketplace' : 'Nothing yet'}</small></div>
        <div class="kpi"><span>Downloads ${live}</span><b>${fmt(downloads)}</b><small>${items.length} ${items.length === 1 ? 'item' : 'items'} in the marketplace</small></div>
      </section>

      <div class="dashgrid">
        <div class="dashmain">
          ${demo ? `<section class="panel"><div class="panelhead"><h2>Where it came from ${eg}</h2><div class="legend">${SOURCES.map(([l, , c]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div></div>
            <div class="bars">${months.map(([m, v]) => `<div class="barcol"><em>${usd(v)}</em><div class="bar" style="height:${Math.max(6, v / Math.max(...months.map(x => x[1])) * 100)}%">${SOURCES.map(([l, k, c]) => `<i style="flex:${k};background:${c}" title="${l}: ${usd(v * k)}"></i>`).join('')}</div><span>${m}</span></div>`).join('')}</div></section>` : ''}

          <section class="panel"><div class="panelhead"><h2>Films</h2>${films.length ? `<span class="muted small">${films.length}</span>` : ''}</div>
            ${films.length ? `<div class="dtable"><div class="drow dhead"><span>Film</span><span>Views ${live}</span><span>Your share ${eg}</span><span></span></div>
              ${[...films].sort((x, y) => (viewsBy[y.key] || 0) - (viewsBy[x.key] || 0)).slice(0, 8).map(f => `<a class="drow" href="${watchUrl(f)}"><span class="dname"><img src="${frame(f, f.at, 250)}" alt="" loading="lazy"><span><b>${esc(f.title)}</b><small>${f.year} · ${f.dur}</small></span></span>
                <span>${fmt(viewsBy[f.key] || 0)}</span><span>${usd(mine * weight(f) / weights)}</span><span class="dgo">Open →</span></a>`).join('')}</div>`
              : `<div class="dempty"><b>No films yet</b><p>Releasing a film takes five short steps. Films themselves are not stored on the site yet; credits and marketplace files are.</p><a class="btn" href="release.html">Release a film</a></div>`}</section>

          <section class="panel"><div class="panelhead"><h2>In the marketplace</h2>${items.length ? `<a class="link" href="share-asset.html">Share another</a>` : ''}</div>
            ${items.length ? `<div class="dtable"><div class="drow dhead"><span>Item</span><span>Downloads ${live}</span><span>Price</span><span></span></div>
              ${[...items].sort((x, y) => (dlBy[dlKey(y.id)] || 0) - (dlBy[dlKey(x.id)] || 0)).slice(0, 10).map(it => `<a class="drow" href="${itemUrl(it)}"><span class="dname">${it.kind === 'merch' ? `<span class="dthumb">${mockup(it)}</span>` : it.pic ? `<img src="${esc(it.pic)}" alt="" loading="lazy">` : '<span class="dthumb snd">♪</span>'}<span><b>${esc(it.title)}</b><small>${esc(it.cat)} · ${esc(it.sub || '')}</small></span></span>
                <span>${it.price ? '—' : fmt(dlBy[dlKey(it.id)] || 0)}</span><span>${it.price ? '$' + it.price : 'Free'}</span><span class="dgo">Open →</span></a>`).join('')}</div>`
              : `<div class="dempty"><b>Nothing shared yet</b><p>Footage, music, sound, photos, scripts, templates: free or paid, stored on the site for everyone.</p><a class="btn" href="share-asset.html">Share an asset</a></div>`}</section>
        </div>

        <aside class="dashside">
          ${demo ? `<section class="panel"><h2>Where it went ${eg}</h2><div class="ring" style="--p:${(1 / (1 + CREW_SHARE) * 100).toFixed(1)}"><b>${Math.round(1 / (1 + CREW_SHARE) * 100)}%</b><span>yours</span></div>
            <div class="ringlegend"><span><i style="background:var(--accent)"></i>You<b>${usd(mine)}</b></span><span><i style="background:var(--dot)"></i>Cast and crew<b>${usd(mine * CREW_SHARE)}</b></span></div>
            <p class="muted small">Every payment is split the moment it arrives. Nobody sends an invoice.</p></section>` : ''}
          <section class="panel"><div class="panelhead"><h2>Next steps</h2><span class="muted small">${done} of ${todo.length}</span></div><div class="cf-meter"><i style="width:${done / todo.length * 100}%"></i></div>
            <ul class="cf-need">${todo.map(([label, ok, href, attr]) => `<li class="${ok ? 'ok' : ''}"><a href="${href}"${attr ? ' ' + attr : ''}>${label}</a></li>`).join('')}</ul></section>
          <section class="panel"><h2>Getting paid</h2><p class="payline">${demo ? `<span class="mono">0x41c7…9ae</span> ${eg}` : `${ensTag(me.address)} ${copyBtn(me.address)}`}</p>
            <p class="muted small">${demo ? 'A wallet is enough to be paid anywhere in the world. Each person on a crew chooses their own.' : 'Payments are not live yet. When they are, your share of everything arrives at this wallet, with no bank account needed.'}</p></section>
          <section class="panel"><h2>${demo ? `Lately ${eg}` : 'Lately'}</h2>
            ${activity.length ? `<ul class="feed">${activity.map(([what, more_, when, href]) => `<li>${href ? `<a href="${href}">` : '<span>'}<b>${esc(what)}</b>${more_ ? `<small>${esc(more_)}</small>` : ''}${href ? '</a>' : '</span>'}<time>${esc(when)}</time></li>`).join('')}</ul>` : '<p class="muted small">Nothing yet. What you share and add shows up here.</p>'}</section>
        </aside>
      </div>`;
  }
  root.addEventListener('click', e => { const b = e.target.closest('[data-span]'); if (b) { span = Number(b.dataset.span); draw(); } });
  draw();
  // the real counts, and what the site holds for this wallet, arrive after the page
  counts(films.map(f => f.key)).then(v => { viewsBy = v; draw(); });
  SHARED.then(() => counts(myItems().map(it => dlKey(it.id)))).then(d => { dlBy = d; draw(); });
  if (!demo) {
    TITLES.then(list => { titles = list.filter(t => t.owner === me.address); draw(); });
    fetch('/api/claims?address=' + me.address).then(r => (r.ok ? r.json() : {})).then(c => { claimed = !!c.claimed; draw(); }).catch(() => {});
  }
})();
