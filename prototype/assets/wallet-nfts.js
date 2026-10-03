/* Every NFT a wallet holds, with its token metadata, read live from the chain.
   The data comes from Blockscout, an open-source Ethereum explorer with a public API that needs no key.
   (Etherscan has the same data but its API requires a personal key, which a public web page cannot keep secret.) */

const holder = subject.chain;
if (holder) {
  const API = 'https://eth.blockscout.com/api/v2';
  const box = key => $(`[data-nft="${key}"]`);
  const gateway = u => !u ? '' : u.startsWith('ipfs://') ? 'https://ipfs.io/ipfs/' + u.slice(7).replace(/^ipfs\//, '') : u.startsWith('ar://') ? 'https://arweave.net/' + u.slice(5) : u;
  const isVideo = u => /\.(mp4|webm|mov)(\?|$)/i.test(u || '');
  const items = [], seen = new Set();
  let next = null, hidden = 0, loading = false, started = false, showAll = false;

  // A token is shown when it carries a name or an image; airdropped spam usually has neither.
  const useful = it => !!(it.image_url || it.media_url || it.animation_url || it.metadata?.name);
  const nameOf = it => it.metadata?.name || `${it.token?.name || 'Token'} #${it.id}`;
  const picOf = it => gateway(it.thumbnails?.['500x500'] || it.thumbnails?.original || it.image_url || (!isVideo(it.media_url) ? it.media_url : '') || it.metadata?.image || '');
  const card = (it, i) => {
    const pic = picOf(it), vid = !pic && gateway(it.animation_url || it.media_url);
    return `<button class="card" data-nft-open="${i}"><div class="thumb sq ${pic || vid ? '' : 'typo'}">${pic ? `<img src="${esc(pic)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : vid && isVideo(vid) ? `<video src="${esc(vid)}" muted loop playsinline preload="metadata"></video>` : `<span>${esc(nameOf(it))}</span>`}<span class="badge kind">${esc(it.token_type || it.token?.type || '')}</span></div><h3>${esc(nameOf(it))}</h3><p>${esc(it.token?.name || 'Unnamed collection')}</p></button>`;
  };

  function draw() {
    const shown = items.filter(it => showAll || useful(it));
    const groups = {};
    shown.forEach(it => { (groups[it.token?.address_hash || '?'] ||= []).push(it); });
    box('count').textContent = `${items.length}${next ? '+' : ''} tokens · ${Object.keys(groups).length} collections`;
    box('note').innerHTML = `Read live from the public chain via <a class="link" href="https://eth.blockscout.com/address/${holder.address}?tab=token_transfers" target="_blank" rel="noopener">Blockscout</a>. Names, images and descriptions are each token's own metadata.${hidden && !showAll ? ` ${hidden} tokens without a name or image are hidden. <button class="linkbtn" data-nft-all>Show them</button>` : ''}`;
    box('list').innerHTML = shown.length ? Object.values(groups).map(g => `
      <div class="chainhead" style="margin-top:26px"><div><b>${esc(g[0].token?.name || 'Unnamed collection')}</b><span class="muted small">${g.length} ${g.length === 1 ? 'token' : 'tokens'} · ${esc(g[0].token_type || '')} · <span class="mono">${short(g[0].token?.address_hash || '')}</span></span></div>
        <a class="link" href="https://etherscan.io/address/${g[0].token?.address_hash}" target="_blank" rel="noopener">Contract</a></div>
      <div class="grid tokens">${g.map(it => card(it, items.indexOf(it))).join('')}</div>`).join('')
      : `<p class="muted empty">${loading ? 'Reading the chain…' : 'This wallet holds no NFTs on Ethereum.'}</p>`;
    box('more').hidden = !next;
  }

  async function load() {
    if (loading) return;
    loading = true; box('more').querySelector('button').textContent = 'Loading…'; if (!items.length) draw();
    try {
      const q = new URLSearchParams({ type: 'ERC-721,ERC-1155,ERC-404', ...(next || {}) });
      const r = await fetch(`${API}/addresses/${holder.address}/nft?${q}`);
      if (!r.ok) throw new Error(r.status);
      const d = await r.json();
      for (const it of d.items || []) {
        const key = `${it.token?.address_hash}:${it.id}`;
        if (seen.has(key)) continue;
        seen.add(key); items.push(it); if (!useful(it)) hidden++;
      }
      next = d.next_page_params || null;
    } catch {
      box('note').innerHTML = 'The explorer did not answer. <button class="linkbtn" data-nft-retry>Try again</button>';
      loading = false; return;
    }
    loading = false; box('more').querySelector('button').textContent = 'Load more'; draw();
  }

  // Token images live on many hosts and some are gone. Try a second IPFS gateway, then fall back to the token's name.
  document.addEventListener('error', e => {
    const img = e.target;
    if (img.tagName !== 'IMG' || !img.closest('[data-panel="wallet"], #token')) return;
    if (img.src.includes('://ipfs.io/ipfs/') && !img.dataset.retried) { img.dataset.retried = 1; img.src = img.src.replace('://ipfs.io/ipfs/', '://dweb.link/ipfs/'); return; }
    const t = img.closest('.thumb');
    if (t) { t.classList.add('typo'); img.replaceWith(Object.assign(document.createElement('span'), { textContent: t.closest('.card')?.querySelector('h3')?.textContent || '' })); }
    else img.remove();
  }, true);

  // The tab loads when it is first opened, so the rest of the page does not wait for it.
  const start = () => { if (!started) { started = true; load(); } };
  document.addEventListener('click', e => {
    if (e.target.closest('.tab[data-tab="wallet"]')) start();
    if (e.target.closest('[data-nft="more"] button')) load();
    if (e.target.closest('[data-nft-all]')) { showAll = true; draw(); }
    if (e.target.closest('[data-nft-retry]')) load();
    const open = e.target.closest('[data-nft-open]');
    if (open) show(Number(open.dataset.nftOpen));
  });
  if (location.hash === '#wallet') start();

  /* ---------- one token's metadata, in a pop-up ---------- */
  document.body.insertAdjacentHTML('beforeend', '<dialog id="token" class="assetbox"></dialog>');
  const dlg = $('#token');
  function show(i) {
    const it = items[i], m = it.metadata || {}, c = it.token?.address_hash, pic = picOf(it), vid = gateway(it.animation_url || (isVideo(it.media_url) ? it.media_url : ''));
    const attrs = Array.isArray(m.attributes) ? m.attributes.filter(a => a && a.value !== undefined).slice(0, 30) : [];
    const facts = [['Collection', esc(it.token?.name || 'Unnamed')], ['Token ID', `<span class="mono">${esc(String(it.id).length > 18 ? String(it.id).slice(0, 8) + '…' + String(it.id).slice(-6) : it.id)}</span>`], ['Standard', esc(it.token_type || '')],
      ['Contract', `<a class="link mono" href="https://etherscan.io/address/${c}" target="_blank" rel="noopener">${short(c || '')}</a>`], ['Holders of the collection', it.token?.holders_count && Number(it.token.holders_count).toLocaleString('en-US')], ['Supply', it.token?.total_supply && Number(it.token.total_supply).toLocaleString('en-US')]];
    dlg.dataset.at = i;
    dlg.innerHTML = `
      <div class="assetmedia">${vid && isVideo(vid) ? `<video src="${esc(vid)}" controls autoplay muted loop playsinline poster="${esc(pic)}"></video>` : pic ? `<img src="${esc(gateway(it.image_url || pic))}" alt="" referrerpolicy="no-referrer">` : `<div class="thumb sq typo" style="width:70%"><span>${esc(nameOf(it))}</span></div>`}
        <button class="btn icon nav prev" data-tstep="-1" aria-label="Previous token">‹</button><button class="btn icon nav next" data-tstep="1" aria-label="Next token">›</button></div>
      <div class="assetinfo">
        <span class="pill tint">${esc(it.token_type || 'NFT')}</span>
        <h2>${esc(nameOf(it))}</h2>
        ${m.description ? `<p class="muted tokendesc">${esc(String(m.description).slice(0, 600))}${String(m.description).length > 600 ? '…' : ''}</p>` : ''}
        <dl class="facts">${facts.filter(r => r[1]).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
        ${attrs.length ? `<div class="traits">${attrs.map(a => `<span><small>${esc(a.trait_type ?? '')}</small>${esc(typeof a.value === 'object' ? JSON.stringify(a.value) : a.value)}</span>`).join('')}</div>` : ''}
        <div class="assetacts"><a class="btn primary" href="https://etherscan.io/nft/${c}/${it.id}" target="_blank" rel="noopener">Etherscan ↗</a><a class="btn" href="https://eth.blockscout.com/token/${c}/instance/${it.id}" target="_blank" rel="noopener">Blockscout ↗</a>${it.external_app_url ? `<a class="btn" href="${esc(it.external_app_url)}" target="_blank" rel="noopener">Project ↗</a>` : ''}</div>
        <details class="fold"><summary><span><b>Raw metadata</b><span class="muted small">As stored for this token</span></span></summary><pre class="proofbox">${esc(JSON.stringify(m, null, 2)).slice(0, 6000)}</pre></details>
        <button class="btn wide" data-close>Close</button>
      </div>`;
    if (!dlg.open) dlg.showModal();
  }
  document.addEventListener('click', e => { const s = e.target.closest('#token [data-tstep]'); if (s) show((Number(dlg.dataset.at) + Number(s.dataset.tstep) + items.length) % items.length); });
  dlg.addEventListener('close', () => { dlg.innerHTML = ''; });
}
