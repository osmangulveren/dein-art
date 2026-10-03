/* Small interactive pieces, recreated in plain JavaScript after components from Devigner UI
   (https://ui.devigner.cc, MIT licence): Copy Button, Goo Switch, Chart Card, Delete Button, Slider,
   Magnetic Button and File Upload. Each one is a function that returns markup, plus one shared listener.
   Loaded before app.js on every page. */

const uiEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Copy Button: copies, turns green and retypes its label to "Copied" ---------- */
const ICON_COPY = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5"/></svg>';
const ICON_TICK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const copyBtn = (text, label = 'Copy') => `<button type="button" class="copybtn" data-copy="${uiEsc(text)}" data-label="${uiEsc(label)}" aria-label="${uiEsc(label)}: ${uiEsc(text)}"><i class="ci">${ICON_COPY}</i><i class="ct">${ICON_TICK}</i><span>${uiEsc(label)}</span></button>`;
function retype(el, word) {
  if (calm) { el.textContent = word; return; }
  clearInterval(el._t);
  let text = el.textContent, phase = 'erase';
  el._t = setInterval(() => {
    if (phase === 'erase') { text = text.slice(0, -1); if (!text) phase = 'type'; }
    else { text = word.slice(0, text.length + 1); if (text === word) clearInterval(el._t); }
    el.textContent = text || '​';
  }, 26);
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  e.preventDefault(); e.stopPropagation();
  try { await navigator.clipboard.writeText(b.dataset.copy); }
  catch { const t = Object.assign(document.createElement('textarea'), { value: b.dataset.copy }); document.body.append(t); t.select(); document.execCommand('copy'); t.remove(); }
  const label = b.querySelector('span');
  b.classList.add('done'); retype(label, 'Copied');
  clearTimeout(b._r); b._r = setTimeout(() => { b.classList.remove('done'); retype(label, b.dataset.label); }, 1300);
});

/* ---------- Goo Switch: the thumb is a drop that stretches and trails a tail as it moves ---------- */
const gooSwitch = (name, on, label) => `<button type="button" class="goo${on ? ' on' : ''}" role="switch" aria-checked="${on}" aria-label="${uiEsc(label)}" data-goo="${name}"><span class="goo-blob"><i class="goo-thumb"></i><i class="goo-tail"></i></span></button>`;
document.body.insertAdjacentHTML('afterbegin', '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="goo"><feGaussianBlur in="SourceGraphic" stdDeviation="2.4" result="b"/><feColorMatrix in="b" values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 18 -8" result="g"/><feComposite in="SourceGraphic" in2="g" operator="atop"/></filter></svg>');
function setGoo(sw, on, silent) {
  if (sw.classList.contains('on') === on) return;
  sw.classList.add('moving'); clearTimeout(sw._m); sw._m = setTimeout(() => sw.classList.remove('moving'), 460);
  sw.classList.toggle('on', on); sw.setAttribute('aria-checked', on);
  if (!silent) sw.dispatchEvent(new CustomEvent('goo', { bubbles: true, detail: { name: sw.dataset.goo, on } }));
}
document.addEventListener('click', e => { const sw = e.target.closest('[data-goo]'); if (sw) setGoo(sw, !sw.classList.contains('on')); });

/* ---------- Chart Card: a total, and bars that show their value as you move across them ---------- */
const chartCard = ({ title, total, caption, data, active = data.length - 1, note = '' }) => `
  <div class="chartcard" data-chart='${uiEsc(JSON.stringify(data))}'>
    <div class="cc-head"><span>${uiEsc(title)}</span><small>${uiEsc(caption)}</small></div>
    <div class="cc-total">${uiEsc(total)}</div>
    <div class="cc-bars">${data.map((d, i) => `<button type="button" class="cc-bar${i === active ? ' on' : ''}" data-i="${i}" style="--h:${Math.max(6, d.value / Math.max(...data.map(x => x.value)) * 100)}%" aria-label="${uiEsc(d.label)}: ${uiEsc(d.text || d.value)}"><i></i><span>${uiEsc(d.label)}</span></button>`).join('')}
      <span class="cc-tip"></span></div>
    ${note ? `<p class="cc-note">${note}</p>` : ''}
  </div>`;
function chartPick(card, i) {
  const data = JSON.parse(card.dataset.chart), bars = card.querySelectorAll('.cc-bar'), tip = card.querySelector('.cc-tip'), bar = bars[i];
  bars.forEach(b => b.classList.toggle('on', b === bar));
  tip.textContent = data[i].text || data[i].value;
  tip.style.left = bar.offsetLeft + bar.offsetWidth / 2 + 'px';
  tip.style.bottom = `calc(${bar.style.getPropertyValue('--h')} * .78 + 30px)`;
}
const initCharts = () => document.querySelectorAll('.chartcard').forEach(card => { if (card._init) return; card._init = 1; const on = card.querySelector('.cc-bar.on'); if (on) requestAnimationFrame(() => chartPick(card, Number(on.dataset.i))); });
document.addEventListener('pointerover', e => { const b = e.target.closest('.cc-bar'); if (b) chartPick(b.closest('.chartcard'), Number(b.dataset.i)); });
document.addEventListener('click', e => { const b = e.target.closest('.cc-bar'); if (b) chartPick(b.closest('.chartcard'), Number(b.dataset.i)); });

