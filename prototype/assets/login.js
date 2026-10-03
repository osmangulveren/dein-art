/* Logging in.
   A crypto wallet works now: the wallet signs a sign-in message and the signature is checked in the browser.
   X, Google, Farcaster and email go through Privy (privy.io), which handles those logins and gives each person
   a wallet; they switch on once PRIVY_APP_ID is set. This is a prototype without a server, so a session lives
   in this browser only. */

const PRIVY_APP_ID = '';   // public app id from the Privy dashboard; empty until the Privy app exists

(() => {
  const account = $('[data-account]');
  if (!account) return;
  const read = () => { try { return JSON.parse(localStorage.getItem('session')) || null; } catch { return null; } };
  const write = v => { try { v ? localStorage.setItem('session', JSON.stringify(v)) : localStorage.removeItem('session'); } catch {} };
  const ethersReady = () => window.ethers ? Promise.resolve() : new Promise((ok, fail) => {
    const s = Object.assign(document.createElement('script'), { src: 'https://cdnjs.cloudflare.com/ajax/libs/ethers/6.13.4/ethers.umd.min.js', onload: ok, onerror: fail });
    document.head.append(s);
  });
  // a wallet's own colours, so the same wallet always looks the same
  const walletFace = a => `<span class="avatar walletface" style="background:linear-gradient(135deg,#${a.slice(2, 8)},#${a.slice(-6)})" aria-hidden="true"></span>`;

  const icon = {
    wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18M16 14.5h2"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
    google: '<svg viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.4 14c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V7.4H3.1a10 10 0 0 0 0 9.2L6.4 14z"/><path fill="#EA4335" d="M12 5.9c1.5 0 2.8.5 3.8 1.5l2.9-2.9A10 10 0 0 0 3.1 7.4L6.4 10c.8-2.3 3-4.1 5.6-4.1z"/></svg>',
    farcaster: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 3h14v18h-2.6v-8.2A4.4 4.4 0 0 0 12 8.6a4.4 4.4 0 0 0-4.4 4.2V21H5V3z"/></svg>',
    mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
  };
  const PROVIDERS = [['wallet', 'Crypto wallet', 'MetaMask, Rabby, Coinbase Wallet…'], ['x', 'X'], ['google', 'Google'], ['farcaster', 'Farcaster'], ['mail', 'Email', 'through Privy']];

  document.body.insertAdjacentHTML('beforeend', '<dialog id="login"></dialog>');
  const dlg = $('#login');
  function drawDialog(note = '', tone = '') {
    dlg.innerHTML = `
      <h2>Log in to dein.art</h2>
      <p class="muted small" style="margin-bottom:16px">One account for watching, publishing and getting paid. A wallet is created for you if you do not have one.</p>
      <div class="logins">${PROVIDERS.map(([k, label, sub]) => {
        const ready = k === 'wallet' || PRIVY_APP_ID;
        return `<button class="loginbtn" data-login="${k}" ${ready ? '' : 'aria-disabled="true"'}><i class="li-${k}">${icon[k]}</i><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</span>${ready ? '' : '<em>Soon</em>'}</button>`;
      }).join('')}</div>
      ${note ? `<p class="claimnote ${tone}" style="margin-top:14px">${note}</p>` : ''}
      <p class="muted small" style="margin-top:14px">Signing in with a wallet is free and is not a transaction. Prototype: your session is kept in this browser only.</p>
      <button class="btn wide" data-close style="margin-top:12px">Close</button>`;
  }

  function drawAccount() {
    const s = read();
    if (!s) { account.innerHTML = '<button class="btn" data-open-login>Log in</button>'; return; }
    account.innerHTML = `<details class="acct"><summary aria-label="Your account">${walletFace(s.address)}</summary>
      <div class="acctmenu"><div><b>Signed in</b><span class="mono muted small">${short(s.address)}</span></div>
        <a href="artist.html?wallet=${s.address}">Your wallet page</a><a href="artist.html?wallet=${s.address}#wallet">Your NFTs</a><a href="creator.html">Sample creator page</a>
        <button data-logout>Log out</button></div></details>`;
  }

  async function walletLogin() {
    if (!window.ethereum) return drawDialog('No wallet was found in this browser. Install MetaMask or Rabby, or open this page in your wallet app\'s browser.', 'bad');
    try {
      drawDialog('Waiting for your wallet…');
      await ethersReady();
      const [address] = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const message = [
        `${location.host} wants you to sign in with your Ethereum account:`, ethers.getAddress(address), '',
        'Sign in to dein.art. This is free and does not send a transaction.', '',
        `URI: ${location.origin}`, 'Version: 1', 'Chain ID: 1',
        `Nonce: ${[...crypto.getRandomValues(new Uint8Array(8))].map(b => b.toString(16).padStart(2, '0')).join('')}`,
        `Issued At: ${new Date().toISOString()}`,
      ].join('\n');
      drawDialog('Check your wallet and sign the message.');
      const signature = await window.ethereum.request({ method: 'personal_sign', params: [ethers.hexlify(ethers.toUtf8Bytes(message)), address] });
      if (ethers.verifyMessage(message, signature).toLowerCase() !== address.toLowerCase()) return drawDialog('The signature did not match the wallet, so you are not signed in.', 'bad');
      write({ method: 'wallet', address: address.toLowerCase(), message, signature, at: Date.now() });
      dlg.close(); drawAccount();
    } catch (e) {
      drawDialog(e?.code === 4001 ? 'You cancelled in your wallet. Nothing was signed.' : 'The wallet did not complete the request.', 'bad');
    }
  }

  document.addEventListener('click', e => {
    if (e.target.closest('[data-open-login]')) { drawDialog(); dlg.showModal(); }
    const b = e.target.closest('[data-login]');
    if (b && b.dataset.login === 'wallet') walletLogin();
    else if (b && !PRIVY_APP_ID) drawDialog(`Logging in with ${b.querySelector('b').textContent} opens once the Privy app for dein.art is set up. For now, use a crypto wallet.`);
    if (e.target.closest('[data-logout]')) { write(null); drawAccount(); }
  });
  drawAccount();
  // A stored session counts only if its signature still matches; check it once the library is at hand.
  const s = read();
  if (s) ethersReady().then(() => { try { if (ethers.verifyMessage(s.message, s.signature).toLowerCase() !== s.address) { write(null); drawAccount(); } } catch { write(null); drawAccount(); } }).catch(() => {});
})();
