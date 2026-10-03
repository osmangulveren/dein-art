/* Studio pages: film studios, music studios, DAOs, art studios and galleries.
   A studio is a profile for an organisation: its releases, its members, and the same sections an artist has. */

const studioTone = s => ({ 'Film studio': '#2f6fed', 'Music studio': '#0d8a4f', DAO: '#d6454a', 'Art studio': '#101216', Gallery: '#c9772b' }[s.type] || '#5b4bff');
const studioLogo = (s, cls = '') => s.chain?.pieces?.[0] ? `<img class="slogo ${cls}" src="${s.chain.pieces[0].img}" alt="">` : `<span class="slogo ${cls}" style="background:${studioTone(s)}">${initials(s.name)}</span>`;
// what a studio has released on dein.art, and who worked on it
const releasesOf = s => s.company ? CATALOG.films.filter(f => (f.company || []).includes(s.company)) : [];
const musicOf = s => s.performer ? CATALOG.music.filter(m => (m.perf || '').includes(s.performer)) : [];
const artistOf = s => s.artist ? ONCHAIN.find(a => a.name === s.artist) : null;
const membersOf = s => {
  if (s.artist) return [s.artist];
  const count = {};
  releasesOf(s).forEach(f => f.crew.forEach(c => { if (who[c.name]) count[c.name] = (count[c.name] || 0) + 1; }));
  return Object.keys(count).sort((a, b) => count[b] - count[a]);
};
const studioCard = s => `<a class="channel" href="studio.html?s=${s.slug}">${studioLogo(s, 'sm')}<span class="info"><b>${esc(s.name)}</b><span class="muted small">${s.type} · ${releasesOf(s).length || musicOf(s).length || (artistOf(s)?.collections.length || (s.chain ? 1 : 0))} on dein.art${s.unclaimed ? ' · unclaimed' : ''}</span></span><span class="btn follow">Follow</span></a>`;

if (page === 'studios') {
  const types = ['All', ...new Set(STUDIOS.map(s => s.type)), 'Gallery'];
  const draw = t => {
    $('[data-s="chips"]').innerHTML = types.map(x => `<button class="chip${x === t ? ' on' : ''}" data-stype="${x}">${x === 'All' ? 'All' : x === 'Gallery' ? 'Galleries' : x + 's'}</button>`).join('');
    const list = STUDIOS.filter(s => t === 'All' || s.type === t);
    $('[data-s="list"]').innerHTML = list.length ? list.map(studioCard).join('') : `<p class="muted empty">No ${t === 'Gallery' ? 'galleries' : t.toLowerCase() + 's'} yet. A gallery gets a page here as soon as it joins.</p>`;
  };
  document.addEventListener('click', e => { const b = e.target.closest('[data-stype]'); if (b) draw(b.dataset.stype); });
  draw('All');
}

