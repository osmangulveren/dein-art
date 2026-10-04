/* The big catalogue: public-domain films from Wikimedia Commons and the Internet Archive.

   There are far too many to send to every page, so they live in pieces under films/ and a page takes only what it needs:
     films/index.js     how many films each category has, and the best known of each   (every page)
     films/c/<slug>.js  one category                                                   (its page, and the search)
     films/d/<xx>.js    everything about a film                                        (the film's page)
     films/p/<xx>.js    the people credited, with their films                          (a person's page)
   A film from these files becomes an entry in CATALOG.films, shaped like the hand-picked ones, so the rest of the site
   does not need to know where a film came from. This script runs before app.js; what a page needs straight away is
   written into the page so that it has arrived by the time app.js starts. */

const FILMS = (() => {
  const CATS = ['feature-film', 'documentary', 'short-film', 'animation', 'series', 'vlog', 'entertainment', 'reality-show', 'podcast', 'course', 'tutorial', 'music-video'];
  const KINDS = ['Feature film', 'Documentary', 'Short film', 'Animation', 'Series', 'Vlog', 'Entertainment', 'Reality show', 'Podcast', 'Course', 'Tutorial', 'Music video'];
  const COMMONS = 'https://upload.wikimedia.org/wikipedia/commons/', ARCHIVE = 'https://archive.org/';
  const index = typeof FILMS_INDEX !== 'undefined' ? FILMS_INDEX : { total: 0, counts: {}, shards: 256, picks: [] };
  const have = new Map(CATALOG.films.map(f => [f.key, f])), rows = new Map(), loaded = new Set();
  const clock = s => { const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(Math.floor(s % 60)).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };
  // Why a film is free to show. The last one is the weakest, and the film's page says so.
  const WHY = {
    commons: f => `${f.lic} · Wikimedia Commons`, wikidata: () => 'Public domain, as recorded on Wikidata', early: () => 'Public domain: first shown before 1931',
    prelinger: () => 'Public domain: the Prelinger Archives', newsreel: () => 'Public domain: released by Universal in 1976', usgov: () => 'Public domain: a work of the United States government',
    marked: () => 'Marked public domain at the Internet Archive by whoever put it there',
  };

  // a row from the files, as a film the rest of the site understands
  function film(r) {
    if (have.has(r[0])) return have.get(r[0]);
    const f = { key: r[0], title: r[1], year: r[2] || '', secs: r[3], dur: r[3] ? clock(r[3]) : '', by: r[4].split('|'), kind: r[5], cat: CATS[r[6]], country: [], company: [], scenes: [], crew: [], blurb: '', lic: 'Public domain', lite: true };
    f.creator = f.by[0];
    if (r[7] === 0) {
      const path = `${r[9][0]}/${r[9]}/${r[8]}`;
      Object.assign(f, { path, name: r[8], tb: `${COMMONS}thumb/${path}/`, tn: r[12] || r[8] + '.jpg', w: r[10], at: r[11], page: 'https://commons.wikimedia.org/wiki/File:' + r[8], source: 'Wikimedia Commons' });
    } else Object.assign(f, { ia: r[8], pic: `${ARCHIVE}services/img/${r[8]}`, page: `${ARCHIVE}details/${r[8]}`, source: 'Internet Archive' });
    have.set(f.key, f); rows.set(f.key, r); CATALOG.films.push(f);
    return f;
  }
  const mp4 = (id, name) => `${ARCHIVE}download/${encodeURIComponent(id)}/${name.split('/').map(encodeURIComponent).join('/')}`;

  const api = {
    total: index.total, counts: index.counts, names: [], known: new Set(), why: f => (WHY[f.why] || (() => f.lic))(f), mp4, clock, rowOf: key => rows.get(key),
    // one category arrived
    rows(slug, list) { list.forEach(film); loaded.add(slug); },
    // everything about some films arrived
    detail(all) {
      Object.values(all).forEach(d => {
        const f = film(d.r);
        if (!f.lite) return;
        Object.assign(f, { lite: false, blurb: d.b || '', country: d.co || [], company: d.cm || [], lic: d.l, why: d.y, wd: d.wd, imdb: d.im, wiki: d.wk,
          crew: (d.cr || []).map(([name, role, pct, pic]) => {
            // enough about each person to show a face and a role here; their own page loads the rest
            api.known.add(name);
            if (!CATALOG.people[name]) CATALOG.people[name] = { name, role: role.startsWith('Cast') ? 'Actor' : role.split(',')[0], pic, films: [], credits: [], occ: [], stub: true };
            return { name, role, pct };
          }), rel: (d.rel || []).map(r => film(r).key) });
        if (f.path) {
          const t = `${COMMONS}transcoded/${f.path}/${f.name}.`;
          f.webm = d.v & 1 ? t + '480p.vp9.webm' : d.v & 2 ? t + '240p.vp9.webm' : COMMONS + f.path;
          f.hd = d.v & 4 ? t + '1080p.vp9.webm' : null; f.mov = d.v & 8 ? t + '360p.mpeg4.mov' : null;
          // no one has named this film's scenes, so the chapters are five moments spread across it, called by their time
          if (f.secs >= 240) { f.auto = true; f.scenes = [.12, .3, .5, .7, .88].map(x => { const s = Math.round(f.secs * x); return [s, clock(s)]; }); }
        } else if (d.f) f.mp4 = mp4(f.ia, d.f);
      });
    },
    // some people arrived, with the films they are credited on
    people(list, films) {
      films.forEach(film);
      list.forEach(p => {
        const old = CATALOG.people[p.name];
        if (!old || old.stub) { CATALOG.people[p.name] = p; return; }
        // someone the site already had: their other films join the ones listed
        old.films = [...new Set([...old.films, ...p.films])];
        p.credits.forEach(g => {
          let mine = old.credits.find(x => x.role === g.role);
          if (!mine) old.credits.push(mine = { role: g.role, total: 0, list: [] });
          g.list.forEach(c => { const same = mine.list.find(x => x.title.toLowerCase() === c.title.toLowerCase() && (!x.year || !c.year || Math.abs(x.year - c.year) <= 1)); if (same) same.key = same.key || c.key; else { mine.list.push(c); mine.total++; } });
          mine.list.sort((a, b) => (b.year || 0) - (a.year || 0));
        });
      });
    },
    // Films released on dein.art by their makers, as the server keeps them. These are the only films here with living
    // people, real wallets and a real split, so what people typed is kept as plain text.
    releases: [],
    released(list) {
      const plain = t => String(t || '').replace(/[<>]/g, '').replace(/"/g, '”');
      (list || []).forEach(d => {
        if (!d || have.has(d.id)) return;
        const crew = (d.people || []).map(p => ({ name: plain(p.name), role: plain(p.role) || 'Crew', pct: p.share || 0, wallet: p.wallet || '' }));
        const dirs = crew.filter(p => /director/i.test(p.role)).map(p => p.name).slice(0, 2), title = plain(d.title);
        // a film with no picture gets a plain tile in its own colour
        const hue = [...title].reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
        const tile = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 9"><rect width="16" height="9" fill="hsl(${hue} 32% 22%)"/><circle cx="8" cy="4.5" r="1.1" fill="#f5a623"/></svg>`);
        const f = { key: d.id, title, year: d.year, secs: d.secs || 0, dur: d.secs ? clock(d.secs) : '', by: dirs.length ? dirs : [crew[0] ? crew[0].name : 'Unknown maker'], kind: KINDS[CATS.indexOf(d.kind)] || 'Film', cat: d.kind,
          country: [], company: [], scenes: [], crew, blurb: plain(d.desc), language: plain(d.language), lic: 'Released by its makers', owner: d.owner, at: d.at, support: d.support !== false, w: d.w || 0,
          pic: d.poster ? '/api/files/' + d.poster : d.link && d.link.site === 'youtube' ? `https://i.ytimg.com/vi/${d.link.id}/hqdefault.jpg` : d.thumb || tile };
        if (d.video) f[d.video.type === 'video/webm' ? 'webm' : d.video.type === 'video/quicktime' ? 'mov' : 'mp4'] = '/api/files/' + d.video.id;
        if (d.link) f.embed = d.link;
        f.creator = f.by[0]; have.set(f.key, f); CATALOG.films.push(f); api.releases.push(f);
      });
      api.releases.sort((a, b) => b.at - a.at);
    },
    // the names of everyone who has a page, so that they can be searched for
    peopleNames(list) { api.names = list; list.forEach(([name]) => api.known.add(name)); },
    // the whole catalogue, for the search: asked for once, the first time it is wanted
    all() {
      return api.asked || (api.asked = Promise.all([...Object.keys(index.counts).filter(c => !loaded.has(c)).map(c => `films/c/${c}.js`), 'films/people.js'].map(src => new Promise(done => {
        const s = document.createElement('script'); s.src = src; s.onload = s.onerror = done; document.head.append(s);
      }))));
    },
    // some films are wanted by their address alone (the most watched, say): fetch the pieces that hold them
    shard: s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0; return (h % index.shards).toString(16).padStart(2, '0'); },
    need(keys) {
      const want = [...new Set(keys.filter(k => !have.has(k) && !k.includes('--') && /^[a-z0-9-]{1,64}$/.test(k)).map(api.shard))];
      return Promise.all(want.map(x => new Promise(done => { const s = document.createElement('script'); s.src = `films/d/${x}.js`; s.onload = s.onerror = done; document.head.append(s); })));
    },
    // a film someone is partway through, or kept for later, has to be findable on the home page too
    remember(f) {
      const r = rows.get(f.key); if (!r) return;
      try { const kept = JSON.parse(localStorage.getItem('filmrows')) || {}; delete kept[f.key]; kept[f.key] = r; const keys = Object.keys(kept); keys.slice(0, Math.max(0, keys.length - 80)).forEach(k => delete kept[k]); localStorage.setItem('filmrows', JSON.stringify(kept)); } catch {}
    },
  };

  index.picks.forEach(film);
  try { Object.values(JSON.parse(localStorage.getItem('filmrows')) || {}).forEach(film); } catch {}
  return api;
})();

// What this page needs before it can be drawn. The same sum as tools/catalog/14_films_build.py decides which file holds what.
(() => {
  if (!FILMS.total) return;
  const shard = FILMS.shard;
  const page = document.body.dataset.page, q = new URLSearchParams(location.search), want = src => document.write(`<script src="${src}"><\/script>`);
  const key = q.get('f'), known = key && CATALOG.films.find(f => f.key === key);
  // a film released here has "--" in its address (no catalogue film does) and comes from the server, not from the files
  if ((page === 'watch' || page === 'live') && key && /^[a-z0-9-]{1,64}$/.test(key) && key.includes('--')) want('/api/films.js?f=' + key);
  else if ((page === 'watch' || page === 'live') && key && /^[a-z0-9-]{1,64}$/.test(key) && (!known || known.lite)) want(`films/d/${shard(key)}.js`);
  if (page === 'category' && FILMS.counts[q.get('c')]) want(`films/c/${q.get('c')}.js`);
  if (page === 'artist' && q.get('name')) want(`films/p/${shard(q.get('name'))}.js`);
})();
