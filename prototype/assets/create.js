/* Create: adding a credit (a title and the people who made it) and sharing assets on the marketplace.
   Both are forms in a few steps. Only what a title or an item cannot do without is required; the rest is optional.
   Prototype: what you submit is kept in this browser (localStorage 'titles', 'shared' and your page's edits). */

(() => {
  const load = k => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } };
  const keep = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; } };
  const session = load('session');
  const pages = ['me', ...(session && ONCHAIN.some(a => a.address === session.address) ? [session.address] : [])];
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const put = (o, path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
  const star = '<i class="cf-req" title="Required">*</i>';
  const thisYear = new Date().getFullYear();

  /* ---------- the form: steps, fields, lists, checks ---------- */

  function wizard(root, { state, steps, draft, done, submitLabel }) {
    let at = 0; const tried = new Set();
    const val = k => get(state, k) ?? '';
    const ui = {
      field(key, label, o = {}) {
        const v = val(key), a = `id="f-${key}" data-f="${key}"${o.redraw ? ' data-redraw' : ''}`;
        const input = o.options ? `<select class="field" ${a}>${o.blank ? `<option value="">${o.blank}</option>` : ''}${o.options.map(x => `<option${x === v ? ' selected' : ''}>${esc(x)}</option>`).join('')}</select>`
          : o.area ? `<textarea class="field" rows="${o.area}" ${a} placeholder="${esc(o.ph || '')}">${esc(v)}</textarea>`
          : `<input class="field" type="${o.type || 'text'}" ${a} value="${esc(v)}" placeholder="${esc(o.ph || '')}"${o.list ? ` list="${o.list}"` : ''}${o.min != null ? ` min="${o.min}"` : ''}${o.max != null ? ` max="${o.max}"` : ''}>`;
        return `<div class="cf-f${o.wide ? ' wide' : ''}"><label for="f-${key}">${label}${o.req ? star : '<small>optional</small>'}</label>${input}${o.hint ? `<p class="cf-hint">${o.hint}</p>` : ''}</div>`;
      },
      // a list of rows the creator can add to and remove from
      list(key, label, cols, o = {}) {
        const rows = get(state, key);
        return `<div class="cf-f wide"><label>${label}${o.req ? star : '<small>optional</small>'}</label>${o.hint ? `<p class="cf-hint" style="margin:-2px 0 8px">${o.hint}</p>` : ''}
          <div class="cf-rows">${rows.map((r, i) => `<div class="cf-row">${cols.map(c => `<input class="field" data-f="${key}.${i}.${c.k}" value="${esc(r[c.k] || '')}" placeholder="${esc(c.ph)}" aria-label="${esc(c.ph)}"${c.list ? ` list="${c.list}"` : ''}>`).join('')}
            <button type="button" class="btn icon bare" data-rm="${key}.${i}" aria-label="Remove"${o.req && rows.length === 1 ? ' disabled' : ''}>✕</button></div>`).join('')}</div>
          <button type="button" class="btn small" data-add="${key}">+ ${o.add || 'Add another'}</button></div>`;
      },
      chips(key, options, max) {
        const on = get(state, key);
        return `<div class="cf-chips">${options.map(x => `<button type="button" class="chip${on.includes(x) ? ' on' : ''}" data-chip="${key}" data-v="${esc(x)}"${max ? ` data-max="${max}"` : ''}>${esc(x)}</button>`).join('')}</div>`;
      },
      picks(key, options) { return `<div class="cf-picks">${options.map(([v, l, d]) => `<button type="button" class="pick${get(state, key) === v ? ' on' : ''}" data-pick="${key}" data-v="${v}"><b>${l}</b>${d ? `<span class="muted small">${d}</span>` : ''}</button>`).join('')}</div>`; },
    };
    const errorsOf = i => (steps[i].check ? steps[i].check(state) : {});
    const allErrors = () => steps.reduce((a, s, i) => ({ ...a, ...errorsOf(i) }), {});
    function draw(focusBad) {
      const s = steps[at], last = at === steps.length - 1, errs = tried.has(at) ? errorsOf(at) : {};
      root.innerHTML = `
        <nav class="cf-steps" aria-label="Steps">${steps.map((x, i) => `<button type="button" class="cf-step${i === at ? ' on' : ''}${i < at && !Object.keys(errorsOf(i)).length ? ' ok' : ''}${(tried.has(i) || last) && i !== at && Object.keys(errorsOf(i)).length ? ' bad' : ''}" data-step-to="${i}"><i>${i + 1}</i><span>${x.name}</span></button>`).join('')}</nav>
        <h1>${s.title}</h1><p class="muted">${s.intro || ''}</p>
        ${Object.keys(errs).length ? `<p class="cf-alert">${Object.keys(errs).length === 1 ? 'One thing is' : Object.keys(errs).length + ' things are'} still needed on this page.</p>` : ''}
        <div class="cf-body">${s.html(ui, state, { errors: allErrors(), go: i => `data-step-to="${i}"` })}</div>
        <p class="cf-legend muted small">${star} required · everything else is optional</p>
        <div class="actions"><${at ? 'button type="button"' : 'a href="upload.html"'} class="btn" data-back>Back</${at ? 'button' : 'a'}>
          <button type="button" class="btn primary" data-next${last && (Object.keys(allErrors()).length) ? ' disabled' : ''}>${last ? submitLabel : 'Next'}</button></div>`;
      Object.entries(errs).forEach(([k, msg]) => {
        const el = root.querySelector(`[data-f="${k}"]`) || root.querySelector(`[data-e="${k}"]`); if (!el) return;
        el.classList.add('bad'); (el.closest('.cf-row') || el).insertAdjacentHTML('afterend', `<p class="cf-err">${msg}</p>`);
      });
      s.after?.(root, state, draw);
      if (focusBad) root.querySelector('.bad')?.focus();
    }
    const save = () => { if (draft) keep(draft, state); };
    root.addEventListener('input', e => {
      const f = e.target.closest('[data-f]'); if (!f) return;
      put(state, f.dataset.f, f.type === 'checkbox' ? f.checked : f.value); save();
      if (f.classList.contains('bad')) { f.classList.remove('bad'); const n = (f.closest('.cf-row') || f).nextElementSibling; if (n?.classList.contains('cf-err')) n.remove(); }
      if (at === steps.length - 1) root.querySelector('[data-next]').disabled = !!Object.keys(allErrors()).length;
    });
    root.addEventListener('change', e => { if (e.target.closest('[data-redraw]')) draw(); });
    root.addEventListener('click', e => {
      const t = e.target, to = t.closest('[data-step-to]'), add = t.closest('[data-add]'), rm = t.closest('[data-rm]'), chip = t.closest('[data-chip]'), pick = t.closest('[data-pick]');
      if (to) { at = Number(to.dataset.stepTo); draw(); window.scrollTo(0, 0); }
      else if (add) { get(state, add.dataset.add).push({}); save(); draw(); const rows = add.previousElementSibling.querySelectorAll('.cf-row'); rows[rows.length - 1].querySelector('input').focus(); }
      else if (rm) { const ks = rm.dataset.rm.split('.'), i = Number(ks.pop()), arr = get(state, ks.join('.')); arr.splice(i, 1); if (!arr.length && steps[at].keepOne?.includes(ks.join('.'))) arr.push({}); save(); draw(); }
      else if (chip) { const arr = get(state, chip.dataset.chip), v = chip.dataset.v, i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else if (!chip.dataset.max || arr.length < Number(chip.dataset.max)) arr.push(v); save(); draw(); }
      else if (pick) { put(state, pick.dataset.pick, pick.dataset.v); save(); draw(); }
      else if (t.closest('[data-back]') && at) { at--; draw(); window.scrollTo(0, 0); }
      else if (t.closest('[data-next]')) {
        if (at === steps.length - 1) { if (!Object.keys(allErrors()).length) done(state); return; }
        tried.add(at);
        if (Object.keys(errorsOf(at)).length) return draw(true);
        at++; draw(); window.scrollTo(0, 0);
      }
    });
    draw();
  }

  const finished = (root, title, text, links) => {
    root.innerHTML = `<section class="done"><div class="tick">✓</div><h1>${title}</h1><p class="muted" style="margin:6px 0 22px">${text}</p>${links.map(([l, h], i) => `<a class="btn${i ? '' : ' primary'}" href="${h}">${l}</a>`).join(' ')}</section>`;
    window.scrollTo(0, 0);
  };
  const people = `<datalist id="people">${Object.keys(who).sort().map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;

  // a picture small enough to keep in the browser
  const shrink = (src, w, h, max = 640) => { const k = Math.min(1, max / Math.max(w, h)), c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k); c.getContext('2d').drawImage(src, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .82); };
  const imageThumb = (file, max) => new Promise(res => { const img = new Image(), u = URL.createObjectURL(file); img.onload = () => { let r = null; try { r = shrink(img, img.naturalWidth, img.naturalHeight, max); } catch {} URL.revokeObjectURL(u); res(r); }; img.onerror = () => { URL.revokeObjectURL(u); res(null); }; img.src = u; });

  /* ---------- add a credit ---------- */

  const TYPES = [...CATEGORIES.map(c => c[1]), 'Other'];
  const STATUS = ['Released', 'Completed', 'Post-production', 'Filming', 'Pre-production', 'Announced'];
  const ROLES = ['Director', 'Writer', 'Producer', 'Executive producer', 'Actor', 'Cinematographer', 'Editor', 'Composer', 'Production designer', 'Costume designer', 'Sound', 'Visual effects', 'Animator', 'Assistant director', 'Colourist', 'Other'];
  const GENRES = ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance', 'Sci-fi', 'Sport', 'Thriller', 'War', 'Western'];
  const titles = () => load('titles') || {};
  const myName = (load('edits:me') || {}).name || ME;

  const creditRoot = $('[data-credit-form]');
  if (creditRoot) {
    const editing = param('edit') && titles()[param('edit')];
    const blank = { title: '', original: '', type: '', status: 'Released', year: '', desc: '', tagline: '', genres: [], country: '', language: '', runtime: '', colour: '', released: '', premiere: '', watch: '', site: '', imdb: '', proof: '',
      directors: [{}], role: '', character: '', writers: [], producers: [], cast: [], crew: [], companies: [], distributors: [], trailer: '', budget: '', poster: '', confirm: false };
    const state = { ...blank, ...(editing || load('draft:credit') || {}), confirm: false };
    const named = rows => rows.filter(r => (r.name || '').trim());
    const steps = [
      { name: 'Title', title: editing ? 'Edit the title' : 'Add a credit', intro: 'Start with the title itself. If it is already on dein.art you only need to be added to its crew — otherwise tell us about it here.',
        html: f => `<div class="cf-grid">
          ${f.field('title', 'Title', { req: 1, wide: 1, ph: 'The title as it appears on screen' })}
          ${f.field('type', 'Type', { req: 1, options: TYPES, blank: 'Choose a type' })}
          ${f.field('status', 'Status', { req: 1, options: STATUS, redraw: 1 })}
          ${f.field('year', state.status === 'Released' ? 'Year released' : 'Year it is expected', { req: 1, type: 'number', min: 1888, max: thisYear + 6, ph: String(thisYear) })}
          ${f.field('original', 'Original title', { ph: 'If it has another title in its own language' })}</div>`,
        check: s => ({ ...(!s.title.trim() && { title: 'A title is needed.' }), ...(!s.type && { type: 'Choose what kind of title it is.' }),
          ...(!/^\d{4}$/.test(String(s.year)) || s.year < 1888 || s.year > thisYear + 6 ? { year: 'Enter the year as four digits.' } : s.status === 'Released' && s.year > thisYear ? { year: 'A released title cannot have a year in the future. Change the status or the year.' } : {}) }) },
      { name: 'Story', title: 'Story and details', intro: 'Say what it is about. One or two sentences without spoilers are enough.',
        html: f => `<div class="cf-grid">
          ${f.field('desc', 'Description', { req: 1, wide: 1, area: 4, ph: 'What is it about?' })}
          ${f.field('tagline', 'Tagline', { wide: 1, ph: 'The line on the poster' })}
          <div class="cf-f wide"><label>Genres<small>optional · up to three</small></label>${f.chips('genres', GENRES, 3)}</div>
          ${f.field('country', 'Country', { ph: 'Türkiye' })}${f.field('language', 'Language', { ph: 'Turkish' })}
          ${f.field('runtime', 'Running time in minutes', { type: 'number', min: 1, ph: '94' })}${f.field('colour', 'Colour', { options: ['Colour', 'Black and white', 'Both'], blank: 'Not set' })}
          ${f.field('released', 'Release date', { type: 'date' })}${f.field('premiere', 'Where it was first shown', { ph: 'A festival, a cinema, online…' })}
          ${f.field('watch', 'Where to watch it', { type: 'url', ph: 'https://' })}${f.field('site', 'Official site', { type: 'url', ph: 'https://' })}
          ${f.field('imdb', 'IMDb page', { type: 'url', ph: 'https://www.imdb.com/title/tt…' })}${f.field('proof', 'Proof that it exists', { type: 'url', ph: 'A festival page, a review, a listing', hint: 'Not required, but a link speeds up the check.' })}</div>`,
        check: s => (s.desc.trim().length < 20 ? { desc: 'Write at least one sentence (20 characters or more).' } : {}) },
      { name: 'People', title: 'Cast and crew', intro: 'Every title needs its director and your own part in it. Add as many others as you like — each of them gets the credit on their page too.', keepOne: ['directors'],
        html: f => `${people}<div class="cf-grid">
          ${f.list('directors', 'Director', [{ k: 'name', ph: 'Full name', list: 'people' }], { req: 1, add: 'Add a co-director' })}
          ${f.field('role', 'Your part in it', { req: 1, options: ROLES, blank: 'Choose your role', redraw: 1, hint: `This is the credit added to ${esc(myName)}'s page.` })}
          ${state.role === 'Actor' ? f.field('character', 'Character you played', { ph: 'Character name' }) : '<div></div>'}
          ${f.list('writers', 'Writers', [{ k: 'name', ph: 'Full name', list: 'people' }], { add: 'Add a writer' })}
          ${f.list('producers', 'Producers', [{ k: 'name', ph: 'Full name', list: 'people' }], { add: 'Add a producer' })}
          ${f.list('cast', 'Cast', [{ k: 'name', ph: 'Full name', list: 'people' }, { k: 'as', ph: 'Character' }], { add: 'Add a cast member' })}
          ${f.list('crew', 'Crew', [{ k: 'name', ph: 'Full name', list: 'people' }, { k: 'as', ph: 'Role, e.g. Editor' }], { add: 'Add a crew member' })}</div>`,
        check: s => ({ ...(!named(s.directors).length && { 'directors.0.name': 'A director is needed.' }), ...(!s.role && { role: 'Choose what you did on this title.' }) }) },
      { name: 'Extras', title: 'Companies and poster', intro: 'All optional. A poster makes the title easier to find.',
        html: f => `<div class="cf-grid">
          <div class="cf-f wide"><label>Poster<small>optional</small></label><div class="cf-poster">${state.poster ? `<img src="${state.poster}" alt="">` : '<span class="muted small">No poster yet</span>'}
            <span><label class="btn small" style="display:inline-flex;margin:0"><input type="file" accept="image/*" data-poster hidden>${state.poster ? 'Replace' : 'Choose an image'}</label>${state.poster ? ' <button type="button" class="btn small bare" data-poster-x>Remove</button>' : ''}<p class="cf-hint">JPG or PNG, upright.</p></span></div></div>
          ${f.list('companies', 'Production companies', [{ k: 'name', ph: 'Company name' }], { add: 'Add a company' })}
          ${f.list('distributors', 'Distributors', [{ k: 'name', ph: 'Company name' }], { add: 'Add a distributor' })}
          ${f.field('trailer', 'Trailer', { type: 'url', ph: 'https://' })}${f.field('budget', 'Budget', { ph: '$40,000' })}</div>`,
        after: (root, s, draw) => {
          root.querySelector('[data-poster]')?.addEventListener('change', async e => { const p = e.target.files[0] && await imageThumb(e.target.files[0], 520); if (p) { s.poster = p; keep('draft:credit', s); draw(); } });
          root.querySelector('[data-poster-x]')?.addEventListener('click', () => { s.poster = ''; keep('draft:credit', s); draw(); });
        } },
      { name: 'Check', title: 'Check and submit', intro: 'Look it over. Anything marked as missing has to be filled in before you can submit.',
        html: (f, s, { errors, go }) => {
          const miss = k => (errors[k] ? '<dd class="cf-miss">Missing — required</dd>' : null);
          const row = (label, value, key) => { const m = key && miss(key); return m || value ? `<dt>${label}${key ? star : ''}</dt>${m || `<dd>${esc(value)}</dd>`}` : ''; };
          const list = rows => named(rows).map(r => r.name.trim() + (r.as ? ` (${r.as.trim()})` : '')).join(', ');
          const block = (i, name, rows) => `<div class="cf-review"><div class="cf-review-h"><b>${name}</b><button type="button" class="link" ${go(i)}>Edit</button></div><dl>${rows}</dl></div>`;
          return block(0, 'Title', row('Title', s.title, 'title') + row('Type', s.type, 'type') + row('Status', s.status) + row('Year', s.year, 'year') + row('Original title', s.original))
            + block(1, 'Story and details', row('Description', s.desc, 'desc') + row('Tagline', s.tagline) + row('Genres', s.genres.join(', ')) + row('Country', s.country) + row('Language', s.language) + row('Running time', s.runtime && s.runtime + ' min') + row('Colour', s.colour) + row('Release date', s.released) + row('First shown', s.premiere) + row('Where to watch', s.watch) + row('Official site', s.site) + row('IMDb', s.imdb) + row('Proof', s.proof))
            + block(2, 'Cast and crew', row('Director', list(s.directors), 'directors.0.name') + row('Your part', s.role + (s.character ? ` (${s.character})` : ''), 'role') + row('Writers', list(s.writers)) + row('Producers', list(s.producers)) + row('Cast', list(s.cast)) + row('Crew', list(s.crew)))
            + block(3, 'Companies and poster', (row('Poster', s.poster && 'Added') + row('Production companies', list(s.companies)) + row('Distributors', list(s.distributors)) + row('Trailer', s.trailer) + row('Budget', s.budget)) || '<dt>Nothing added</dt><dd class="muted">Optional</dd>')
            + `<label class="cf-confirm" data-e="confirm"><input type="checkbox" data-f="confirm"${s.confirm ? ' checked' : ''}> <span>This is true to the best of my knowledge, and I worked on this title.${star}</span></label>
               <p class="muted small" style="margin-top:10px">Prototype: the title and your credit are kept in this browser. On the real platform a submission is checked before it appears to everyone.</p>`;
        },
        check: s => (s.confirm ? {} : { confirm: 'Please confirm before you submit.' }) },
    ];
    wizard(creditRoot, { state, steps, draft: 'draft:credit', submitLabel: editing ? 'Save changes' : 'Submit the title', done: s => {
      const all = titles();
      let id = editing ? param('edit') : slugify(s.title) + '-' + s.year; while (!editing && all[id]) id += '-2';
      const clean = k => { s[k] = named(s[k]).map(r => ({ name: r.name.trim(), ...(r.as && { as: r.as.trim() }) })); };
      ['directors', 'writers', 'producers', 'cast', 'crew', 'companies', 'distributors'].forEach(clean);
      all[id] = { ...s, id, title: s.title.trim(), year: Number(s.year), by: myName, added: editing?.added || new Date().toISOString().slice(0, 10) };
      if (!keep('titles', all)) { delete all[id].poster; keep('titles', all); }
      pages.forEach(p => { const ed = load('edits:' + p) || {}; ed.credits = [...(ed.credits || []).filter(c => c.id !== id), { id, title: all[id].title, year: all[id].year, role: s.role }]; keep('edits:' + p, ed); });
      try { localStorage.removeItem('draft:credit'); } catch {}
      // signed in with a wallet: the title is kept by the site, so everyone sees it and the credit shows on the wallet's page
      const sent = session ? fetch('/api/titles', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session, title: all[id] }) }).then(r => r.json().then(d => (r.ok ? '' : d.error || 'error'))).catch(() => 'offline') : Promise.resolve('none');
      sent.then(problem => { if (!problem) { const now = titles(); if (now[id]) { now[id].owner = session.address; keep('titles', now); } } return problem; }).then(problem => finished(creditRoot, editing ? 'Saved' : 'Your credit is added', `<b>${esc(all[id].title)}</b> (${all[id].year}) now has its own page, and <b>${esc(s.role)}</b> is on your credits.<br><span class="small">${!problem ? 'Everyone can see it.' : problem === 'none' ? 'It is kept in this browser. Log in with a wallet before adding a credit to publish it for everyone.' : problem === 'offline' ? 'It is kept in this browser; the site could not be reached to publish it.' : 'It is kept in this browser only: ' + esc(problem) + '.'}</span>`,
        [['Open the title', 'title.html?id=' + encodeURIComponent(id)], ['See your credits', (session ? 'artist.html?wallet=' + session.address : 'creator.html') + '#credits'], ['Add another', 'add-credit.html']]));
    } });
  }

  /* ---------- a title's own page ---------- */

  const titleRoot = $('[data-title-page]');
  if (titleRoot) (async () => {
    let t = titles()[param('id')]; const local = !!t;
    if (!t) { titleRoot.innerHTML = '<div class="page-head"><h1>Loading…</h1></div>'; t = (await TITLES).find(x => x.id === param('id')); }
    const mineOnSite = t && t.owner && session && session.address === t.owner;
    if (t && t.owner && !t.added) t.added = new Date(t.at).toISOString().slice(0, 10);
    if (!t) titleRoot.innerHTML = '<div class="page-head"><h1>Title not found</h1><p>This title is not in this browser. <a class="link" href="add-credit.html">Add a credit</a>.</p></div>';
    else {
      document.title = `${t.title} (${t.year}) — dein.art`;
      const link = n => (who[n] ? `href="${artistUrl(n)}"` : '');
      const card = (n, role) => `<${who[n] ? 'a' : 'div'} class="castp" ${link(n)}>${who[n] ? avatar(n) : `<span class="avatar" style="background:${tone(n)}">${initials(n)}</span>`}<span><b>${esc(n)}</b><span class="muted small">${esc(role)}</span></span></${who[n] ? 'a' : 'div'}>`;
      const crew = [...t.directors.map(p => [p.name, 'Director']), ...t.writers.map(p => [p.name, 'Writer']), ...t.producers.map(p => [p.name, 'Producer']), ...t.crew.map(p => [p.name, p.as || 'Crew'])];
      if (!crew.some(([n, r]) => n === t.by && r === t.role) && t.role !== 'Actor') crew.push([t.by, t.role]);
      const cast = [...(t.role === 'Actor' && !t.cast.some(p => p.name === t.by) ? [[t.by, t.character || 'Actor']] : []), ...t.cast.map(p => [p.name, p.as || 'Cast'])];
      const facts = { Type: t.type, Status: t.status, Country: t.country, Language: t.language, 'Running time': t.runtime && t.runtime + ' min', Colour: t.colour, 'Release date': t.released, 'First shown': t.premiere, 'Original title': t.original, Budget: t.budget,
        'Production': t.companies.map(c => c.name).join(', '), Distribution: t.distributors.map(c => c.name).join(', ') };
      const url = u => esc(/^https?:\/\//.test(u) ? u : 'https://' + u);
      const links = [[t.watch, '▶ Watch'], [t.trailer, 'Trailer'], [t.site, 'Official site'], [t.imdb, 'IMDb'], [t.proof, 'Source']].filter(([u]) => u);
      titleRoot.innerHTML = `
        <p class="crumbs"><a href="category.html?c=${(CATEGORIES.find(c => c[1] === t.type) || CATEGORIES[0])[0]}">${esc(t.type)}</a> › ${esc(t.title)}</p>
        <div class="tp"><div class="tp-poster">${t.poster ? `<img src="${esc(t.poster)}" alt="">` : `<span>${esc(t.title)}</span>`}</div>
          <div class="tp-main"><p class="eyebrow">${esc(t.type)} · ${esc(t.status)}</p><h1>${esc(t.title)} <span class="muted">${t.year}</span></h1>
            ${t.tagline ? `<p class="tp-tag">${esc(t.tagline)}</p>` : ''}<p class="lead">${esc(t.desc)}</p>
            ${t.genres.length ? `<div class="cf-chips" style="margin-top:14px">${t.genres.map(g => `<span class="chip">${esc(g)}</span>`).join('')}</div>` : ''}
            <p class="tp-by">Directed by ${t.directors.map(d => (who[d.name] ? `<a class="link" ${link(d.name)}>${esc(d.name)}</a>` : `<b>${esc(d.name)}</b>`)).join(', ')}</p>
            ${links.length ? `<div class="tp-links">${links.map(([u, l], i) => `<a class="btn${i ? '' : ' primary'}" href="${url(u)}" target="_blank" rel="noopener">${l} ↗</a>`).join('')}</div>` : ''}
            <dl class="facts">${Object.entries(facts).filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div></div>
        ${cast.length ? `<div class="sec"><h2>Cast</h2></div><div class="cf-people">${cast.map(c => card(...c)).join('')}</div>` : ''}
        <div class="sec"><h2>Crew</h2></div><div class="cf-people">${crew.map(c => card(...c)).join('')}</div>
        ${local || mineOnSite ? `<div class="box tp-own"><span><b>Added by you on ${esc(t.added)}</b><br><span class="muted small">${t.owner || mineOnSite ? 'Everyone can see this title.' : 'This title is kept in this browser. Log in with a wallet and save it again to publish it for everyone.'}</span></span>
          <span>${local ? `<a class="btn" href="add-credit.html?edit=${encodeURIComponent(t.id)}">✎ Edit</a> ` : ''}<button class="btn" data-title-x>Remove</button></span></div>`
          : `<div class="box tp-own"><span><b>Added on ${esc(t.added || '')} by <a class="link" href="artist.html?wallet=${t.owner}">${ensTag(t.owner)}</a></b><br><span class="muted small">Credits on dein.art are added by the people who worked on a title.</span></span></div>`}`;
      $('[data-title-x]')?.addEventListener('click', () => {
        if (!confirm(`Remove “${t.title}” and your credit on it?`)) return;
        const all = titles(); delete all[t.id]; keep('titles', all);
        pages.forEach(p => { const ed = load('edits:' + p); if (ed?.credits) { ed.credits = ed.credits.filter(c => c.id !== t.id); keep('edits:' + p, ed); } });
        const leave = () => { location.href = (session ? 'artist.html?wallet=' + session.address : 'creator.html') + '#credits'; };
        if (session) fetch('/api/titles/' + t.id, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ session }) }).then(leave, leave); else leave();
      });
    }
  })();

  // titles added as credits show up under their category: the ones in this browser, then everyone's
  if (page === 'category') {
    const label = (CATEGORIES.find(c => c[0] === param('c')) || CATEGORIES[0])[1], grid = $('[data-cat="grid"]'), shown = new Set();
    const add = list => { const fresh = list.filter(t => t.type === label && !shown.has(t.id)); if (!fresh.length) return; fresh.forEach(t => shown.add(t.id));
      if (!grid.querySelector('.card')) grid.innerHTML = '';
      grid.insertAdjacentHTML('afterbegin', fresh.map(t => `<a class="card" href="title.html?id=${encodeURIComponent(t.id)}"><div class="thumb${t.poster ? '' : ' blank'}">${t.poster ? `<img src="${esc(t.poster)}" alt="">` : ''}<span class="badge kind">${t.owner ? 'Added as a credit' : 'Added by you'}</span></div><div class="meta"><div><h3>${esc(t.title)}</h3><p>${esc(t.directors.map(d => d.name).join(', '))} · ${t.year}</p></div></div></a>`).join('')); };
    add(Object.values(titles())); TITLES.then(add);
  }

  /* ---------- share an asset ---------- */

  const shareRoot = $('[data-share-form]');
  if (shareRoot) {
    const CATS_ = ['Footage', 'Music', 'Sound effects', 'Photos & images', 'Templates', 'Scripts & documents'];
    const SUBS = { 'Scripts & documents': ['Scripts', 'Storyboards', 'Shot lists', 'Budgets & schedules', 'Contracts & releases', 'Pitch decks', 'Press kits'], Templates: ['Colour grading', 'Titles & lower thirds', 'Overlays', 'Premiere Pro', 'DaVinci Resolve', 'After Effects', 'Final Cut Pro', 'EDIUS', 'Photoshop', 'Project files'],
      Footage: ['Raw footage', 'Behind the scenes', 'Drone', 'Archival film'], Music: ['Score', 'Songs', 'Stems'], 'Sound effects': ['Packs', 'Ambience', 'Foley'], 'Photos & images': ['Photography', 'Film stills', 'Posters & lobby cards', 'Digital art', 'Illustrations'] };
    CATS_.forEach(c => { SUBS[c] = [...new Set([...SUBS[c], ...MARKET.filter(x => x.cat === c).map(x => x.sub)])]; });
    const LICS = ['CC0 — no rights reserved', 'CC BY — free with credit', 'Standard licence — one project', 'Extended licence — unlimited projects', 'Editorial use only', 'Personal use only'];
    const kindOf = f => { const t = f.type.split('/')[0], x = f.name.split('.').pop().toLowerCase(); return ['image', 'video', 'audio'].includes(t) ? t : ['zip', 'rar', '7z', 'tar', 'gz'].includes(x) ? 'archive' : 'doc'; };
    const guess = (k, x) => ({ image: 'Photos & images', video: 'Footage', audio: 'Music' }[k] || (['cube', 'look', 'prproj', 'mogrt', 'aep', 'drp', 'drx', 'psd', 'fcpxml', 'ezp'].includes(x) ? 'Templates' : k === 'doc' ? 'Scripts & documents' : ''));
    // a tile for files that have no picture: the file type on a quiet card
    const tile = ext => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400"><rect width="640" height="400" fill="#eceef3"/><rect x="250" y="96" width="140" height="180" rx="14" fill="#fff" stroke="#c9cedb" stroke-width="3"/><path d="M276 150h88M276 180h88M276 210h56" stroke="#c9cedb" stroke-width="6" stroke-linecap="round"/><rect x="214" y="232" width="${Math.max(84, ext.length * 24 + 36)}" height="48" rx="10" fill="#5b4bff"/><text x="${214 + Math.max(84, ext.length * 24 + 36) / 2}" y="265" font-family="Arial,Helvetica,sans-serif" font-size="26" font-weight="700" fill="#fff" text-anchor="middle">${ext.toUpperCase().slice(0, 6)}</text></svg>`);
    const videoThumb = file => new Promise(res => { const v = document.createElement('video'), u = URL.createObjectURL(file); const end = r => { clearTimeout(t); URL.revokeObjectURL(u); res(r); }; const t = setTimeout(() => end(null), 5000);
      v.muted = true; v.preload = 'auto'; v.onloadeddata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); }; v.onseeked = () => { try { end(shrink(v, v.videoWidth, v.videoHeight)); } catch { end(null); } }; v.onerror = () => end(null); v.src = u; });
    const dataUrl = file => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => res(''); r.readAsDataURL(file); });
    const myFilms = filmsOf(who[ME]);

    const state = { files: [], mode: 'each', title: '', desc: '', cat: '', sub: '', pricing: 'free', price: '', lic: '', film: '', confirm: false };
    let redraw = () => {};
    async function addFiles(list) {
      for (const file of list) {
        if (state.files.some(x => x.name === file.name && x.size === file.size)) continue;
        const kind = kindOf(file), ext = file.name.includes('.') ? file.name.split('.').pop().toLowerCase() : 'file';
        const f = { file, name: file.name, size: file.size, kind, ext, title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase()), desc: '', cat: guess(kind, ext), sub: '', tags: '', thumb: '', data: '' };
        state.files.push(f); redraw();
        f.thumb = (kind === 'image' ? await imageThumb(file) : kind === 'video' ? await videoThumb(file) : '') || '';
        if (file.size <= 300e3) f.data = await dataUrl(file);   // small files can really be downloaded again in the prototype
        redraw();
      }
    }
    const pic = f => f.thumb || tile(f.ext);
    const steps = [
      { name: 'Files', title: 'Share an asset', intro: 'Photos, footage, music, sound effects, scripts, documents, templates, project files, zip or rar archives — add everything you want to share.',
        html: () => `<label class="fu-drop" data-e="files"><input type="file" multiple hidden data-files>
            <span class="fu-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4m0 0-4 4m4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg></span>
            <b>Drop your files here</b><span class="muted small">or click to choose · any kind of file, as many as you like</span></label>
          <div class="fu-list">${state.files.map((f, i) => `<div class="fu-card ok"><span class="fu-kind"${f.thumb ? ` style="background:center/cover url(${f.thumb});color:transparent"` : ''}>${esc(f.ext.toUpperCase().slice(0, 4))}</span><span class="fu-meta"><b>${esc(f.name)}</b><small>${fileSize(f.size)} · <em>Ready</em></small></span><button type="button" class="btn icon bare" data-rm="files.${i}" aria-label="Remove ${esc(f.name)}">✕</button></div>`).join('')}</div>
          <p class="muted small fu-note">${session ? 'You are logged in, so what you publish is stored on dein.art and everyone can see it. A file can be up to 25 MB.' : 'Log in with a wallet (top right) to publish for everyone, up to 25 MB a file. Without it, what you share stays in this browser.'}</p>`,
        after: root => {
          const drop = root.querySelector('.fu-drop'), input = root.querySelector('[data-files]');
          input.addEventListener('change', () => addFiles([...input.files]));
          drop.addEventListener('dragover', e => { e.preventDefault(); drop.classList.add('over'); });
          drop.addEventListener('dragleave', () => drop.classList.remove('over'));
          drop.addEventListener('drop', e => { e.preventDefault(); addFiles([...e.dataTransfer.files]); });
        },
        check: s => (s.files.length ? {} : { files: 'Add at least one file.' }) },
      { name: 'Describe', title: 'Describe each file', intro: 'Give every file a title and say what it is. A good description and a few tags are how people find it.',
        html: f => CATS_.map(c => `<datalist id="subs-${slugify(c)}">${SUBS[c].map(x => `<option value="${esc(x)}">`).join('')}</datalist>`).join('') + state.files.map((x, i) => `
          <div class="cf-file"><div class="cf-file-pic"><img src="${pic(x)}" alt=""><small>${esc(x.name)}<br>${fileSize(x.size)}</small></div>
            <div class="cf-grid">${f.field(`files.${i}.title`, 'Title', { req: 1, wide: 1 })}
              ${f.field(`files.${i}.desc`, 'Description', { wide: 1, area: 2, ph: 'What is it, how was it made, what is it good for?' })}
              ${f.field(`files.${i}.cat`, 'Category', { req: 1, options: CATS_, blank: 'Choose a category', redraw: 1 })}
              ${f.field(`files.${i}.sub`, 'Kind', { ph: x.cat ? SUBS[x.cat][0] : 'Choose a category first', list: x.cat ? 'subs-' + slugify(x.cat) : '' })}
              ${f.field(`files.${i}.tags`, 'Tags', { wide: 1, ph: 'rain, night, istanbul' })}</div></div>`).join(''),
        check: s => Object.assign({}, ...s.files.map((x, i) => ({ ...(!x.title.trim() && { [`files.${i}.title`]: 'A title is needed.' }), ...(!x.cat && { [`files.${i}.cat`]: 'Choose a category.' }) }))) },
      { name: 'Listing', title: 'How to share it', intro: 'Choose how it appears on the marketplace, what it costs and how it may be used.',
        html: f => `<div class="cf-grid">
          ${state.files.length > 1 ? `<div class="cf-f wide"><label>Publish as${star}</label>${f.picks('mode', [['each', 'Separate items', `${state.files.length} items, one page each`], ['pack', 'One pack', `One page with all ${state.files.length} files`]])}</div>` : ''}
          ${state.mode === 'pack' && state.files.length > 1 ? f.field('title', 'Pack title', { req: 1, wide: 1, ph: 'Rain and thunder — 12 field recordings' }) + f.field('desc', 'Pack description', { req: 1, wide: 1, area: 3, ph: 'What is in the pack?' })
            + f.field('cat', 'Category', { req: 1, options: CATS_, blank: 'Choose a category', redraw: 1 }) + f.field('sub', 'Kind', { ph: 'Packs', list: state.cat ? 'subs-' + slugify(state.cat) : '' }) + CATS_.map(c => `<datalist id="subs-${slugify(c)}">${SUBS[c].map(x => `<option value="${esc(x)}">`).join('')}</datalist>`).join('') : ''}
          <div class="cf-f wide"><label>Price${star}</label>${f.picks('pricing', [['free', 'Free', 'Anyone can download it'], ['paid', 'Paid', 'You set the amount']])}</div>
          ${state.pricing === 'paid' ? f.field('price', state.mode === 'pack' ? 'Amount in dollars' : 'Amount in dollars, per item', { req: 1, type: 'number', min: 2, ph: '15', hint: 'A flat $1 goes to dein.art each time; the rest is paid to you and your crew straight away.' }) : ''}
          ${f.field('lic', 'Licence', { req: 1, options: LICS, blank: 'Choose a licence', hint: 'What people may do with it.' })}
          ${session ? '' : f.field('film', 'Linked to one of your films', { options: myFilms.map(x => x.title), blank: 'Not linked to a film', hint: 'Only if it comes from that film. Otherwise leave it.' })}</div>`,
        check: s => { const pack = s.mode === 'pack' && s.files.length > 1; return { ...(pack && !s.title.trim() && { title: 'A title is needed.' }), ...(pack && s.desc.trim().length < 20 && { desc: 'Describe the pack in at least a sentence.' }), ...(pack && !s.cat && { cat: 'Choose a category.' }),
          ...(s.pricing === 'paid' && !(Number(s.price) >= 2) && { price: 'Enter an amount of $2 or more.' }), ...(!s.lic && { lic: 'Choose a licence.' }) }; } },
      { name: 'Check', title: 'Check and publish', intro: 'This is what goes on the marketplace.',
        html: (f, s, { errors, go }) => { const items = build(s), n = Object.keys(errors).filter(k => k !== 'confirm').length; return `
          ${n ? `<p class="cf-alert">${n === 1 ? 'One required thing is' : n + ' required things are'} still missing. <button type="button" class="link" ${go(errors.files ? 0 : Object.keys(errors).some(k => k.startsWith('files.')) ? 1 : 2)}>Fix it</button></p>` : ''}
          <div class="rows">${items.map(it => `<div class="row"><div class="thumb cf-mini"><img src="${it.pic}" alt=""></div><div class="info"><b>${esc(it.title || 'Untitled')}</b><span class="muted small">${esc(it.cat || 'No category')} · ${esc(it.sub)} · ${it.files.length === 1 ? fileSize(it.files[0].size) : it.files.length + ' files'}${it.film ? ' · from ' + esc(film[it.film].title) : ''}</span></div><span class="amount">${it.price ? '$' + it.price : 'Free'}</span></div>`).join('')}</div>
          <div class="cf-review" style="margin-top:16px"><dl><dt>Licence${star}</dt>${s.lic ? `<dd>${esc(s.lic)}</dd>` : '<dd class="cf-miss">Missing — required</dd>'}<dt>Shared by</dt><dd>${esc(myName)}</dd></dl></div>
          <label class="cf-confirm" data-e="confirm"><input type="checkbox" data-f="confirm"${s.confirm ? ' checked' : ''}> <span>I made this or have the right to share it.${star}</span></label>`; },
        check: s => (s.confirm ? {} : { confirm: 'Please confirm before you publish.' }) },
    ];
    function build(s) {
      const stamp = Date.now().toString(36), filmKey = (myFilms.find(x => x.title === s.film) || {}).key, price = s.pricing === 'paid' ? Number(s.price) || 0 : 0, lic = s.lic.split(' — ')[0];
      const file = x => ({ name: x.name, size: x.size, url: x.data || '', note: x.desc.trim(), local: true });
      const tags = x => x.tags.split(',').map(t => t.trim()).filter(Boolean);
      const base = { by: ME, creator: ME, price, lic, film: filmKey, mine: true, added: new Date().toISOString().slice(0, 10) };
      if (s.mode === 'pack' && s.files.length > 1) {
        const lead = s.files.find(x => x.thumb) || s.files[0], all = [...new Set(s.files.flatMap(tags))];
        return [{ ...base, id: `my-${slugify(s.title) || 'pack'}-${stamp}`, cat: s.cat, sub: s.sub.trim() || 'Packs', title: s.title.trim(), kind: 'image', pic: pic(lead), big: pic(lead), gallery: s.files.filter(x => x.thumb).length > 1 ? s.files.filter(x => x.thumb).map(x => x.thumb) : undefined,
          files: s.files.map(file), desc: s.desc.trim(), specs: { Files: s.files.length, Size: fileSize(s.files.reduce((a, x) => a + x.size, 0)), Tags: all.join(', ') } }];
      }
      return s.files.map((x, i) => ({ ...base, id: `my-${slugify(x.title) || 'item'}-${stamp}${i}`, cat: x.cat, sub: x.sub.trim() || (x.cat ? SUBS[x.cat][0] : ''), title: x.title.trim(), kind: x.kind === 'audio' && x.data ? 'audio' : 'image', audio: x.kind === 'audio' ? x.data : undefined,
        pic: x.kind === 'audio' && x.data ? '' : pic(x), big: pic(x), files: [file(x)], desc: x.desc.trim() || `${x.title.trim()}, shared by ${myName}.`, specs: { Format: x.ext.toUpperCase(), Size: fileSize(x.size), Tags: tags(x).join(', ') } }));
    }
    // kept in this browser only: the way it worked before there was a place to store files
    const publishLocal = s => {
      const items = build(s), old = load('shared') || [];
      // the browser only has room for so much: drop the kept files first, then the pictures
      if (!keep('shared', [...items, ...old])) { items.forEach(it => it.files.forEach(x => { x.url = ''; })); if (!keep('shared', [...items, ...old])) { items.forEach(it => { delete it.gallery; }); keep('shared', [...items, ...old]); } }
      return items;
    };
    // stored on dein.art for everyone: the files go up in pieces, then the items are published
    async function publishForAll(s, who_, progress) {
      const call = async (path, body) => { const r = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || 'The site answered ' + r.status); return d; };
      const previews = await Promise.all(s.files.map(x => (x.thumb ? fetch(x.thumb).then(r => r.blob()) : null)));
      const list = [...s.files.map(x => ({ blob: x.file, name: x.name, type: x.file.type || 'application/octet-stream' })), ...previews.map((b, i) => b && { blob: b, name: `preview-${i + 1}.jpg`, type: 'image/jpeg', of: i }).filter(Boolean)];
      const up = await call('/api/uploads', { session: who_, files: list.map(f => ({ name: f.name, type: f.type, size: f.blob.size })) });
      const total = list.reduce((n, f) => n + f.blob.size, 0); let sent = 0;
      for (let i = 0; i < list.length; i++) for (let n = 0; n < up.files[i].chunks; n++) {
        const piece = list[i].blob.slice(n * up.chunk, (n + 1) * up.chunk);
        for (let tries = 0; ; tries++) {
          const r = await fetch(`/api/uploads/${up.files[i].id}/${n}`, { method: 'PUT', headers: { 'x-upload-token': up.token }, body: piece }).catch(() => null);
          if (r && r.ok) break;
          if (tries >= 2) throw new Error((r && (await r.json().catch(() => ({}))).error) || 'The upload was interrupted');
          await new Promise(w => setTimeout(w, 1200));
        }
        sent += piece.size; progress(sent / total, `${fileSize(sent)} of ${fileSize(total)}`);
      }
      const idOf = i => up.files[i].id, previewOf = i => { const k = list.findIndex(f => f.of === i); return k >= 0 ? up.files[k].id : ''; };
      const by = (await resolveEns(who_.address).catch(() => null)) || who_.address.slice(0, 6) + '…' + who_.address.slice(-4);
      const price = s.pricing === 'paid' ? Number(s.price) || 0 : 0, lic = s.lic.split(' — ')[0], kind = x => (['image', 'video', 'audio'].includes(x.kind) ? x.kind : 'file');
      const pack = s.mode === 'pack' && s.files.length > 1, lead = Math.max(0, s.files.findIndex(x => x.thumb));
      const items = pack
        ? [{ title: s.title, desc: s.desc, cat: s.cat, sub: s.sub || 'Packs', price, lic, by, kind: 'file', tags: [...new Set(s.files.flatMap(x => x.tags.split(',').map(t => t.trim()).filter(Boolean)))].join(', '),
            thumb: previewOf(lead), gallery: s.files.map((x, i) => previewOf(i)).filter(Boolean), files: s.files.map((x, i) => ({ id: idOf(i), note: x.desc.trim() || x.title.trim() })) }]
        : s.files.map((x, i) => ({ title: x.title, desc: x.desc, cat: x.cat, sub: x.sub || SUBS[x.cat][0], price, lic, by, kind: kind(x), tags: x.tags, thumb: previewOf(i), files: [{ id: idOf(i), note: '' }] }));
      return (await call('/api/items', { session: who_, token: up.token, items })).items.map(d => ({ id: 'up-' + d.id, title: d.title }));
    }
    const done = (items, everyone) => finished(shareRoot, items.length === 1 ? 'It is on the marketplace' : `${items.length} items are on the marketplace`,
      (items.length === 1 ? `<b>${esc(items[0].title)}</b> has its own page now.` : 'Each one has its own page now.') + (everyone ? ' Everyone can see it.' : ' It is kept in this browser only.'),
      [[items.length === 1 ? 'Open its page' : 'Open the first one', itemUrl(items[0])], ['Go to the marketplace', 'market.html'], ['Share more', 'share-asset.html']]);
    // the last step: for everyone when logged in, with the choice to log in first, or in this browser only
    const stage = Object.assign(document.createElement('main'), { className: 'narrow form', hidden: true }); shareRoot.after(stage);
    const show = html => { shareRoot.hidden = true; stage.hidden = false; stage.innerHTML = html; window.scrollTo(0, 0); };
    const back = () => { stage.hidden = true; shareRoot.hidden = false; };
    let watch;
    async function publish(s) {
      clearInterval(watch);
      const who_ = load('session'), tooBig = s.files.filter(x => x.size > 25e6);
      const online = await fetch('/api/items').then(r => r.ok).catch(() => false);
      if (!online) return done(publishLocal(s), false);
      if (!who_) {
        show(`<h1>Publish for everyone</h1><p class="muted">Log in with your wallet and your files are stored on dein.art: everyone can see them, and they stay yours to remove. It is free and it is not a transaction.</p>
          <div class="actions" style="justify-content:flex-start;gap:8px;flex-wrap:wrap"><button class="btn primary" data-open-login>Log in with a wallet</button><button class="btn" data-stage="local">Keep it in this browser only</button><button class="btn bare" data-stage="back">Back</button></div>`);
        watch = setInterval(() => { if (load('session')) { clearInterval(watch); publish(s); } }, 600);
        return;
      }
      if (tooBig.length) return show(`<h1>${tooBig.length === 1 ? 'One file is' : tooBig.length + ' files are'} too large</h1><p class="muted">A file can be up to 25 MB for now: ${tooBig.map(x => `<b>${esc(x.name)}</b> (${fileSize(x.size)})`).join(', ')}. Take ${tooBig.length === 1 ? 'it' : 'them'} out, or keep everything in this browser only.</p>
        <div class="actions" style="justify-content:flex-start;gap:8px"><button class="btn primary" data-stage="back">Back to the files</button><button class="btn" data-stage="local">Keep it in this browser only</button></div>`);
      show(`<h1>Publishing…</h1><p class="muted">Your files are going up. Keep this page open.</p><div class="cf-bar"><i></i></div><p class="muted small" data-stage-note>Starting…</p>`);
      try { done(await publishForAll(s, who_, (p, label) => { $('.cf-bar i', stage).style.width = Math.round(p * 100) + '%'; $('[data-stage-note]', stage).textContent = label; }), true); stage.hidden = true; shareRoot.hidden = false; }
      catch (e) { show(`<h1>It did not go through</h1><p class="muted">${esc(e.message || 'Something went wrong')}.</p><div class="actions" style="justify-content:flex-start;gap:8px;flex-wrap:wrap"><button class="btn primary" data-stage="retry">Try again</button><button class="btn" data-stage="local">Keep it in this browser only</button><button class="btn bare" data-stage="back">Back</button></div>`); }
    }
    stage.addEventListener('click', e => { const b = e.target.closest('[data-stage]'); if (!b) return; clearInterval(watch);
      if (b.dataset.stage === 'back') back(); else if (b.dataset.stage === 'local') { back(); done(publishLocal(state), false); } else publish(state); });
    wizard(shareRoot, { state, steps, submitLabel: 'Publish', done: publish });
    redraw = () => { const b = shareRoot.querySelector('.cf-step'); if (b?.classList.contains('on')) b.click(); };
  }
})();
