"""How complete are the credits on people's pages? Counts what each page lists, what Wikidata has, and what IMDb has.

  python3 tools/qa/credits.py <folder with IMDb's data files>

IMDb's files (title.principals, title.crew, title.basics .tsv.gz) come from https://datasets.imdbws.com, which IMDb offers
for personal and non-commercial use. They are used here only to count and compare: nothing from them is written to the
site. Note that title.principals holds the principal cast and crew of each title, not every credit, so IMDb's own pages
list more than this script can see.
"""
import sys, os, re, json, gzip, glob, csv, collections, time, hashlib, urllib.request, urllib.parse
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../..'); IMDB = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else IMDB; os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'dein-art-prototype/0.1 (https://github.com/osmangulveren/dein-art; credits check)'}

# ---------- what the site shows ----------
dec = json.JSONDecoder()
cat = json.loads(open(os.path.join(ROOT, 'prototype/assets/catalog.js')).read().split('const CATALOG = ', 1)[1].rstrip().rstrip(';'))
film_tt = {f['key']: f.get('imdb') for f in cat['films']}
for p in glob.glob(os.path.join(ROOT, 'prototype/films/d/*.js')):
    for key, d in dec.raw_decode(open(p).read().split('FILMS.detail(', 1)[1])[0].items(): film_tt[key] = d.get('im')
people = {}
for name, p in cat['people'].items():
    people[name] = dict(name=name, wd=p['wd'], imdb=p.get('imdb'), picked=True, total=sum(c['total'] for c in p['credits']), pairs={(x['key'], c['role']) for c in p['credits'] for x in c['list'] if x.get('key')},
                        titles={(x['title'].lower(), c['role']) for c in p['credits'] for x in c['list']})
for path in glob.glob(os.path.join(ROOT, 'prototype/films/p/*.js')):
    for p in dec.raw_decode(open(path).read().split('FILMS.people(', 1)[1])[0]:
        new = {(x['key'], c['role']) for c in p['credits'] for x in c['list']}; t = {(x['title'].lower(), c['role']) for c in p['credits'] for x in c['list']}
        if p.get('more'):
            if p['name'] in people: people[p['name']]['pairs'] |= new; people[p['name']]['titles'] |= t
        else: people[p['name']] = dict(name=p['name'], wd=p['wd'], imdb=p.get('imdb'), picked=False, total=0, pairs=new, titles=t)
for p in people.values(): p['listed'] = len({t for t, _ in p['titles']})          # different titles named on the page
print(len(people), 'people;', sum(1 for p in people.values() if p['imdb']), 'with an IMDb id', flush=True)

# ---------- what Wikidata has ----------
def sparql(q):
    key = os.path.join(IMDB, 'wd-' + hashlib.md5(q.encode()).hexdigest() + '.json')
    if os.path.exists(key): return json.load(open(key))
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request('https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q}), headers={**UA, 'Accept': 'application/sparql-results+json'}), timeout=120) as r: d = json.load(r)['results']['bindings']; break
        except Exception as e:
            if i == 4: raise
            time.sleep(6 + i * 8)
    json.dump(d, open(key, 'w')); time.sleep(.4); return d
PROPS = 'wdt:P57|wdt:P58|wdt:P161|wdt:P344|wdt:P1040|wdt:P162|wdt:P86|wdt:P2554'
qids = sorted({p['wd'] for p in people.values() if p['wd']}); wd = {}
for i in range(0, len(qids), 120):
    for b in sparql('SELECT ?p (COUNT(DISTINCT ?f) AS ?n) WHERE { VALUES ?p { %s } ?f %s ?p . } GROUP BY ?p' % (' '.join('wd:' + q for q in qids[i:i + 120]), PROPS)):
        wd[b['p']['value'].rsplit('/', 1)[1]] = int(b['n']['value'])
    if i % 1200 == 0: print('   Wikidata', i, '/', len(qids), flush=True)

# ---------- what IMDb has ----------
ours = {p['imdb'] for p in people.values() if p['imdb']}
imdb = collections.defaultdict(lambda: collections.defaultdict(set))          # person -> title -> the kinds of work
t0 = time.time()
with gzip.open(os.path.join(IMDB, 'title.principals.tsv.gz'), 'rt', encoding='utf-8') as f:
    next(f)
    for n, line in enumerate(f):
        a = line.split('\t', 4)
        if a[2] in ours: imdb[a[2]][a[0]].add(a[3])
        if n % 20000000 == 0: print('   principals', n // 1000000, 'million lines', round(time.time() - t0), 's', flush=True)
with gzip.open(os.path.join(IMDB, 'title.crew.tsv.gz'), 'rt', encoding='utf-8') as f:
    next(f)
    for line in f:
        t, d, w = line.rstrip('\n').split('\t')
        for who, kind in ((d, 'director'), (w, 'writer')):
            if who != '\\N':
                for x in who.split(','):
                    if x in ours: imdb[x][t].add(kind)
need = {t for titles in imdb.values() for t in titles}; kind = {}
with gzip.open(os.path.join(IMDB, 'title.basics.tsv.gz'), 'rt', encoding='utf-8') as f:
    next(f)
    for line in f:
        a = line.split('\t', 2)
        if a[0] in need: kind[a[0]] = a[1]
FILM = {'movie', 'short', 'tvMovie', 'video', 'tvShort', 'tvSpecial'}
SAME = {'Director': {'director'}, 'Writer': {'writer'}, 'Actor': {'actor', 'actress', 'self', 'archive_footage'}, 'Cinematographer': {'cinematographer'}, 'Editor': {'editor'}, 'Composer': {'composer'}, 'Producer': {'producer'}, 'Production designer': {'production_designer'}}

rows = []; unconfirmed = []; checked = 0
for p in people.values():
    mine = imdb.get(p['imdb'], {}) if p['imdb'] else {}
    # work on a film counts; old footage of someone reused in a later film does not
    films = {t for t in mine if kind.get(t) in FILM and mine[t] - {'archive_footage'}}
    # the other way round: is each credit the page lists also in IMDb's data?
    for key, role in p['pairs']:
        tt = film_tt.get(key)
        if not tt or not p['imdb'] or tt not in kind: continue
        checked += 1
        if tt not in mine: unconfirmed.append((p['name'], key, role, 'the person is not among the title\'s principal credits'))
        elif not (mine[tt] & SAME.get(role, set())): unconfirmed.append((p['name'], key, role, 'IMDb has them there as ' + ', '.join(sorted(mine[tt]))))
    rows.append(dict(name=p['name'], imdb=p['imdb'] or '', wikidata=p['wd'], hand_picked=int(p['picked']), on_page=p['listed'], counted_on_page=max(p['total'], p['listed']), in_wikidata=wd.get(p['wd'], 0), in_imdb_films=len(films), in_imdb_all=len(mine)))
with open(os.path.join(OUT, 'credits.csv'), 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(sorted(rows, key=lambda r: r['on_page'] - r['in_imdb_films']))
with open(os.path.join(OUT, 'credits-unconfirmed.csv'), 'w', newline='') as f: csv.writer(f).writerows([('person', 'film', 'role on dein.art', 'what IMDb\'s data says')] + unconfirmed)

known = [r for r in rows if r['imdb'] and r['in_imdb_films']]
S = lambda k, rs=known: sum(r[k] for r in rs)
print(f"\n{len(rows)} people. {len(known)} can be compared (an IMDb id, and at least one film there).")
print(f"credits named on their pages: {S('on_page'):,}   in Wikidata: {S('in_wikidata'):,}   film credits in IMDb's data: {S('in_imdb_films'):,}   (all IMDb titles, with TV episodes: {S('in_imdb_all'):,})")
print(f"so the pages name {S('on_page') / S('in_imdb_films'):.0%} of what IMDb has, and Wikidata holds {S('in_wikidata') / S('in_imdb_films'):.0%}")
for label, test in [('complete (the page names at least as many as IMDb)', lambda r: r['on_page'] >= r['in_imdb_films']), ('at least half', lambda r: r['in_imdb_films'] > r['on_page'] >= r['in_imdb_films'] / 2), ('less than half', lambda r: r['in_imdb_films'] / 2 > r['on_page'] >= r['in_imdb_films'] / 10), ('less than a tenth', lambda r: r['on_page'] < r['in_imdb_films'] / 10)]:
    print(f"   {label}: {sum(1 for r in known if test(r)):,}")
hp = [r for r in known if r['hand_picked']]
print(f"hand-picked people ({len(hp)}): pages name {S('on_page', hp):,}, count {S('counted_on_page', hp):,} (the rest behind 'and N more'), IMDb has {S('in_imdb_films', hp):,}")
print(f"could Wikidata fill the gap? people for whom Wikidata has at least 90% of IMDb's count: {sum(1 for r in known if r['in_wikidata'] >= .9 * r['in_imdb_films']):,}; less than half: {sum(1 for r in known if r['in_wikidata'] < .5 * r['in_imdb_films']):,}")
print(f"the other way round: {checked:,} credits on the pages could be looked up in IMDb's data; {checked - len(unconfirmed):,} are there with the same kind of work, {len(unconfirmed):,} are not")
print('   of those:', dict(collections.Counter('not among the principal credits' if 'principal' in u[3] else 'there, under another kind of work' for u in unconfirmed)))
print('furthest behind:'); [print(f"   {r['name']}: page {r['on_page']}, Wikidata {r['in_wikidata']}, IMDb {r['in_imdb_films']}") for r in sorted(known, key=lambda r: r['on_page'] - r['in_imdb_films'])[:15]]
for n in ('Buster Keaton', 'Charlie Chaplin', 'D. W. Griffith', 'Georges Méliès', 'F. W. Murnau', 'Lillian Gish', 'Max Schreck', 'Lois Weber'):
    r = next((r for r in rows if r['name'] == n), None)
    if r: print(f"   {n}: page {r['on_page']} (counted {r['counted_on_page']}), Wikidata {r['in_wikidata']}, IMDb {r['in_imdb_films']}")
print('no IMDb id:', sum(1 for r in rows if not r['imdb']), '; an IMDb id but no film there:', sum(1 for r in rows if r['imdb'] and not r['in_imdb_films']))
