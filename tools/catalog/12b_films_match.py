# Finds the Wikidata entry of Internet Archive films that came without one, by title and year, so that they get their
# makers and credits, and so that the same film put up twice (or under a title like Charlie Chaplin's "The Rink") is
# recognised as one film. Adds what it finds to films_wd.json and writes films_match.json (Archive item -> Wikidata id).
from wm import *
import re, html, unicodedata, collections
from concurrent.futures import ThreadPoolExecutor
W = 'https://www.wikidata.org/w/api.php'
def sparql(s):
    key = 'cache/sparql-' + hashlib.md5(s.encode()).hexdigest() + '.json'
    if os.path.exists(key): return json.load(open(key))
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': s})
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, 'Accept': 'application/sparql-results+json'}), timeout=170) as r: d = json.load(r)['results']['bindings']; break
        except Exception as e:
            if i == 4: raise
            time.sleep(15 + i * 15)
    os.makedirs('cache', exist_ok=True); json.dump(d, open(key, 'w')); time.sleep(1); return d
def slug(t):
    t = str(t).lower().replace('ı', 'i').replace('ß', 'ss').replace('ø', 'o')
    t = ''.join(c for c in unicodedata.normalize('NFD', t) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')
# A title as people write it at the Archive, down to the film's own name: Charlie Chaplin's "The Rink" (1916) [silent] -> the rink
def bare(t):
    t = html.unescape(str(t or ''))
    t = re.sub(r'''\s+(?:directed by|director[:,]?)\s+.*$''', '', t, flags=re.I)          # The Rink (1916) Directed By Charlie Chaplin
    t = re.sub(r'\s*[\[(][^\])]*[\])]\s*', ' ', t)
    t = re.sub(r'''^["“”'‘](.+?)["“”'’]\s*$''', r'\1', t.strip())                          # "What Drink Did"
    m = re.match(r'''^.+?['’]s?\s+["“”'‘](.+?)["“”'’]\s*$''', t.strip())
    if m: t = m.group(1)
    t = re.sub(r'\s+-\s+(full movie|full film|silent|complete).*$', '', t, flags=re.I)
    m = re.match(r'^(.*), (The|A|An)$', t.strip())
    if m: t = f'{m.group(2)} {m.group(1)}'
    return re.sub(r'^(the|a|an) ', '', slug(t).replace('-', ' ')).replace(' ', '')

wd = json.load(open('films_wd.json')); F, P, L = wd['films'], wd['people'], wd['labels']
items = json.load(open('ia_lists.json'))
have = {i for f in F.values() for i in f.get('ia', [])}
def year_of(it):
    y = str(it.get('year') or '')[:4] or str(it.get('date') or '')[:4]
    if y.isdigit() and 1880 < int(y) < 1980: return int(y)
    t = it.get('title'); t = t[0] if isinstance(t, list) else t
    m = re.search(r'\((18[89]\d|19[0-7]\d)\)', str(t or ''))
    return int(m.group(1)) if m else 0
cands = {}
for i, it in items.items():
    if i in have: continue
    t = it.get('title'); t = t[0] if isinstance(t, list) else t
    y = year_of(it)
    if not t or not y or len(bare(t)) < 3: continue
    cands[i] = (bare(t), y)
years = sorted({y for _, y in cands.values()})
print(len(cands), 'Archive films to look up, from', years[0], 'to', years[-1], flush=True)

# every film Wikidata has for each of those years, by its English name and its original title
index = collections.defaultdict(set)          # (bare title, year) -> ids
for y in years:
    rows = sparql('''SELECT ?f ?l ?o WHERE { ?f wdt:P577 ?d . FILTER(?d >= "%d-01-01T00:00:00Z"^^xsd:dateTime && ?d < "%d-01-01T00:00:00Z"^^xsd:dateTime)
      ?f wdt:P31/wdt:P279* wd:Q11424 . OPTIONAL { ?f rdfs:label ?l FILTER(LANG(?l) = "en") } OPTIONAL { ?f wdt:P1476 ?o } }''' % (y, y + 1))
    for b in rows:
        q = b['f']['value'].rsplit('/', 1)[1]
        for k in ('l', 'o'):
            if k in b and len(bare(b[k]['value'])) >= 3: index[(bare(b[k]['value']), y)].add(q)
    print('   ', y, len(rows), flush=True)
match, unsure = {}, 0
for i, (t, y) in cands.items():
    hits = index.get((t, y)) or (index.get((t, y - 1), set()) | index.get((t, y + 1), set()))
    if len(hits) == 1: match[i] = next(iter(hits))
    elif len(hits) > 1: unsure += 1
print(len(match), 'matched to one film;', unsure, 'left alone because more than one film has that title and year;', len(set(match.values())), 'different films', flush=True)

# the matched films' entries and people, in the shape 12_films_wikidata.py keeps them
def entities(ids, props='labels|descriptions|claims|sitelinks', langs='en|mul|fr|de|es|it|ru|sv|da|nl|pt|ja'):
    ids = list(dict.fromkeys(ids)); out = {}
    def one(i): return get(W, dict(action='wbgetentities', format='json', ids='|'.join(ids[i:i + 50]), props=props, languages=langs, sitefilter='enwiki'))['entities']
    with ThreadPoolExecutor(4) as ex:
        for d in ex.map(one, range(0, len(ids), 50)): out.update(d)
    return out
def vals(e, p):
    r = []
    for c in e.get('claims', {}).get(p, []):
        if c.get('rank') == 'deprecated': continue
        dv = c['mainsnak'].get('datavalue')
        if dv: r.append(dv['value'])
    return r
def ids(e, p): return [v['id'] for v in vals(e, p) if isinstance(v, dict) and 'id' in v]
def label(e):
    for l in ('en', 'mul', 'fr', 'de', 'es', 'it'):
        if l in e.get('labels', {}): return e['labels'][l]['value']
    return next((v['value'] for v in e.get('labels', {}).values()), None)
def year(e, p):
    ys = [int(x['time'][1:5]) for x in vals(e, p) if isinstance(x, dict) and 'time' in x]
    return min(ys) if ys else None
ROLES = [('P57', 'Director', 4), ('P58', 'Writer', 3), ('P344', 'Cinematographer', 2), ('P1040', 'Editor', 2), ('P86', 'Composer', 2), ('P162', 'Producer', 2), ('P2554', 'Production designer', 1), ('P161', 'Cast', 8)]
new = [q for q in set(match.values()) if q not in F]
people, aux = set(), set()
for q, e in entities(new).items():
    if 'missing' in e: continue
    crew = []
    for p, role, n in ROLES:
        for x in ids(e, p)[:n]: crew.append((x, role)); people.add(x)
    mins = [float(v['amount']) * (1 / 60 if v.get('unit', '').endswith('Q11574') else 60 if v.get('unit', '').endswith('Q25235') else 1) for v in vals(e, 'P2047') if isinstance(v, dict) and 'amount' in v]
    f = dict(q=q, title=label(e), desc=e.get('descriptions', {}).get('en', {}).get('value'), year=year(e, 'P577') or year(e, 'P571') or year(e, 'P580'), inst=ids(e, 'P31'), genre=ids(e, 'P136'), mins=max(mins) if mins else None,
             crew=crew, company=ids(e, 'P272')[:2], country=ids(e, 'P495')[:2], imdb=next((v for v in vals(e, 'P345') if isinstance(v, str)), None), pd=ids(e, 'P6216'),
             enwiki=e.get('sitelinks', {}).get('enwiki', {}).get('title'), videos=[], ia=[], matched=True)
    F[q] = f; aux.update(f['genre'] + f['company'] + f['country'] + f['inst'])
for q, e in entities([x for x in people if x not in P]).items():
    if 'missing' in e or not label(e): continue
    P[q] = dict(q=q, name=label(e), desc=e.get('descriptions', {}).get('en', {}).get('value'), born=year(e, 'P569'), died=year(e, 'P570'), bp=(ids(e, 'P19') or [None])[0], dp=(ids(e, 'P20') or [None])[0], occ=ids(e, 'P106')[:4],
                img=next((v for v in vals(e, 'P18') if isinstance(v, str)), None), imdb=next((v for v in vals(e, 'P345') if isinstance(v, str)), None), enwiki=e.get('sitelinks', {}).get('enwiki', {}).get('title'), inst=ids(e, 'P31'))
    aux.update(x for x in [P[q]['bp'], P[q]['dp'], *P[q]['occ']] if x)
L.update({q: label(e) for q, e in entities([x for x in aux if x not in L], props='labels', langs='en|mul|fr|de').items() if 'missing' not in e})
json.dump(dict(films=F, files=wd['files'], people=P, labels=L), open('films_wd.json', 'w'), ensure_ascii=False)
json.dump(match, open('films_match.json', 'w'))
print('written:', len(new), 'more film entries,', len(P), 'people in all')