/* ---------- Delete Button: asks first, waits for the work, then shows a tick ---------- */
const deleteBtn = (key, label = 'Remove') => `
  <span class="delbtn" data-del="${uiEsc(key)}" data-state="idle">
    <button type="button" class="del-tile" aria-label="${uiEsc(label)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><g class="lid"><path d="M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7"/></g><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M10 11v6M14 11v6"/></svg><i class="del-spin"></i><i class="del-done">${ICON_TICK}</i></button>
    <span class="del-ask"><button type="button" class="btn danger" data-del-yes>${uiEsc(label)}</button><button type="button" class="btn" data-del-no>Keep</button></span>
  </span>`;
document.addEventListener('click', async e => {
  const box = e.target.closest('[data-del]');
  if (!box) return;
  e.preventDefault(); e.stopPropagation();
  const state = box.dataset.state;
  if (e.target.closest('.del-tile') && state === 'idle') box.dataset.state = 'confirm';
  else if (e.target.closest('[data-del-no]') || (e.target.closest('.del-tile') && state === 'confirm')) box.dataset.state = 'idle';
  else if (e.target.closest('[data-del-yes]')) {
    box.dataset.state = 'waiting';
    let work = Promise.resolve();
    box.dispatchEvent(new CustomEvent('delete', { bubbles: true, detail: { key: box.dataset.del, wait: p => { work = p; } } }));
    try { await work; box.dataset.state = 'done'; box.dispatchEvent(new CustomEvent('deleted', { bubbles: true, detail: { key: box.dataset.del } })); }
    catch { box.dataset.state = 'idle'; }
  }
});

/* ---------- Slider: the fill heats from yellow to red; the glass thumb opens to show the value ---------- */
const heatSlider = ({ name, min = 0, max = 100, value = 40, step = 1, prefix = '', label = 'Amount' }) => `
  <div class="heat" data-heat="${uiEsc(name)}" data-min="${min}" data-max="${max}" data-step="${step}" data-prefix="${uiEsc(prefix)}" role="slider" tabindex="0" aria-label="${uiEsc(label)}" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${value}">
    <span class="heat-fill"></span><span class="heat-thumb"><b></b></span>
  </div>`;
function heatSet(el, v, emit = true) {
  const min = +el.dataset.min, max = +el.dataset.max, step = +el.dataset.step;
  v = Math.min(max, Math.max(min, Math.round(v / step) * step));
  const k = (v - min) / (max - min);
  el.style.setProperty('--k', k);
  el.style.setProperty('--heat', `hsl(${48 - 48 * k} 96% ${56 - 6 * k}%)`);
  el.setAttribute('aria-valuenow', v);
  el.querySelector('b').textContent = el.dataset.prefix + v;
  if (emit && el._v !== v) el.dispatchEvent(new CustomEvent('heat', { bubbles: true, detail: { name: el.dataset.heat, value: v } }));
  el._v = v;
}
const initHeat = () => document.querySelectorAll('[data-heat]').forEach(el => { if (!el._init) { el._init = 1; heatSet(el, +el.getAttribute('aria-valuenow'), false); } });
document.addEventListener('pointerdown', e => {
  const el = e.target.closest('[data-heat]');
  if (!el) return;
  const at = ev => { const r = el.getBoundingClientRect(); heatSet(el, +el.dataset.min + (ev.clientX - r.left) / r.width * (el.dataset.max - el.dataset.min)); };
  el.classList.add('dragging'); el.setPointerCapture(e.pointerId); at(e);
  const move = ev => at(ev), up = () => { el.classList.remove('dragging'); el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); };
  el.addEventListener('pointermove', move); el.addEventListener('pointerup', up);
});
document.addEventListener('keydown', e => {
  const el = e.target.closest?.('[data-heat]');
  if (!el) return;
  const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
  if (d) { e.preventDefault(); heatSet(el, +el.getAttribute('aria-valuenow') + d * +el.dataset.step); }
});

/* ---------- Magnetic Button: leans toward the cursor, then lets go with a wobble ---------- */
if (!calm && matchMedia('(pointer: fine)').matches) document.addEventListener('pointermove', e => {
  document.querySelectorAll('[data-magnetic]').forEach(el => {
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, dx = e.clientX - cx, dy = e.clientY - cy;
    const near = Math.abs(dx) < r.width / 2 + 70 && Math.abs(dy) < r.height / 2 + 70;
    el.classList.toggle('pulled', near);
    el.style.transform = near ? `translate(${dx * .28}px, ${dy * .32}px)` : '';
    const inner = el.querySelector('.mag-in');
    if (inner) inner.style.transform = near ? `translate(${dx * .12}px, ${dy * .14}px) rotate(${dx * .03}deg)` : '';
  });
}, { passive: true });

