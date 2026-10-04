# Public-domain films at the Internet Archive. Writes films_ia.json (not committed).
# Why each list counts as public domain:
#   prelinger  the Prelinger Archives, given to the public domain by their owner
#   usgov      works of the United States government (FedFlix, NASA), public domain by law
#   newsreel   Universal Newsreels, released to the public domain by Universal in 1976
#   early      first shown before 1931, so the US copyright term has run out
#   wikidata   Wikidata records the film as public domain
#   marked     marked public domain at the Archive by whoever put it there, and first shown before 1964 (when US copyright
#              still had to be renewed). This is the weakest of the six, and the site says so on each of these films.
import json, urllib.request, urllib.parse, time, os, re, sys, threading
from concurrent.futures import ThreadPoolExecutor
UA = {'User-Agent': 'dein-art-prototype/0.1 (https://github.com/osmangulveren/dein-art; catalogue build script)'}
def fetch(url, tries=5):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: return json.load(r)
        except Exception as e:
            if i == tries - 1: return None
            time.sleep(3 + i * 6)
FIELDS = 'identifier,title,year,date,creator,downloads,subject,licenseurl,format,sponsor,runtime,language'
def scrape(q, limit=None, sort=None):
    out, cursor = [], None
    while True:
        p = {'q': q, 'fields': FIELDS, 'count': 10000}
        if cursor: p['cursor'] = cursor
        if sort: p['sorts'] = sort
        d = fetch('https://archive.org/services/search/v1/scrape?' + urllib.parse.urlencode(p))
        if not d: break
        out += d.get('items', []); cursor = d.get('cursor')
        if not cursor or (limit and len(out) >= limit): break
    return out[:limit] if limit else out
PD = 'licenseurl:(*publicdomain*)'
LISTS = [('prelinger', 'collection:prelinger AND mediatype:movies', None),
         ('newsreel', 'collection:universal_newsreels AND mediatype:movies', None),
         ('early', 'collection:(feature_films OR silent_films OR short_films OR classic_cartoons OR vintage_cartoons) AND mediatype:movies AND year:[1880 TO 1930]', None),
         ('marked', f'collection:(moviesandfilms OR feature_films OR short_films OR silent_films) AND mediatype:movies AND {PD} AND year:[1880 TO 1963]', None),
         ('marked-tv', f'collection:classic_tv AND mediatype:movies AND {PD} AND year:[1930 TO 1963]', None),
         ('marked-cartoon', f'collection:(classic_cartoons OR vintage_cartoons OR more_animation OR animationandcartoons) AND mediatype:movies AND {PD} AND year:[1880 TO 1963]', None),
         ('usgov', 'collection:FedFlix AND mediatype:movies', 3000),
         ('usgov-nasa', 'collection:nasa AND mediatype:movies', 1000)]
items = {}
if os.path.exists('ia_lists.json'): items = json.load(open('ia_lists.json'))
else:
    for tag, q, limit in LISTS:
        got = scrape(q, limit, 'downloads desc' if limit else None)
        print(tag.ljust(16), len(got), flush=True)
        for it in got:
            if not it.get('identifier'): continue
            cur = items.setdefault(it['identifier'], {**it, 'why': []})
            cur['why'].append(tag)
    json.dump(items, open('ia_lists.json', 'w'))
wd = json.load(open('films_wd.json'))['films'] if os.path.exists('films_wd.json') else {}
n = 0
for f in wd.values():
    if 'Q19652' not in f.get('pd', []): continue
    for i in f.get('ia', []):
        cur = items.setdefault(i, {'identifier': i, 'why': []})
        if 'wikidata' not in cur['why']: cur['why'].append('wikidata')
        cur['wd'] = f['q']; n += 1
print('wikidata'.ljust(16), n, flush=True)
print(len(items), 'different items', flush=True)

# one call per item: which file plays, how long it is, a still, and what the item says about itself
done = {}
if os.path.exists('ia_meta.jsonl'):
    for line in open('ia_meta.jsonl'):
        try: r = json.loads(line); done[r['id']] = r
        except Exception: pass
lock = threading.Lock(); out = open('ia_meta.jsonl', 'a')
ORDER = ['h.264', 'h.264 IA', '512Kb MPEG4', 'MPEG4', 'HiRes MPEG4', 'h.264 HD']
def secs(v):
    if v is None: return None
    try: return float(v)
    except Exception: pass
    m = re.findall(r'\d+', str(v))
    if not m: return None
    n = [int(x) for x in m][:3]
    return n[0] * 3600 + n[1] * 60 + n[2] if len(n) == 3 else n[0] * 60 + n[1] if len(n) == 2 else n[0] * 60
# The Archive answers about 1.5 of these a second and slows down when asked several at once, so they go one at a time
# over one open connection, and only the list of files is asked for (the rest comes from the search above).
import http.client
conn = [None]
def files_of(i):
    for attempt in range(4):
        try:
            if conn[0] is None: conn[0] = http.client.HTTPSConnection('archive.org', timeout=60)
            conn[0].request('GET', '/metadata/' + urllib.parse.quote(i) + '/files', headers=UA)
            r = conn[0].getresponse(); body = r.read()
            if r.status == 200: return json.loads(body).get('result')
            if r.status in (429, 503): time.sleep(20)
        except Exception:
            conn[0] = None; time.sleep(2 + attempt * 4)
    return None
def one(i):
    files = files_of(i)
    r = {'id': i}
    if files is None: r['err'] = 'no answer'
    elif not files: r['err'] = 'gone'
    else:
        vids = [f for f in files if f['name'].lower().endswith('.mp4') and f.get('format') in ORDER]
        originals = {(f.get('original') or f['name']) for f in vids}
        best = None
        if vids:
            longest = max(secs(f.get('length')) or 0 for f in vids)
            pool = [f for f in vids if (secs(f.get('length')) or 0) >= longest * .95]
            best = min(pool, key=lambda f: ORDER.index(f['format']))
        thumbs = sorted(f['name'] for f in files if f.get('format') == 'Thumbnail' and (not best or f['name'].startswith((best.get('original') or best['name']).rsplit('.', 1)[0])))
        r.update(parts=len(originals), file=best and best['name'], fmt=best and best.get('format'), secs=best and secs(best.get('length')), w=best and best.get('width'), h=best and best.get('height'), size=best and best.get('size'),
                 thumb=thumbs[len(thumbs) // 3] if thumbs else None)
    out.write(json.dumps(r) + '\n'); out.flush(); done[i] = r
    if len(done) % 200 == 0: print('   files', len(done), '/', len(items), time.strftime('%H:%M:%S'), flush=True)
# films first (their length decides whether they are features or shorts), then the rest by how often they are watched
RANK = ['wikidata', 'early', 'marked', 'marked-cartoon', 'marked-tv', 'newsreel', 'prelinger', 'usgov', 'usgov-nasa']
todo = sorted((i for i in items if i not in done or done[i].get('err') == 'no answer'), key=lambda i: (min(RANK.index(w) for w in items[i]['why']), -(items[i].get('downloads') or 0)))
if len(sys.argv) > 1: todo = todo[:int(sys.argv[1])]
print(len(todo), 'to read', flush=True)
for i in todo: one(i)
json.dump({i: {**items[i], 'meta': done.get(i)} for i in items}, open('films_ia.json', 'w'))
print('written', len(items))