if (page === 'studio') {
  const s = STUDIOS.find(x => x.slug === param('s')) || STUDIOS[0];
  const put = (k, html) => $$(`[data-s="${k}"]`).forEach(el => { el.innerHTML = html; });
  const ext = (href, label) => `<a class="link" href="${href}" target="_blank" rel="noopener">${label}</a>`;
  const films = releasesOf(s), tracks = musicOf(s), artist = artistOf(s), members = membersOf(s);
  document.title = `${s.name} — dein.art`;
  put('logo', studioLogo(s, 'lg'));
  put('type', `${s.type}${s.unclaimed ? ' · unclaimed' : ''}`);
  put('name', esc(s.name));
  put('line', [s.place, s.founded && (s.until ? `${s.founded}–${s.until}` : `since ${s.founded}`)].filter(Boolean).join(' · '));
  put('about', esc(s.about));
  put('links', [s.site && ext(s.site, s.site.replace(/^https?:\/\/(www\.)?/, '')), s.wd && ext(`https://www.wikidata.org/wiki/${s.wd}`, 'Wikidata'), s.chain && ext(`https://etherscan.io/address/${s.chain.token}`, 'Token on Etherscan'), s.chain && ext(`https://etherscan.io/address/${s.chain.treasury}`, 'Treasury')].filter(Boolean).join(''));
  put('side', s.unclaimed ? '<span class="pop"><b>Unclaimed</b></span>' : '');
  put('facts', [['Type', s.type], ['Based in', s.place], ['Founded', s.founded], ['Closed', s.until],
    ['On dein.art', films.length ? `${films.length} ${films.length === 1 ? 'film' : 'films'}` : tracks.length ? `${tracks.length} recordings` : artist ? `${artist.collections.length} collections` : s.chain ? '1 collection' : ''],
    ['Members', s.chain ? `${s.chain.holders.toLocaleString('en-US')} holders of ${s.chain.supply.toLocaleString('en-US')} Nouns` : members.length || ''],
    ['Treasury', s.chain && `${s.chain.treasuryEth.toLocaleString('en-US')} ETH · ${ext(`https://etherscan.io/address/${s.chain.treasury}`, s.chain.treasuryName)} ${copyBtn(s.chain.treasury)}`]]
    .filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join(''));
  const people = members.slice(0, 6).map(n => cards.castp({ name: n, role: who[n]?.role || 'Member' })).join('');
  put('people', people || (s.chain ? `<p class="muted small">Anyone who holds a Noun is a member and has a vote. ${ext(`https://eth.blockscout.com/token/${s.chain.token}?tab=holders`, 'See the holders')}</p>` : '<p class="muted small">No members listed yet.</p>'));
  put('peopletitle', s.chain ? 'Members' : films.length ? 'People who made its films' : 'People');
  if (s.unclaimed) put('note', `<div class="claimbox" style="margin-bottom:26px"><div><h2>Is this your ${s.type === 'DAO' ? 'DAO' : s.type.toLowerCase()}? Claim this page</h2><p>This page was built from public records and ${esc(s.name)} has not joined dein.art. Its team can claim it to publish here, list members and share earnings with them.</p></div></div>`);
  // Releases
  const sec = (title, html) => `<div class="sec" style="margin-top:0"><h2>${title}</h2></div>${html}`;
  put('releases', films.length ? sec('Films', `<div class="grid">${films.map(cards.films).join('')}</div>`)
    : tracks.length ? sec('Recordings', `<div class="grid">${tracks.map(t => cards.assets({ ...t, kind: 'Music', creator: t.by, sub: t.perf })).join('')}</div>`)
    : artist ? sec('Collections', `<div class="grid shelf colls">${artist.collections.map(c => collCard(artist, c)).join('')}</div>`)
    : s.chain ? sec('Nouns', `<div class="grid tokens">${s.chain.pieces.map(p => `<a class="card" href="https://etherscan.io/nft/${s.chain.token}/${p.id}" target="_blank" rel="noopener"><div class="thumb sq"><img src="${p.img}" alt=""></div><p>${esc(p.name || 'Noun ' + p.id)}</p></a>`).join('')}</div>`)
    : '<p class="muted empty">Nothing released here yet.</p>');
  put('members', members.length ? `<div class="grid c3">${members.map(n => `<div class="channel">${avatar(n)}<a class="info" href="${artistUrl(n)}"><b>${esc(n)}</b><span class="muted small">${who[n]?.role || 'Member'}</span></a></div>`).join('')}</div>`
    : s.chain ? `<p class="muted empty">${s.chain.holders.toLocaleString('en-US')} wallets hold a Noun; each one is a member. ${ext(`https://eth.blockscout.com/token/${s.chain.token}?tab=holders`, 'See them on Blockscout')}</p>` : '<p class="muted empty">No members listed yet.</p>');
  const live = [...streams, ...more.live].filter(x => films.includes(film[x.key]));
  put('live', live.length ? live.map(cards.live).join('') : '<p class="muted empty">Not live right now.</p>');
  const stills = films.flatMap(f => f.scenes.slice(0, 2).map((_, i) => stillOf(f, i))).slice(0, 8);
  put('assets', stills.length ? stills.map(cards.assets).join('') : '<p class="muted empty">No assets shared yet.</p>');
  $$('[data-s-chain]').forEach(el => { el.hidden = !(artist || s.chain); });
  put('collections', artist ? `<div class="grid shelf colls">${artist.collections.map(c => collCard(artist, c)).join('')}</div>`
    : s.chain ? `<div class="chainhead"><div><b>${esc(s.chain.name)}</b><span class="muted small">${s.chain.supply.toLocaleString('en-US')} minted · ${s.chain.holders.toLocaleString('en-US')} holders · CC0 · art stored on-chain</span></div><a class="link" href="https://etherscan.io/address/${s.chain.token}" target="_blank" rel="noopener">Contract</a></div><div class="grid tokens">${s.chain.pieces.map(p => `<div class="card"><div class="thumb sq"><img src="${p.img}" alt=""></div><p>${esc(p.name || '')}</p></div>`).join('')}</div>` : '');
  fillViews();
}
