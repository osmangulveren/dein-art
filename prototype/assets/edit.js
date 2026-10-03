/* Editing your own page: name, description, links, picture, merch and credits.
   "Your page" can always be edited, and so can a wallet's page when you are logged in with that wallet.
   Prototype: changes are kept in this browser; with a server they would be saved to the account
   (and, for credits, recorded with the film). */

(() => {
  if (!editKey) return;
  const session = (() => { try { return JSON.parse(localStorage.getItem('session')); } catch { return null; } })();
  const mine = page === 'creator' || (subject.chain && session && session.address === subject.chain.address);
  const $p = key => $(`[data-p="${key}"]`);

  /* ---------- what the creator changed, shown on the page ---------- */
  if (edits.name) { $p('name').textContent = edits.name; document.title = `${edits.name} — dein.art`; }
  if (edits.line) $p('line').textContent = edits.line;
  if (edits.bio) $p('bio').textContent = edits.bio;
  if (edits.avatar) $p('avatar').innerHTML = `<img class="avatar lg" src="${edits.avatar}" alt="">`;
  const links = edits.links || {};
  const linkHtml = [links.website && [links.website, links.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')], links.x && [`https://x.com/${links.x.replace(/^@/, '')}`, 'X'], links.instagram && [`https://instagram.com/${links.instagram.replace(/^@/, '')}`, 'Instagram']]
    .filter(Boolean).map(([href, label]) => `<a class="link" href="${esc(/^https?:\/\//.test(href) ? href : 'https://' + href)}" target="_blank" rel="noopener">${esc(label)}</a>`).join('');
  if (linkHtml) $p('links').insertAdjacentHTML('afterbegin', linkHtml);
  if (!mine) return;

  /* ---------- the editor ---------- */
  $p('acts').insertAdjacentHTML('beforeend', '<button class="btn" data-edit>✎ Edit page</button>');
  document.body.insertAdjacentHTML('beforeend', '<dialog id="editor" class="editor"></dialog>');
  const dlg = $('#editor');
  let draft, section = 'profile';
  const ROLES = ['Director', 'Writer', 'Producer', 'Cinematographer', 'Editor', 'Composer', 'Production designer', 'Sound', 'Actor', 'Artist', 'Other'];
  // pictures to print on merch: stills from your films and your own pieces, or one you upload
  const pictures = [...filmsOf(subject).flatMap(f => f.scenes.filter(s => s[1]).slice(0, 3).map(s => frame(f, s[0], 500))),
    ...(subject.chain ? subject.chain.collections.flatMap(c => c.tokens.slice(0, 4).map(t => t.img)) : []),
    ...(page === 'creator' ? [(CATALOG.images.find(i => i.medium === 'Poster') || {}).pic] : [])].filter(Boolean).slice(0, 12);
  const blankMerch = () => ({ title: '', type: 'tee', colour: 'ink', price: 28, pic: pictures[0] || '' });
  let newMerch = blankMerch(), newCredit = { title: '', year: '', role: 'Director' };

  // a picture from the computer, made small enough to keep in the browser
  const shrink = file => new Promise((ok, fail) => {
    const img = new Image(); img.onerror = fail;
    img.onload = () => { const k = Math.min(1, 800 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); ok(c.toDataURL('image/jpeg', .82)); };
    img.src = URL.createObjectURL(file);
  });

  function view() {
    const tab = (k, label) => `<button class="tab${section === k ? ' on' : ''}" data-ed-tab="${k}">${label}</button>`;
    const field = (k, label, value, attrs = '') => `<label>${label}<input class="field" data-ed="${k}" value="${esc(value || '')}" ${attrs}></label>`;
    const body = {
      profile: `
        <div class="edrow"><div class="edavatar">${draft.avatar ? `<img class="avatar lg" src="${draft.avatar}" alt="">` : $p('avatar').innerHTML}</div>
          <div><label class="btn">Change picture<input type="file" accept="image/*" data-ed-avatar hidden></label>${draft.avatar ? ' <button class="btn" data-ed-avatar-clear>Remove</button>' : ''}</div></div>
        ${field('name', 'Name', draft.name ?? $p('name').textContent)}
        ${field('line', 'What you do, where', draft.line ?? $p('line').textContent)}
        <label>About you<textarea class="field" rows="4" data-ed="bio">${esc(draft.bio ?? $p('bio').textContent)}</textarea></label>
        <div class="edgrid3">${field('links.website', 'Website', draft.links?.website, 'placeholder="yoursite.com"')}${field('links.x', 'X', draft.links?.x, 'placeholder="@handle"')}${field('links.instagram', 'Instagram', draft.links?.instagram, 'placeholder="@handle"')}</div>`,
      merch: `
        ${(draft.merch || []).length ? `<div class="edlist">${draft.merch.map((m, i) => `<div class="edline"><span class="edthumb">${mockup(m)}</span><span><b>${esc(m.title)}</b><small>${PRODUCTS[m.type]} · $${m.price}</small></span><button class="btn" data-ed-del="merch:${i}">Remove</button></div>`).join('')}</div>` : ''}
        <h3 class="edhead">Add merch</h3>
        <div class="edmerch">
          <div class="mthumb" data-ed-preview>${mockup({ ...newMerch, title: newMerch.title || 'Preview' })}</div>
          <div>
            <label>Name<input class="field" data-nm="title" value="${esc(newMerch.title)}" placeholder="e.g. Crew tee"></label>
            <div class="edgrid2"><label>Product<select class="field" data-nm="type">${Object.entries(PRODUCTS).map(([k, v]) => `<option value="${k}" ${newMerch.type === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
              <label>Price ($)<input class="field" type="number" min="5" data-nm="price" value="${newMerch.price}"></label></div>
            <p class="edlabel">Colour</p><div class="swatches">${Object.entries(COLOURS).map(([k, [b]]) => `<button class="swatch${newMerch.colour === k ? ' on' : ''}" data-nm-colour="${k}" style="background:${b}" aria-label="${k}"></button>`).join('')}</div>
            <p class="edlabel">Picture to print</p><div class="picks">${pictures.map(p => `<button class="ppick${newMerch.pic === p ? ' on' : ''}" data-nm-pic="${esc(p)}"><img src="${esc(p)}" alt=""></button>`).join('')}${newMerch.pic && !pictures.includes(newMerch.pic) ? `<button class="ppick on"><img src="${newMerch.pic}" alt=""></button>` : ''}<label class="ppick up">＋<input type="file" accept="image/*" data-nm-upload hidden></label></div>
            <button class="btn dark" data-nm-add style="margin-top:12px">Add to my merch</button>
          </div>
        </div>`,
      credits: `
        ${(draft.credits || []).length ? `<div class="edlist">${draft.credits.map((c, i) => `<div class="edline"><span><b>${esc(c.title)}</b><small>${esc(c.role)}${c.year ? ' · ' + c.year : ''}</small></span><button class="btn" data-ed-del="credits:${i}">Remove</button></div>`).join('')}</div>` : ''}
        <h3 class="edhead">Add a credit</h3>
        <div class="edgrid3"><label>Title<input class="field" data-nc="title" value="${esc(newCredit.title)}" placeholder="Film, series or work"></label>
          <label>Year<input class="field" type="number" min="1880" max="2100" data-nc="year" value="${esc(newCredit.year)}"></label>
          <label>Role<select class="field" data-nc="role">${ROLES.map(r => `<option ${newCredit.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label></div>
        <button class="btn dark" data-nc-add style="margin-top:12px">Add credit</button>
        <p class="muted small" style="margin-top:12px">On dein.art a credit is confirmed when the film's publisher lists you in its cast and crew; until then it shows as added by you.</p>`,
    }[section];
    dlg.innerHTML = `
      <div class="edtop"><h2>Edit your page</h2><button class="btn icon bare" data-close aria-label="Close">✕</button></div>
      <div class="tabs" style="margin-bottom:18px">${tab('profile', 'Profile')}${tab('merch', 'Merch')}${tab('credits', 'Credits')}</div>
      <div class="edbody">${body}</div>
      <div class="edfoot"><span class="muted small">Prototype: changes are kept in this browser.</span><button class="btn" data-close>Cancel</button><button class="btn primary" data-ed-save>Save changes</button></div>`;
  }

  const setPath = (o, path, v) => { const [a, b] = path.split('.'); if (b) (o[a] ||= {})[b] = v; else o[a] = v; };
  dlg.addEventListener('input', e => {
    const t = e.target;
    if (t.dataset.ed) setPath(draft, t.dataset.ed, t.value);
    if (t.dataset.nm) { newMerch[t.dataset.nm] = t.dataset.nm === 'price' ? Number(t.value) : t.value; $('[data-ed-preview]', dlg).innerHTML = mockup({ ...newMerch, title: newMerch.title || 'Preview' }); }
    if (t.dataset.nc) newCredit[t.dataset.nc] = t.value;
  });
  dlg.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset.nm === 'type') { newMerch.type = t.value; view(); }
    if (t.matches('[data-ed-avatar]') && t.files[0]) { draft.avatar = await shrink(t.files[0]); view(); }
    if (t.matches('[data-nm-upload]') && t.files[0]) { newMerch.pic = await shrink(t.files[0]); view(); }
  });
  dlg.addEventListener('click', e => {
    const t = e.target.closest('button, [data-ed-tab]'); if (!t) return;
    if (t.dataset.edTab) { section = t.dataset.edTab; view(); }
    if (t.dataset.nmColour) { newMerch.colour = t.dataset.nmColour; view(); }
    if (t.dataset.nmPic) { newMerch.pic = t.dataset.nmPic; view(); }
    if (t.hasAttribute('data-ed-avatar-clear')) { draft.avatar = ''; view(); }
    if (t.hasAttribute('data-nm-add')) {
      if (!newMerch.title.trim()) { $('[data-nm="title"]', dlg).focus(); return; }
      (draft.merch ||= []).push({ ...newMerch, title: newMerch.title.trim(), price: Math.max(5, Number(newMerch.price) || 5) }); newMerch = blankMerch(); view();
    }
    if (t.hasAttribute('data-nc-add')) {
      if (!newCredit.title.trim()) { $('[data-nc="title"]', dlg).focus(); return; }
      (draft.credits ||= []).push({ title: newCredit.title.trim(), year: Number(newCredit.year) || null, role: newCredit.role }); newCredit = { title: '', year: '', role: newCredit.role }; view();
    }
    if (t.dataset.edDel) { const [list, i] = t.dataset.edDel.split(':'); draft[list].splice(Number(i), 1); view(); }
    if (t.hasAttribute('data-ed-save')) {
      try { localStorage.setItem('edits:' + editKey, JSON.stringify(draft)); }
      catch { alert('This browser has no room left to keep the changes. Try a smaller picture.'); return; }
      const open = $('.tab.on[data-tab]')?.dataset.tab;
      location.hash = section === 'merch' ? 'merch' : section === 'credits' ? 'credits' : (open || '');
      location.reload();
    }
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('[data-edit]')) return;
    draft = JSON.parse(JSON.stringify(edits)); section = 'profile'; newMerch = blankMerch(); view(); dlg.showModal();
  });
})();
