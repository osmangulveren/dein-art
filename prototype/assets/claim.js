/* An on-chain artist's page, and claiming it.
   Whoever holds the wallet on record claims the page from that wallet.
   With the claims contract deployed (assets/claims-contract.js), the claim is a transaction on the Sepolia testnet:
   public, permanent and visible to everyone, paid with free test ETH. Before it is deployed, the wallet signs a message
   instead, which is checked in this browser and remembered on this device only. */

const artist = subject.chain;
if (artist) {
const put = (key, html) => $$(`[data-w="${key}"]`).forEach(el => { el.innerHTML = html; });

put('count', `${artist.collections.length} ${artist.collections.length === 1 ? 'collection' : 'collections'}`);
put('collections', artist.collections.length ? `<div class="grid shelf colls">${artist.collections.map(x => collCard(artist, x)).join('')}</div>` : '<p class="muted empty">No collections on record for this wallet yet.</p>');

const contractAt = (() => { try { return CLAIMS.address || localStorage.getItem('claimsAddress') || ''; } catch { return CLAIMS.address; } })();
const onchain = !!contractAt;
const pageUrl = `${location.origin}${location.pathname}?${artist.listed === false ? 'wallet=' + artist.address : 'name=' + encodeURIComponent(artist.name)}`;
const same = (a, b) => a.toLowerCase() === b.toLowerCase();
const noWallet = 'No wallet was found in this browser. Open this page in a browser with a wallet such as MetaMask or Rabby, or in your wallet app\'s browser.';
const wrongWallet = account => `The connected wallet is <span class="mono">${short(account)}</span>. This page can only be claimed by <span class="mono">${short(artist.address)}</span>, the wallet on record.`;
const scanTx = h => `${CLAIMS.explorer}/tx/${h}`;

/* ---------- the claim as a signed message, kept on this device (before the contract is deployed) ---------- */

const claims = () => { try { return JSON.parse(localStorage.getItem('claims')) || {}; } catch { return {}; } };
const save = all => { try { localStorage.setItem('claims', JSON.stringify(all)); } catch {} };
// A stored claim counts only if its signature still recovers the artist's wallet.
const proven = () => {
  const c = claims()[artist.address];
  try { return c && c.message.includes(artist.address) && same(ethers.verifyMessage(c.message, c.signature), artist.address) ? c : null; } catch { return null; }
};
const messageFor = () => [
  'dein.art: claim this artist page', '',
  `Artist: ${artist.name}`,
  `Wallet: ${artist.address}`,
  `Page: ${pageUrl}`,
  `Nonce: ${[...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('')}`,
  `Issued: ${new Date().toISOString()}`, '',
  'Signing this message is free. It does not send a transaction and gives no access to your funds.',
].join('\n');

/* ---------- the claim as a transaction on Sepolia ---------- */

// localStorage 'claimsRpc' points reads at another node, e.g. a local test chain during development
const rpc = (() => { try { return localStorage.getItem('claimsRpc'); } catch { return null; } })() || CLAIMS.rpc;
const reader = () => new ethers.Contract(contractAt, CLAIMS.abi, new ethers.JsonRpcProvider(rpc, CLAIMS.chainId, { staticNetwork: true }));
let record = null;   // { at: Date, tx } once read from the chain
async function readChain() {
  try {
    const at = await reader().claimedAt(artist.address);
    record = at > 0n ? { at: new Date(Number(at) * 1000), tx: record?.tx } : null;
  } catch { record = record || null; }
}
async function sepolia() {
  const id = '0x' + CLAIMS.chainId.toString(16);
  try { await window.ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: id }] }); }
  catch (e) {
    if (e.code !== 4902) throw e;
    await window.ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: id, chainName: 'Sepolia', nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: [CLAIMS.rpc], blockExplorerUrls: [CLAIMS.explorer] }] });
  }
  return new ethers.BrowserProvider(window.ethereum).getSigner();
}

/* ---------- drawing the box ---------- */

