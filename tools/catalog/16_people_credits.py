# Everything Wikidata credits each person with: the films they directed, wrote, shot, cut, scored, produced, designed
# or acted in, with year. Writes people_credits.json (not committed); 14_films_build.py puts it on people's pages.
from wm import *
import sys, collections
def sparql(s):
    key = 'cache/sparql-' + hashlib.md5(s.encode()).hexdigest() + '.json'
    if os.path.exists(key): return json.load(open(key))
    url = 'https://query.wikidata.org/sparql'
    for i in range(5):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode({'query': s}).encode(), headers={**UA, 'Accept': 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded'})
            with urllib.request.urlopen(req, timeout=170) as r: d = json.load(r)['results']['bindings']; break
        except Exception as e:
            if i == 4: raise
            time.sleep(15 + i * 15)
    os.makedirs('cache', exist_ok=True); json.dump(d, open(key, 'w')); time.sleep(.6); return d
ROLES = {'P57': 'Director', 'P58': 'Writer', 'P161': 'Cast', 'P344': 'Cinematographer', 'P1040': 'Editor', 'P162': 'Producer', 'P86': 'Composer', 'P2554': 'Production designer'}
P = json.load(open('films_wd.json'))['people']
# only people who get a page: those who have died, or were born before 1900
qs = [q for q, p in P.items() if 'Q5' in p['inst'] and (p['died'] is not None or (p['born'] is not None and p['born'] < 1900))]
# and the hand-picked people of the first catalogue, whose pages listed only ten titles for each kind of work
cat = json.loads(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/catalog.js')).read().split('const CATALOG = ', 1)[1].rstrip().rstrip(';'))
qs += [p['wd'] for p in cat['people'].values() if p.get('wd') and p['wd'] not in qs]
out = json.load(open('people_credits.json')) if os.path.exists('people_credits.json') else {}
todo = [q for q in qs if q not in out]
print(len(qs), 'people;', len(todo), 'still to read', flush=True)
STEP = 30
for i in range(0, len(todo), STEP):
    batch = todo[i:i + STEP]
    rows = sparql('''SELECT ?p ?prop ?f ?l (MIN(YEAR(?d)) AS ?y) WHERE { VALUES ?p { %s } VALUES ?prop { %s } ?f ?prop ?p .
      OPTIONAL { ?f rdfs:label ?l FILTER(LANG(?l) = "en") } OPTIONAL { ?f wdt:P577 ?d } } GROUP BY ?p ?prop ?f ?l''' % (' '.join('wd:' + q for q in batch), ' '.join('wdt:' + p for p in ROLES)))
    got = collections.defaultdict(lambda: collections.defaultdict(list))
    for b in rows:
        if 'l' not in b: continue          # a film with no English name on Wikidata cannot be listed by name
        got[b['p']['value'].rsplit('/', 1)[1]][ROLES[b['prop']['value'].rsplit('/', 1)[1]]].append([b['f']['value'].rsplit('/', 1)[1], b['l']['value'], int(b['y']['value']) if 'y' in b else 0])
    for q in batch: out[q] = {r: sorted(v, key=lambda x: -x[2]) for r, v in got.get(q, {}).items()}
    if (i // STEP) % 10 == 0:
        json.dump(out, open('people_credits.json', 'w'), ensure_ascii=False); print('   ', i + len(batch), '/', len(todo), time.strftime('%H:%M:%S'), flush=True)
json.dump(out, open('people_credits.json', 'w'), ensure_ascii=False)
print('written:', len(out), 'people,', sum(len(v) for p in out.values() for v in p.values()), 'credits')