/* ---------- File Upload: drop files, and each one runs its own progress card ---------- */
const fileSize = n => n > 1e9 ? (n / 1e9).toFixed(2) + ' GB' : n > 1e6 ? (n / 1e6).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1e3)) + ' KB';
function fileUpload(zone, { accept = '', onAll } = {}) {
  zone.classList.add('fu');
  zone.innerHTML = `
    <label class="fu-drop"><input type="file" multiple ${accept ? `accept="${accept}"` : ''} hidden>
      <span class="fu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg></span>
      <b>Drop your film and files here</b><span class="muted small">or click to choose · video, images, audio, PDFs</span>
      <span class="fu-badge" hidden></span></label>
    <div class="fu-list"></div>
    <p class="muted small fu-note">Prototype: files stay on your computer; the upload is shown, not sent.</p>`;
  const drop = zone.querySelector('.fu-drop'), list = zone.querySelector('.fu-list'), badge = zone.querySelector('.fu-badge'), input = zone.querySelector('input');
  const items = [];
  const kind = f => f.type.split('/')[0] === 'video' ? 'Video' : f.type.split('/')[0] === 'image' ? 'Image' : f.type.split('/')[0] === 'audio' ? 'Audio' : (f.name.split('.').pop() || 'File').toUpperCase();
  const add = files => [...files].forEach(f => {
    const it = { f, p: 0, paused: false, el: document.createElement('div') };
    it.el.className = 'fu-card entering';
    it.el.innerHTML = `<span class="fu-kind">${uiEsc(kind(f))}</span><span class="fu-meta"><b>${uiEsc(f.name)}</b><small>${fileSize(f.size)} · <em>Waiting</em></small><span class="fu-bar"><i></i></span></span><button type="button" class="btn icon bare fu-x" aria-label="Remove ${uiEsc(f.name)}">✕</button>`;
    it.el.addEventListener('pointerenter', () => { it.paused = true; it.el.classList.add('paused'); });
    it.el.addEventListener('pointerleave', () => { it.paused = false; it.el.classList.remove('paused'); });
    it.el.querySelector('.fu-x').addEventListener('click', () => { it.gone = true; it.el.classList.add('leaving'); setTimeout(() => it.el.remove(), 260); check(); });
    list.append(it.el); requestAnimationFrame(() => it.el.classList.remove('entering'));
    items.push(it);
  });
  const check = () => { const live = items.filter(i => !i.gone); if (live.length && live.every(i => i.p >= 100)) onAll?.(live.map(i => i.f)); };
  // two at a time; a bigger file takes longer
  setInterval(() => {
    items.filter(i => !i.gone && i.p < 100).slice(0, 2).forEach(i => {
      if (i.paused) { i.el.querySelector('em').textContent = 'Paused'; return; }
      i.p = Math.min(100, i.p + Math.max(1.2, 9 - Math.log10(i.f.size + 10)));
      i.el.querySelector('.fu-bar i').style.width = i.p + '%';
      i.el.querySelector('em').textContent = i.p >= 100 ? 'Ready' : Math.floor(i.p) + '%';
      if (i.p >= 100) { i.el.classList.add('ok'); check(); }
    });
  }, 120);
  input.addEventListener('change', () => { add(input.files); input.value = ''; });
  drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); const n = e.dataTransfer.items.length; badge.hidden = false; badge.textContent = `${n} ${n === 1 ? 'file' : 'files'}`; badge.style.left = e.offsetX + 'px'; badge.style.top = e.offsetY + 'px'; });
  drop.addEventListener('dragleave', () => { drop.classList.remove('over'); badge.hidden = true; });
  drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('over'); badge.hidden = true; add(e.dataTransfer.files); });
}

/* ---------- ENS names: a wallet is shown by its name when it has one ---------- */
// Names are read from Blockscout's public index of Ethereum and remembered for a day.
const ensKnown = (() => { try { return JSON.parse(localStorage.getItem('ens')) || {}; } catch { return {}; } })();
const ensTag = (address, cls = 'mono') => { const a = String(address).toLowerCase(), hit = ensKnown[a]; return `<span class="${cls}" data-ens="${a}" title="${a}">${hit && hit.n ? uiEsc(hit.n) : a.slice(0, 6) + '…' + a.slice(-4)}</span>`; };
const ensAsk = {};
function resolveEns(address) {
  const a = String(address).toLowerCase(), hit = ensKnown[a];
  if (hit && Date.now() - hit.t < 864e5) return Promise.resolve(hit.n);
  return ensAsk[a] ||= fetch('https://eth.blockscout.com/api/v2/addresses/' + a).then(r => r.ok ? r.json() : null).then(d => {
    const n = d && d.ens_domain_name || null;
    ensKnown[a] = { n, t: Date.now() }; try { localStorage.setItem('ens', JSON.stringify(ensKnown)); } catch {}
    return n;
  }).catch(() => null);
}
function fillEns() {
  document.querySelectorAll('[data-ens]:not([data-ens-seen])').forEach(el => {
    el.dataset.ensSeen = 1;
    resolveEns(el.dataset.ens).then(n => { if (n && el.textContent !== n) el.textContent = n; });
  });
}
new MutationObserver(fillEns).observe(document.documentElement, { childList: true, subtree: true });
