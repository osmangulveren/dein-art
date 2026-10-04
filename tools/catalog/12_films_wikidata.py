# Every film on Wikidata that has its video on Wikimedia Commons, or a public-domain statement and an Internet Archive copy.
# Writes films_wd.json (not committed): the film entries, the Commons file of each, and the people credited.
from wm import *
import sys, re
from concurrent.futures import ThreadPoolExecutor
W = 'https://www.wikidata.org/w/api.php'
def sparql(s):
    key = 'cache/sparql-' + hashlib.md5(s.encode()).hexdigest() + '.json'
    if os.path.exists(key): return json.load(open(key))
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': s})
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, 'Accept': 'application/sparql-results+json'}), timeout=180) as r: d = json.load(r)['results']['bindings']; break
        except Exception as e:
            if i == 3: raise
            time.sleep(10 + i * 10)
    os.makedirs('cache', exist_ok=True); json.dump(d, open(key, 'w')); return d
TYPES = 'wd:Q11424 wd:Q24862 wd:Q226730 wd:Q202866 wd:Q93204 wd:Q17517379 wd:Q506240 wd:Q24869 wd:Q336144 wd:Q20667187 wd:Q18011172 wd:Q29168811 wd:Q5398426 wd:Q21191270 wd:Q1261214 wd:Q459435 wd:Q1259759 wd:Q10590726 wd:Q430525'
rows = sparql('SELECT ?f ?v ?role WHERE { ?f p:P10 ?st . ?st ps:P10 ?v . OPTIONAL { ?st pq:P3831 ?role } ?f wdt:P31/wdt:P279* wd:Q11424 . }')
vid = {}
for r in rows:
    q = r['f']['value'].rsplit('/', 1)[1]; name = urllib.parse.unquote(r['v']['value'].rsplit('/', 1)[1]).replace('_', ' ')
    vid.setdefault(q, []).append((name, r.get('role', {}).get('value', '').rsplit('/', 1)[-1]))
print(len(vid), 'films with a video on Commons', flush=True)
ia = {}
for r in sparql('SELECT ?f ?ia WHERE { VALUES ?t { %s } ?f wdt:P31 ?t ; wdt:P724 ?ia ; wdt:P6216 wd:Q19652 . }' % TYPES):
    ia.setdefault(r['f']['value'].rsplit('/', 1)[1], []).append(r['ia']['value'])
print(len(ia), 'public-domain films with an Internet Archive copy;', len(set(ia) - set(vid)), 'of them without a Commons video', flush=True)

def entities(ids, props='labels|descriptions|claims|sitelinks', langs='en|mul|fr|de|es|it|ru|sv|da|nl|pt|ja'):
    ids = list(dict.fromkeys(ids)); out = {}
    def one(i): return get(W, dict(action='wbgetentities', format='json', ids='|'.join(ids[i:i + 50]), props=props, languages=langs, sitefilter='enwiki'))['entities']
    with ThreadPoolExecutor(4) as ex:
        for n, d in enumerate(ex.map(one, range(0, len(ids), 50))):
            out.update(d)
            if n % 40 == 0: print('   entities', len(out), '/', len(ids), flush=True)
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
fe = entities(list(vid) + [q for q in ia if q not in vid])
films, people, aux = {}, {}, set()
for q, e in fe.items():
    if 'missing' in e: continue
    crew = []
    for p, role, n in ROLES:
        for x in ids(e, p)[:n]: crew.append((x, role)); people.setdefault(x, []).append(q)
    mins = [float(v['amount']) * (1 / 60 if v.get('unit', '').endswith('Q11574') else 60 if v.get('unit', '').endswith('Q25235') else 1) for v in vals(e, 'P2047') if isinstance(v, dict) and 'amount' in v]
    f = dict(q=q, title=label(e), desc=e.get('descriptions', {}).get('en', {}).get('value'), year=year(e, 'P577') or year(e, 'P571') or year(e, 'P580'), inst=ids(e, 'P31'), genre=ids(e, 'P136'), mins=max(mins) if mins else None,
             crew=crew, company=ids(e, 'P272')[:2], country=ids(e, 'P495')[:2], imdb=next((v for v in vals(e, 'P345') if isinstance(v, str)), None), pd=ids(e, 'P6216'),
             enwiki=e.get('sitelinks', {}).get('enwiki', {}).get('title'), videos=vid.get(q, []), ia=ia.get(q, []) or [v for v in vals(e, 'P724') if isinstance(v, str)])
    films[q] = f; aux.update(f['genre'] + f['company'] + f['country'] + f['inst'])
print(len(films), 'film entries;', len(people), 'people', flush=True)

# the Commons files: licence, size, length and the versions Commons has made of each
names = sorted({n for f in films.values() for n, _ in f['videos']})
files = {}
def info(i):
    d = get(C, dict(action='query', format='json', titles='|'.join('File:' + n for n in names[i:i + 25]), prop='videoinfo', viprop='url|size|mime|extmetadata|derivatives', viextmetadatafilter='LicenseShortName|License|Copyrighted|AttributionRequired|UsageTerms', viurlwidth=500))
    back = {x['to']: x['from'] for x in d.get('query', {}).get('normalized', [])}
    out = {}
    for p in d.get('query', {}).get('pages', {}).values():
        if 'videoinfo' not in p: continue
        v = p['videoinfo'][0]; em = v.get('extmetadata', {})
        out[back.get(p['title'], p['title'])[5:]] = dict(name=p['title'][5:], url=v.get('url'), thumb=v.get('thumburl'), w=v.get('width'), h=v.get('height'), dur=v.get('duration'), mime=v.get('mime'), size=v.get('size'),
            lic=em.get('LicenseShortName', {}).get('value'), terms=em.get('UsageTerms', {}).get('value'), attr=em.get('AttributionRequired', {}).get('value'), der=sorted({x.get('transcodekey') or 'original' for x in v.get('derivatives', [])}))
    return out
with ThreadPoolExecutor(4) as ex:
    for n, d in enumerate(ex.map(info, range(0, len(names), 25))):
        files.update(d)
        if n % 30 == 0: print('   files', len(files), '/', len(names), flush=True)
pe = entities(people.keys(), props='labels|descriptions|claims|sitelinks')
P = {}
for q, e in pe.items():
    if 'missing' in e or not label(e): continue
    P[q] = dict(q=q, name=label(e), desc=e.get('descriptions', {}).get('en', {}).get('value'), born=year(e, 'P569'), died=year(e, 'P570'), bp=(ids(e, 'P19') or [None])[0], dp=(ids(e, 'P20') or [None])[0], occ=ids(e, 'P106')[:4],
                img=next((v for v in vals(e, 'P18') if isinstance(v, str)), None), imdb=next((v for v in vals(e, 'P345') if isinstance(v, str)), None), enwiki=e.get('sitelinks', {}).get('enwiki', {}).get('title'), inst=ids(e, 'P31'))
    aux.update(x for x in [P[q]['bp'], P[q]['dp'], *P[q]['occ']] if x)
L = {q: label(e) for q, e in entities(aux, props='labels', langs='en|mul|fr|de').items() if 'missing' not in e}
json.dump(dict(films=films, files=files, people=P, labels=L), open('films_wd.json', 'w'), ensure_ascii=False)
print('written', len(films), 'films,', len(files), 'files,', len(P), 'people,', len(L), 'labels')
