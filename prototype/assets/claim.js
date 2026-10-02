/* An on-chain artist's page, and claiming it.
   The page is built from public records. Whoever holds the wallet that created the work can claim the page by signing
   a message with it: no transaction, no gas. The signature is checked here in the browser against the wallet on record.
   This is a prototype without a server, so a claim is remembered on this device only. */

const artist = subject.chain;
if (artist) {
const put = (key, html) => $$(`[data-w="${key}"]`).forEach(el => { el.innerHTML = html; });
const scan = c => c.chain === 'Arbitrum' ? 'https://arbiscan.io' : 'https://etherscan.io';

put('count', `${artist.collections.length} on record`);
put('collections', artist.collections.map(c => `
  <div class="chainset">
    <div class="chainhead">
      <div><b>${c.name}</b><span class="muted small">${c.minted.toLocaleString('en-US')} of ${c.max.toLocaleString('en-US')} minted · ${c.chain} · ${c.date.slice(0, 4)}${c.cc0 ? ' · CC0' : ''}</span></div>
      <a class="link" href="${scan(c)}/address/${c.contract}" target="_blank" rel="noopener">Contract</a>
    </div>
    ${c.tokens.length ? `<div class="grid tokens">${c.tokens.map(t => `<a class="card" href="${t.live}" target="_blank" rel="noopener"><div class="thumb sq"><img src="${t.img}" alt="" loading="lazy"></div><p>#${t.n}</p></a>`).join('')}</div>`
      : `<p class="muted small">${c.cc0 ? 'Images for this chain are not loaded in the prototype.' : 'Not released under CC0, so no images are shown here.'}</p>`}
  </div>`).join(''));
/* ---------- the claim ---------- */

const claims = () => { try { return JSON.parse(localStorage.getItem('claims')) || {}; } catch { return {}; } };
const save = all => { try { localStorage.setItem('claims', JSON.stringify(all)); } catch {} };
// A stored claim counts only if its signature still recovers the artist's wallet.
const proven = () => {
  const c = claims()[artist.address];
  try { return c && c.message.includes(artist.address) && ethers.verifyMessage(c.message, c.signature).toLowerCase() === artist.address.toLowerCase() ? c : null; } catch { return null; }
};
const messageFor = () => [
  'dein.art: claim this artist page', '',
  `Artist: ${artist.name}`,
  `Wallet: ${artist.address}`,
  `Page: ${location.origin}${location.pathname}?name=${encodeURIComponent(artist.name)}`,
  `Nonce: ${[...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('')}`,
  `Issued: ${new Date().toISOString()}`, '',
  'Signing this message is free. It does not send a transaction and gives no access to your funds.',
].join('\n');

function draw(note = '', tone = '') {
  const c = proven();
  put('status', c ? '<b class="ok">✓ Claimed</b>' : '<b>Unclaimed</b>');
  put('claim', c ? `
    <div class="claimbox claimed">
      <div><h2>This page is claimed</h2>
      <p>The message below was signed by <span class="mono">${short(artist.address)}</span>, the wallet that created these collections. The signature was checked in this browser.</p>
      <p class="muted small">From here the artist would edit the page, publish new work and set how earnings are shared. In this prototype the claim is remembered on this device only.</p></div>
      <div class="claimacts"><a class="btn primary" href="upload.html">Publish something</a><button class="btn" data-release>Release the claim</button></div>
      <details class="fold" style="margin-top:14px"><summary><span><b>Proof</b><span class="muted small">The signed message and its signature</span></span></summary>
        <pre class="proofbox">${esc(c.message)}\n\nSignature: ${c.signature}</pre></details>
    </div>` : `
    <div class="claimbox">
      <div><h2>Is this you? Claim this page</h2>
      <p>This page was built from public blockchain records and belongs to nobody yet. Sign one message with <span class="mono">${short(artist.address)}</span> and it is yours. It is free and it is not a transaction.</p>
      ${note ? `<p class="claimnote ${tone}">${note}</p>` : ''}</div>
      <div class="claimacts"><button class="btn primary" data-claim>Claim with wallet</button></div>
    </div>`);
}

async function claim() {
  if (!window.ethereum) return draw('No wallet was found in this browser. Open this page in a browser with a wallet such as MetaMask or Rabby, or in your wallet app\'s browser.', 'bad');
  try {
    draw('Waiting for your wallet…');
    const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (account.toLowerCase() !== artist.address.toLowerCase())
      return draw(`The connected wallet is <span class="mono">${short(account)}</span>. This page can only be claimed by <span class="mono">${short(artist.address)}</span>, the wallet that created the work.`, 'bad');
    const message = messageFor();
    draw('Check your wallet and sign the message.');
    const signature = await window.ethereum.request({ method: 'personal_sign', params: [ethers.hexlify(ethers.toUtf8Bytes(message)), account] });
    if (ethers.verifyMessage(message, signature).toLowerCase() !== artist.address.toLowerCase())
      return draw('The signature does not match the wallet on record, so the page stays unclaimed.', 'bad');
    save({ ...claims(), [artist.address]: { message, signature } });
    draw();
  } catch (e) {
    draw(e && e.code === 4001 ? 'You cancelled the request in your wallet. Nothing was signed.' : 'The wallet did not complete the request. Nothing was signed.', 'bad');
  }
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-claim]')) claim();
  if (e.target.closest('[data-release]')) { const all = claims(); delete all[artist.address]; save(all); draw(); }
});
draw();
}
