/* Money, for real, on a test network.

   A film released on dein.art has its split recorded in the DeinArtSplits contract on Sepolia, Ethereum's test network.
   Support sent to the film is paid out to its people in the same transaction, in their shares, minus one flat fee.
   Test ETH is free and worth nothing: this is the real mechanism with pretend money. The contract's address comes from
   the site (/api/config), where an admin wallet puts it after deploying (deploy.html). Reading needs no wallet. */

const PAY = (() => {
  // one copy of the ethers library, shared with the log-in code
  const ethersReady = () => window.__ethers || (window.__ethers = window.ethers ? Promise.resolve() : new Promise((ok, fail) => {
    document.head.append(Object.assign(document.createElement('script'), { src: 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js', crossOrigin: 'anonymous', onload: ok, onerror: fail }));
  }));
  let config, readerAt;
  const address = async () => {
    config = config || fetch('/api/config').then(r => (r.ok ? r.json() : {})).catch(() => ({}));
    const local = (() => { try { return localStorage.getItem('splitsAddress') || ''; } catch { return ''; } })();
    return (await config).splits || SPLITS.address || local;
  };
  const reader = async () => {
    await ethersReady(); const at = await address(); if (!at) return null;
    return readerAt || (readerAt = new ethers.Contract(at, SPLITS.abi, new ethers.JsonRpcProvider(SPLITS.rpc, SPLITS.chainId, { staticNetwork: true })));
  };
  // the visitor's own wallet, switched to the test network
  async function signer() {
    if (!window.ethereum) throw Object.assign(new Error('No wallet was found in this browser. Install MetaMask or Rabby, or open this page in your wallet app.'), { code: 'NO_WALLET' });
    await ethersReady();
    const [me] = await ethereum.request({ method: 'eth_requestAccounts' }), id = '0x' + SPLITS.chainId.toString(16);
    try { await ethereum.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: id }] }); }
    catch (e) { if (e.code !== 4902) throw e; await ethereum.request({ method: 'wallet_addEthereumChain', params: [{ chainId: id, chainName: 'Sepolia', nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 }, rpcUrls: [SPLITS.rpc], blockExplorerUrls: [SPLITS.explorer] }] }); }
    const s = await new ethers.BrowserProvider(window.ethereum).getSigner();
    return { me: me.toLowerCase(), signer: s, contract: new ethers.Contract(await address(), SPLITS.abi, s) };
  }
  const trim = v => { const [a, b = ''] = String(v).split('.'); const d = b.slice(0, 5).replace(/0+$/, ''); return d ? `${a}.${d}` : a; };
  const api = {
    address, ready: ethersReady,
    eth: wei => trim(ethers.formatEther(wei)),          // 1234500000000000n -> "0.00123"
    link: (kind, v) => `${SPLITS.explorer}/${kind}/${v}`,
    // The number a film has in the contract: its address here together with the wallet that released it, so nobody
    // can record a split for someone else's film.
    id: (key, owner) => ethers.solidityPackedKeccak256(['address', 'string'], [owner, key]),
    // who is paid from a film and what it has received; null when its split is not on the chain
    async split(key, owner) {
      const c = await reader(); if (!c) return null;
      const [owner_, payees, shares, received, times] = await c.splitOf(api.id(key, owner));
      if (owner_ === ethers.ZeroAddress) return null;
      return { owner: owner_.toLowerCase(), payees: payees.map(p => p.toLowerCase()), shares: shares.map(Number), received, times: Number(times), fee: await c.fee() };
    },
    async fee() { const c = await reader(); return c ? c.fee() : null; },
    async earned(who) { const c = await reader(); return c ? c.earned(who) : 0n; },
    async owed(who) { const c = await reader(); return c ? c.owed(who) : 0n; },
    async paid(key, owner, who) { const c = await reader(); return c ? c.paid(api.id(key, owner), who) : 0n; },
    // record a film's split: one transaction from the wallet that released it
    async register(key, owner, people) {
      const paying = people.filter(p => p.pct > 0 && p.wallet), { me, contract } = await signer();
      if (me !== owner) throw Object.assign(new Error('Switch your wallet to the one that released this film: ' + owner.slice(0, 6) + '…' + owner.slice(-4)), { code: 'NO_WALLET' });
      const tx = await contract.register(key, paying.map(p => p.wallet), paying.map(p => Math.round(p.pct * 100)));
      return { hash: tx.hash, done: tx.wait() };
    },
    async support(key, owner, amount) {
      const { me, signer: s, contract } = await signer(), value = ethers.parseEther(String(amount));
      const balance = await s.provider.getBalance(me);
      if (balance < value) throw Object.assign(new Error(`This wallet has ${trim(ethers.formatEther(balance))} test ETH. Get some free from a Sepolia faucet first.`), { code: 'NO_FUNDS' });
      const tx = await contract.support(api.id(key, owner), { value });
      return { hash: tx.hash, done: tx.wait() };
    },
    async withdraw() { const { contract } = await signer(); const tx = await contract.withdraw(); return { hash: tx.hash, done: tx.wait() }; },
    // what went wrong, in words
    why: e => (e && (e.code === 4001 || e.code === 'ACTION_REJECTED') ? 'You cancelled in your wallet. Nothing was sent.' : e && (e.code === 'NO_WALLET' || e.code === 'NO_FUNDS') ? e.message
      : e && /insufficient funds/i.test(String(e.message)) ? 'This wallet does not have enough test ETH. Get some free from a Sepolia faucet first.' : (e && (e.reason || e.shortMessage)) || 'The wallet did not complete the request. Nothing was sent.'),
  };
  return api;
})();