function draw(note = '', tone = '') {
  const signed = !onchain && proven(), done = onchain ? record : signed;
  put('status', done ? '<b class="ok">✓ Claimed</b>' : '<b>Unclaimed</b>');
  const noteHtml = note ? `<p class="claimnote ${tone}">${note}</p>` : '';
  if (done && onchain) return put('claim', `
    <div class="claimbox claimed">
      <div><h2>This page is claimed</h2>
      <p>Claimed on ${record.at.toISOString().slice(0, 10)} by <span class="mono">${short(artist.address)}</span>, recorded on the Sepolia testnet. Anyone, on any device, sees the same record.</p>
      <p class="muted small">Test network: the record is real and public, the ETH used is not. ${record.tx ? `<a class="link" href="${scanTx(record.tx)}" target="_blank" rel="noopener">See the transaction</a> · ` : ''}<a class="link" href="${CLAIMS.explorer}/address/${contractAt}" target="_blank" rel="noopener">See the contract</a></p>
      ${noteHtml}</div>
      <div class="claimacts"><a class="btn primary" href="upload.html">Publish something</a><button class="btn" data-release>Release the claim</button></div>
    </div>`);
  if (done) return put('claim', `
    <div class="claimbox claimed">
      <div><h2>This page is claimed</h2>
      <p>The message below was signed by <span class="mono">${short(artist.address)}</span>, the wallet on record. The signature was checked in this browser.</p>
      <p class="muted small">From here the artist would edit the page, publish new work and set how earnings are shared. Until the claims contract is deployed, a claim is remembered on this device only.</p></div>
      <div class="claimacts"><a class="btn primary" href="upload.html">Publish something</a><button class="btn" data-release>Release the claim</button></div>
      <details class="fold" style="margin-top:14px"><summary><span><b>Proof</b><span class="muted small">The signed message and its signature</span></span></summary>
        <pre class="proofbox">${esc(signed.message)}\n\nSignature: ${signed.signature}</pre></details>
    </div>`);
  put('claim', `
    <div class="claimbox">
      <div><h2>Is this you? Claim this page</h2>
      <p>This page was built from public blockchain records and belongs to nobody yet. ${onchain
        ? `Claim it from <span class="mono">${short(artist.address)}</span> and the claim is recorded on the Sepolia testnet, where anyone can see it. It costs a little test ETH, which is free.`
        : `Sign one message with <span class="mono">${short(artist.address)}</span> and it is yours. It is free and it is not a transaction.`}</p>
      ${noteHtml}</div>
      <div class="claimacts"><button class="btn primary" data-claim>Claim with wallet</button></div>
    </div>`);
}

async function claim() {
  if (!window.ethereum) return draw(noWallet, 'bad');
  try {
    draw('Waiting for your wallet…');
    const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!same(account, artist.address)) return draw(wrongWallet(account), 'bad');
    if (onchain) {
      const signer = await sepolia();
      draw('Confirm the transaction in your wallet.');
      const tx = await new ethers.Contract(contractAt, CLAIMS.abi, signer).claim(pageUrl);
      draw('Recording the claim on Sepolia… this takes about 15 seconds.');
      await tx.wait();
      record = { at: new Date(), tx: tx.hash };
      await readChain();
      return draw();
    }
    const message = messageFor();
    draw('Check your wallet and sign the message.');
    const signature = await window.ethereum.request({ method: 'personal_sign', params: [ethers.hexlify(ethers.toUtf8Bytes(message)), account] });
    if (!same(ethers.verifyMessage(message, signature), artist.address)) return draw('The signature does not match the wallet on record, so the page stays unclaimed.', 'bad');
    save({ ...claims(), [artist.address]: { message, signature } });
    draw();
  } catch (e) {
    const code = e?.code ?? e?.info?.error?.code;
    draw(code === 4001 || code === 'ACTION_REJECTED' ? 'You cancelled the request in your wallet. Nothing was recorded.'
      : code === 'INSUFFICIENT_FUNDS' || /insufficient funds/i.test(e?.message || '') ? 'This wallet has no Sepolia test ETH yet. Get some free from a Sepolia faucet, then try again.'
      : 'The wallet did not complete the request. Nothing was recorded.', 'bad');
  }
}
async function release() {
  if (!onchain) { const all = claims(); delete all[artist.address]; save(all); return draw(); }
  try {
    const [account] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!same(account, artist.address)) return draw(wrongWallet(account), 'bad');
    const tx = await new ethers.Contract(contractAt, CLAIMS.abi, await sepolia()).release();
    draw('Releasing the claim on Sepolia…');
    await tx.wait(); record = null; await readChain(); draw();
  } catch { draw('The wallet did not complete the request. The claim is unchanged.', 'bad'); }
}
document.addEventListener('click', e => {
  if (e.target.closest('[data-claim]')) claim();
  if (e.target.closest('[data-release]')) release();
});
draw();
if (onchain) readChain().then(() => draw());
}