/* ---------- on a released film's page: the split as the chain has it, and support that really moves ---------- */
(() => {
  if (document.body.dataset.page !== 'watch' || typeof cur === 'undefined' || !cur.owner) return;
  const box = $('[data-chain-split]'), people = cur.crew.filter(p => p.pct > 0 && p.wallet);
  const me = () => (sessionNow() || {}).address, mine = () => me() === cur.owner, shortW = a => a.slice(0, 6) + '…' + a.slice(-4);
  const test = '<span class="testnote">Sepolia test network</span>';
  let split, noContract = false, paidTo = {};          // split: undefined while unknown, null when it is not recorded
  const bar = `<div class="splitbar" role="img" aria-label="Shares">${people.map(p => `<i style="flex:${p.pct};background:${tone(p.name)}" title="${esc(p.name)} · ${p.pct}%"></i>`).join('')}</div>`;
  const rows = () => `<div class="chainrows">${people.map(p => `<a class="chainrow" href="artist.html?wallet=${p.wallet}"><i style="background:${tone(p.name)}"></i><span><b>${esc(p.name)}</b><small>${esc(p.role)} · ${shortW(p.wallet)}</small></span>
    <em>${p.pct}%${paidTo[p.wallet] ? `<small>${PAY.eth(paidTo[p.wallet])} ETH paid</small>` : ''}</em></a>`).join('')}</div>`;
  const same = sp => sp.payees.length === people.length && people.every((p, i) => sp.payees[i] === p.wallet && sp.shares[i] === Math.round(p.pct * 100));
  const draw = (state, cls = '') => { if (box) box.innerHTML = `<p class="muted small">Whatever is sent to this film is paid to these people in the same transaction, in these shares, minus one flat fee.</p>${bar}${rows()}<div class="chainstate ${cls}">${state}</div>`; };

  async function read() {
    const at = await PAY.address();
    if (!at) { split = null; noContract = true; return draw(`${test}<span>The contract that pays out splits is not on the test network yet, so support cannot be sent.${ADMIN_HINT()}</span>`, 'warn'); }
    try { split = await PAY.split(cur.key, cur.owner); } catch { split = undefined; return draw(`${test}<span>The test network could not be reached. <button class="link" data-chain-again>Try again</button></span>`, 'warn'); }
    if (!split) return draw(`${test}<span>${mine() ? 'The split is not recorded yet. Record it once, and viewers can send support.' : 'Its makers have not recorded the split on the test network yet, so support cannot be sent.'}</span>${mine() ? '<button class="btn primary small" data-chain-register>Record the split</button>' : ''}`, 'warn');
    try { (await Promise.all(people.map(p => PAY.paid(cur.key, cur.owner, p.wallet)))).forEach((v, i) => { paidTo[people[i].wallet] = v; }); } catch {}
    if (!same(split)) return draw(`${test}<span>The split recorded on the chain is not the one shown here${mine() ? '. Record it again to bring them in line.' : ', so support is switched off until its makers record it again.'}</span>${mine() ? '<button class="btn primary small" data-chain-register>Record it again</button>' : ''}`, 'warn');
    draw(`${test}<span><b>Recorded on the chain.</b> ${split.times ? `${split.times} ${split.times === 1 ? 'payment' : 'payments'} so far, ${PAY.eth(split.received)} test ETH in all.` : 'Nothing has been sent yet.'} Test ETH is free and worth nothing: the mechanism is real, the money is not.
      <a class="link" href="${PAY.link('address', at)}" target="_blank" rel="noopener">See the contract ↗</a></span>`, 'ok');
  }
  const ADMIN_HINT = () => (me() ? ' An admin wallet can put it there from <a class="link" href="deploy.html">the deploy page</a>.' : '');

  async function register(btn) {
    btn.disabled = true; btn.textContent = 'Confirm in your wallet…';
    try { const tx = await PAY.register(cur.key, cur.owner, cur.crew); btn.textContent = 'Waiting for the network…'; await tx.done; await read(); }
    catch (e) { await read(); box.querySelector('.chainstate')?.insertAdjacentHTML('beforeend', `<span class="bad">${esc(PAY.why(e))}</span>`); }
  }

  /* the support dialog */
  document.body.insertAdjacentHTML('beforeend', '<dialog id="chainpay"><div class="form" data-cp></div></dialog>');
  const dlg = $('#chainpay'), body = $('[data-cp]', dlg); let amount = '0.005';
  const parts = wei => { const rest = wei - split.fee; let left = rest; return people.map((p, i) => { const v = i === people.length - 1 ? left : rest * BigInt(split.shares[i]) / 10000n; left -= v; return [p, v]; }); };
  const valid = () => { try { return /^\d*\.?\d+$/.test(amount) && ethers.parseEther(amount) > split.fee; } catch { return false; } };
  function form(note = '') {
    const ok = valid(), wei = ok ? ethers.parseEther(amount) : 0n;
    body.innerHTML = `<h2>Support ${esc(cur.title)}</h2><p class="lead muted small">${test} Test ETH is free and worth nothing. It is the real mechanism with pretend money.</p>
      <div class="picks">${['0.001', '0.005', '0.01'].map(v => `<button class="pick${v === amount ? ' on' : ''}" data-cp-pick="${v}">${v}</button>`).join('')}<input class="field" data-cp-amount inputmode="decimal" value="${esc(amount)}" aria-label="Amount in test ETH"></div>
      <div class="sum">${ok ? `<div><span>You send</span><span>${PAY.eth(wei)} ETH</span></div><div class="muted"><span>dein.art fee</span><span>−${PAY.eth(split.fee)} ETH</span></div>
        <div class="tot"><span>Paid to ${people.length === 1 ? 'one person' : people.length + ' people'}</span><span>${PAY.eth(wei - split.fee)} ETH</span></div>${parts(wei).map(([p, v]) => `<div class="who"><span>${esc(p.name)} · ${p.pct}%</span><span>${PAY.eth(v)} ETH</span></div>`).join('')}`
        : `<div class="muted"><span>Enter more than the fee of ${PAY.eth(split.fee)} ETH.</span><span></span></div>`}</div>
      ${note ? `<p class="claimnote bad" style="margin:12px 0 0">${esc(note)}</p>` : ''}
      <button class="btn primary wide" data-cp-send style="margin-top:14px"${ok ? '' : ' disabled'}>Send ${ok ? PAY.eth(wei) + ' test ETH' : ''}</button><button class="btn wide" data-cp-close style="margin-top:8px">Cancel</button>`;
  }
  const cannot = why => { body.innerHTML = `<h2>Support is not open yet</h2><p class="muted" style="margin:8px 0 16px">${why}</p><button class="btn wide" data-cp-close>Close</button>`; };
  async function send() {
    const wei = ethers.parseEther(amount);
    body.innerHTML = `<h2>Confirm in your wallet</h2><p class="muted" style="margin:8px 0 16px">Your wallet asks you to confirm one transaction on Sepolia.</p><button class="btn wide" data-cp-close>Cancel</button>`;
    try {
      const tx = await PAY.support(cur.key, cur.owner, amount);
      body.innerHTML = `<h2>Sending…</h2><p class="muted" style="margin:8px 0 16px">Waiting for the network to include it. <a class="link" href="${PAY.link('tx', tx.hash)}" target="_blank" rel="noopener">Follow the transaction ↗</a></p>`;
      await tx.done;
      body.innerHTML = `<div class="done" style="text-align:center"><div class="tick">✓</div><h2>Sent</h2><p class="muted">${PAY.eth(wei - split.fee)} test ETH was paid to ${people.length === 1 ? esc(people[0].name) : people.length + ' people'} in the same transaction.</p></div>
        <div class="sum">${parts(wei).map(([p, v]) => `<div class="who"><span>${esc(p.name)} · ${p.pct}%</span><span>${PAY.eth(v)} ETH</span></div>`).join('')}</div>
        <a class="btn wide" href="${PAY.link('tx', tx.hash)}" target="_blank" rel="noopener" style="margin-top:14px">See the transaction ↗</a><button class="btn wide" data-cp-close style="margin-top:8px">Close</button>`;
      read();
    } catch (e) { form(PAY.why(e)); }
  }
  document.addEventListener('click', async e => {
    if (e.target.closest('[data-chain-again]')) return read();
    const reg = e.target.closest('[data-chain-register]'); if (reg) return register(reg);
    if (e.target.closest('[data-chain-support]')) {
      if (split === undefined) { cannot('The test network has not answered yet. Try again in a moment.'); dlg.showModal(); read(); return; }
      if (noContract) cannot('Support opens once the contract that pays out splits is on the test network. It is not there yet.');
      else if (!split || !same(split)) cannot(`The split of this film is not recorded on the test network yet${mine() ? '. Record it in the “Where support goes” box first.' : ', so there is nowhere to send support. Its makers can switch it on from this page.'}`);
      else { await PAY.ready(); form(); }
      dlg.showModal(); return;
    }
    const pick = e.target.closest('[data-cp-pick]'); if (pick) { amount = pick.dataset.cpPick; return form(); }
    if (e.target.closest('[data-cp-send]')) return send();
    if (e.target.closest('[data-cp-close]')) return dlg.close();
    // its maker, or an admin, can take the film down
    if (e.target.closest('[data-film-remove]') && confirm('Remove this film and its files from dein.art? This cannot be undone.')) {
      const r = await fetch('/api/films/' + cur.key, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session: sessionNow() }) });
      if (r.ok) location.href = 'index.html'; else alert((await r.json().catch(() => ({}))).error || 'It could not be removed.');
    }
  });
  dlg.addEventListener('input', e => { if (!e.target.matches('[data-cp-amount]')) return; amount = e.target.value.trim().replace(',', '.'); const at = e.target.selectionStart; form(); const i = $('[data-cp-amount]', dlg); i.focus(); try { i.setSelectionRange(at, at); } catch {} });
  const tools = $('[data-owner-tools]');
  if (tools && me() && (mine() || me() === '0xe803aad78e6eabcde6f820d2c64cf83402eddbe2')) tools.innerHTML = '<button class="link" data-film-remove>Remove this film</button>';
  read();
})();
