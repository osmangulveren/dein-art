"""Builds prototype/films/: every public-domain film found by 12_films_wikidata.py and 13_films_archive.py, cut into pieces
the site loads only when it needs them.

  films/index.js     how many films each category has, and the best-known few of each (loaded on every page)
  films/c/<slug>.js  one category, best known first (loaded on that category's page and by the search)
  films/d/<xx>.js    everything about a film: credits, description, where its file is (loaded on the film's page)
  films/p/<xx>.js    the people credited, with their films (loaded on a person's page)

The hand-picked films in assets/catalog.js stay as they are and are left out here.
"""
from wm import *
import re, html, math, collections, unicodedata, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '../../prototype/films')
CATS = ['feature-film', 'documentary', 'short-film', 'animation', 'series', 'vlog', 'entertainment', 'reality-show', 'podcast', 'course', 'tutorial', 'music-video']
SHARDS = 256

wd = json.load(open('films_wd.json')); F, FILES, P, L = wd['films'], wd['files'], wd['people'], wd['labels']
cat = json.loads(open(os.path.join(HERE, '../../prototype/assets/catalog.js')).read().split('const CATALOG = ', 1)[1].rstrip().rstrip(';'))
curated_q = {f['wd'] for f in cat['films']}; taken = {f['key'] for f in cat['films']}
curated_people = {p['wd']: name for name, p in cat['people'].items()}
LINKS = json.load(open('wd_links.json')) if os.path.exists('wd_links.json') else {}      # how many Wikipedias write about a film
COLS = json.load(open('ia_cols.json')) if os.path.exists('ia_cols.json') else {}         # the Archive collections an item sits in
fame = lambda q: round(1.6 * min(LINKS.get(q, 0), 50))

def clock(s):
    s = int(round(s)); h, m, s = s // 3600, s % 3600 // 60, s % 60
    return f'{h}:{m:02}:{s:02}' if h else f'{m}:{s:02}'
def slug(t):
    t = str(t).lower().replace('ı', 'i').replace('ß', 'ss').replace('ø', 'o')
    t = ''.join(c for c in unicodedata.normalize('NFD', t) if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', '-', t).strip('-')[:60].strip('-')
def fnv(s):          # the same sum the site makes in JavaScript, over UTF-16 code units
    h = 2166136261; b = s.encode('utf-16-le')
    for i in range(0, len(b), 2): h = ((h ^ (b[i] | b[i + 1] << 8)) * 16777619) & 0xffffffff
    return h
def new_key(title, year, fallback):
    base = slug(title) or fallback
    k = base if not year else f'{base[:54]}-{year}'
    n = 2
    while k in taken or not k: k = f'{base[:50]}-{year or "x"}-{n}'; n += 1
    taken.add(k); return k
def norm(title, year=None):
    t = re.sub(r'^(the|a|an|le|la|les|der|die|das|el|il) ', '', slug(title).replace('-', ' ')).replace(' ', '')
    return t + (str(year) if year else '')
def tidy(t):
    t = html.unescape(str(t or '')).replace('<', '').replace('>', '')
    return re.sub(r'\s+', ' ', t).strip()

OK = lambda lic: bool(lic) and (lic.lower().replace('-', ' ').strip() in ('public domain', 'cc0', 'pd', 'no restrictions', 'cc0 1.0', 'pdm owner') or lic.lower().startswith('pd') or lic.lower().startswith('cc0'))
TRAILER = re.compile(r'trailer|teaser|bande.annonce|preview|\bclip\b|excerpt|extract|fragment|\bsample\b|отрывок|ausschnitt')
WEIGHT = {'Director': 30, 'Writer': 12, 'Cinematographer': 15, 'Editor': 10, 'Composer': 8, 'Producer': 10, 'Production designer': 7, 'Cast': 6}
ORDER = ['Director', 'Writer', 'Cinematographer', 'Editor', 'Composer', 'Producer', 'Production designer', 'Cast']

# ---------- people: only those who have died, or were born before 1900, are shown (nobody living is given a page) ----------
def keep(q, role, year):
    p = P.get(q)
    if not p or 'Q5' not in p['inst'] or not p['name'] or re.match(r'^Q\d+$', p['name']): return False
    if p['died'] is None and (p['born'] is None or p['born'] >= 1900): return False
    if role == 'Composer' and p['born'] and year and p['born'] > year - 20: return False      # scores written for later releases
    if role == 'Cast' and p['born'] and year and p['born'] > year - 12: return False
    return True
names, byname = {}, {n: q for q, n in curated_people.items()}
def name_of(q):
    if q in curated_people: return curated_people[q]
    if q in names: return names[q]
    p = P[q]; n = tidy(p['name'])
    if n in byname and byname[n] != q: n = f"{n} ({p['born'] or p['died'] or q})"
    byname[n] = q; names[q] = n; return n

def credits_of(f, year):
    crew = {}
    for q, role in f['crew']:
        if keep(q, role, year): crew.setdefault(q, []).append(role)
    rows = sorted(crew.items(), key=lambda kv: -sum(WEIGHT[r] for r in kv[1]))[:8]
    if not rows: return [], []
    tot = sum(sum(WEIGHT[r] for r in roles) for _, roles in rows)
    pct = [round(100 * sum(WEIGHT[r] for r in roles) / tot) for _, roles in rows]
    pct[0] += 100 - sum(pct)
    out = [[name_of(q), ', '.join(roles).capitalize() if len(roles) < 4 else ', '.join(roles[:3]).capitalize() + ' and more', p, q, roles] for (q, roles), p in zip(rows, pct)]
    return out, [name_of(q) for q, roles in crew.items() if 'Director' in roles][:2]
def directors(f):          # named on the film even when they have no page here
    return [tidy(P[q]['name']) for q, role in f['crew'] if role == 'Director' and q in P and P[q]['name'] and not re.match(r'^Q\d+$', P[q]['name'])][:2]
GENRE_SKIP = {'silent film', 'short film', 'film', 'feature film', 'black-and-white film', 'sound film', 'lost film', 'independent film', 'film based on literature', 'film adaptation', 'film based on a novel', 'LGBTQ-related film'}
def kind_of(f, secs):
    inst = [L.get(i, '') for i in f['inst']]; gen = [L.get(g, '') for g in f['genre']]; both = ' '.join(inst + gen).lower()
    label = next((g for g in gen if g and g not in GENRE_SKIP), None)
    label = label and re.sub(r' film$', '', label).replace(' film ', ' ').strip().capitalize()
    if re.search(r'animat|anime|cartoon', both): return 'animation', 'Animation'
    if re.search(r'television series|serial film|web series|miniseries', both): return 'series', label or 'Series'
    if 'music video' in both or 'concert film' in both: return 'music-video', 'Music video'
    if 'television advertisement' in both or 'advertising film' in both: return 'entertainment', 'Advertising'
    if re.search(r'documentary|newsreel|actuality|educational film|travelogue', both): return 'documentary', 'Documentary' if 'documentary' in both else label or 'Documentary'
    if secs and secs < 2400: return 'short-film', label or 'Short film'
    return 'feature-film', label or 'Feature film'
def blurb_of(f, crew):
    d = tidy(f['desc'] or '')
    d = (d[0].upper() + d[1:]).rstrip('.') + '.' if d else ''
    cast = [c[0] for c in crew if 'Cast' in c[4]][:3]
    if cast: d += ' With ' + (cast[0] if len(cast) == 1 else ', '.join(cast[:-1]) + ' and ' + cast[-1]).rstrip('.') + '.'
    return d.strip()

films = []          # every film as a dict; rows and details are cut from these at the end
seen = collections.defaultdict(list)          # title -> [(year, maker)] of every film taken so far
def twice(title, year, maker=''):
    return any((y and year and abs(y - year) <= 1) or (not (y and year) and (m == maker or not maker)) for y, m in seen.get(norm(title), []))
def take(title, year, maker=''): seen[norm(title)].append((year or 0, maker))
for f in cat['films']: take(f['title'], f['year'], f['by'][0])
onsite = {}         # Wikidata id -> key, for films that have their file on Commons
skipped = collections.Counter()

# ---------- 1. films with their file on Wikimedia Commons ----------
def commons_file(f):
    best = None
    for name, role in f['videos']:
        fi = FILES.get(name)
        if not fi or not fi.get('url') or not fi.get('dur') or not fi.get('thumb'): skipped['no file'] += 1; continue
        if not OK(fi['lic']): skipped['not free'] += 1; continue
        if role == 'Q622550' or (TRAILER.search(name.lower()) and not TRAILER.search((f['title'] or '').lower())): skipped['trailer or clip'] += 1; continue
        if f['mins'] and fi['dur'] < f['mins'] * 30 and fi['dur'] < 2400: skipped['much shorter than the film'] += 1; continue
        if (fi['w'] or 0) < 250 or fi['dur'] < 8: skipped['too small'] += 1; continue
        if not ({'480p.vp9.webm', '240p.vp9.webm'} & set(fi['der'])) and fi['mime'] != 'video/webm': skipped['no playable version'] += 1; continue
        if not best or fi['dur'] > best['dur']: best = fi
    return best
for q, f in F.items():
    if q in curated_q or not f['videos'] or not f['title'] or re.match(r'^Q\d+$', f['title']): continue
    fi = commons_file(f)
    if not fi: continue
    title = tidy(f['title']); year = f['year']
    if twice(title, year): skipped['same film twice'] += 1; continue
    crew, dirs = credits_of(f, year)
    secs = round(fi['dur']); c, kind = kind_of(f, secs)
    m = re.match(r'https://upload\.wikimedia\.org/wikipedia/commons/(\w)/(\w\w)/(.+)$', fi['url'].split('?')[0])
    tn = fi['thumb'].split('?')[0].rsplit('/', 1)[1].split('px--', 1)
    if not m or len(tn) != 2: skipped['odd address'] += 1; continue
    company = [tidy(L[x]) for x in f['company'] if L.get(x)][:1]
    by = dirs or directors(f) or company or ['Unknown maker']
    der = set(fi['der'])
    key = new_key(title, year, 'film-' + q.lower()); onsite[q] = key; take(title, year, by[0])
    films.append(dict(key=key, title=title, year=year or 0, secs=secs, by=by, kind=kind, cat=c, src=0, file=m.group(3), hh=m.group(2), w=fi['w'], at=max(1, int(secs * (.3 if secs < 120 else .2))),
        tn=None if tn[1] == m.group(3) + '.jpg' else tn[1], v=(1 if '480p.vp9.webm' in der else 0) | (2 if '240p.vp9.webm' in der else 0) | (4 if '1080p.vp9.webm' in der else 0) | (8 if '360p.mpeg4.mov' in der else 0),
        blurb=blurb_of(f, crew), country=[tidy(L[x]) for x in f['country'] if L.get(x)][:1], company=company, lic='CC0' if fi['lic'].lower().startswith('cc0') else 'Public domain', why='commons',
        wd=q, imdb=f['imdb'], wiki=f['enwiki'], crew=crew, score=30 + fame(q) + min(len(f['crew']), 8) + (5 if f['imdb'] else 0) + (6 if secs >= 2400 else 0)))
print(len(films), 'films from Wikimedia Commons;', dict(skipped), flush=True)

# ---------- 2. films at the Internet Archive ----------
items = json.load(open('ia_lists.json'))
for f in F.values():          # the ones Wikidata points to
    if 'Q19652' not in f.get('pd', []): continue
    for i in f.get('ia', []):
        cur = items.setdefault(i, {'identifier': i, 'why': []})
        if 'wikidata' not in cur['why']: cur['why'].append('wikidata')
        cur['wd'] = f['q']
meta = {}
if os.path.exists('ia_meta.jsonl'):
    for line in open('ia_meta.jsonl'):
        try: r = json.loads(line); meta[r['id']] = r
        except Exception: pass
MP4 = {'h.264', 'h.264 IA', '512Kb MPEG4', 'MPEG4', 'HiRes MPEG4', 'h.264 HD'}
WHY = ['wikidata', 'early', 'newsreel', 'prelinger', 'usgov', 'marked']
def secs_of(v):
    if not v: return 0
    v = str(v[0] if isinstance(v, list) else v).strip().lower()
    try: return round(float(v)) if float(v) > 0 else 0
    except Exception: pass
    m = re.match(r'^(\d+):(\d\d):(\d\d)', v)
    if m: return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3))
    m = re.match(r'^(\d+):(\d\d)', v)
    if m: return int(m.group(1)) * 60 + int(m.group(2))
    m = re.match(r'^(\d+(?:\.\d+)?)\s*(min|m\b)', v)
    if m: return round(float(m.group(1)) * 60)
    h = re.match(r'^(\d+)\s*h(?:ours?|rs?)?\s*(\d+)?', v)
    if h: return int(h.group(1)) * 3600 + int(h.group(2) or 0) * 60
    return 0
def first(v):
    if isinstance(v, list): v = next((x for x in v if x), None)
    return tidy(v) if v else ''
def maker(v):
    v = first(v)
    v = re.sub(r"^([\w'.-]+) \(([^)]+)\) (.+)$", r'\2 \1 \3', v)          # "Handy (Jam) Organization" -> "Jam Handy Organization"
    v = re.sub(r"^([\w'.-]+) \(([^)]+)\)$", r'\2 \1', v)
    return v[:70].strip(' ,;')
KEEP_UP = {'USAF', 'USA', 'US', 'NASA', 'FBI', 'CIA', 'UN', 'TV', 'WWII', 'II', 'III', 'IV', 'AEC', 'USN', 'USMC', 'RAF', 'UK', 'DC', 'NY', 'ADC', 'USSR', 'NATO', 'UFO', 'LSD', 'ABC', 'CBS', 'NBC', 'VD', 'AF', 'B-17', 'B-29', 'H-BOMB', 'A-BOMB'}
SMALL = {'of', 'the', 'and', 'in', 'for', 'to', 'a', 'an', 'on', 'at', 'by', 'with', 'from', 'or', 'as'}
def title_of(t):
    t = tidy(first(t))
    if t.isupper() and len(t) > 4:          # a title shouted in capitals is brought down to title case
        t = ' '.join(w if w.strip('.,:;()') in KEEP_UP else w.lower() if i and w.lower() in SMALL else w[:1] + w[1:].lower() for i, w in enumerate(t.split(' ')))
    m = re.match(r'^(.*), (The|A|An)$', t)
    if m: t = f'{m.group(2)} {m.group(1)}'
    m = re.match(r'^(.*), (The|A|An) (\(.*\))$', t)
    if m: t = f'{m.group(2)} {m.group(1)} {m.group(3)}'
    return t[:120]
GENRES = [('film noir', 'Film noir'), ('noir', 'Film noir'), ('western', 'Western'), ('science fiction', 'Science fiction'), ('sci-fi', 'Science fiction'), ('horror', 'Horror'), ('comedy', 'Comedy'), ('mystery', 'Mystery'),
          ('thriller', 'Thriller'), ('crime', 'Crime'), ('musical', 'Musical'), ('war', 'War'), ('adventure', 'Adventure'), ('romance', 'Romance'), ('drama', 'Drama'), ('silent', 'Silent film')]
def ia_kind(it, why, secs, year):
    subj = it.get('subject') or []
    words = ' ; '.join(subj if isinstance(subj, list) else [subj]).lower(); t = (first(it.get('title')) or '').lower(); both = words + ' ; ' + t
    tags = it['why']; cols = set(COLS.get(it['identifier'], []))
    if 'newsreel' in tags: return 'documentary', 'Newsreel'
    if 'usgov-nasa' in tags: return 'documentary', 'NASA film'
    if 'usgov' in tags:
        if re.search(r'\bhow to\b|training|instruction|procedure|techniques?\b|operation of|maintenance|first aid', both): return 'tutorial', 'Training film'
        if re.search(r'educat|lecture|course|lesson|classroom', both): return 'course', 'Educational film'
        return 'documentary', 'Government film'
    if 'prelinger' in tags:
        if re.search(r'home mov', both): return 'vlog', 'Home movie'
        if re.search(r'advertis|commercials?\b|\bads?\b', both): return 'entertainment', 'Advertising'
        if re.search(r'^how to\b|\bhow to\b.*;|training film|instruction', both): return 'tutorial', 'Training film'
        if re.search(r'social guidance|educat|classroom|school|health and hygiene|safety|science|civics|manners|teaching', both): return 'course', 'Educational film'
        if re.search(r'animation|cartoon', words): return 'animation', 'Cartoon'
        if re.search(r'soundie|music|songs?\b|\bjazz\b|dance', words): return 'music-video', 'Music film'
        if 'newsreel' in both: return 'documentary', 'Newsreel'
        return 'documentary', 'Industrial film' if re.search(r'industry|manufactur|labor|extractive|sponsored', words) else 'Archive film'
    label = 'Film noir' if 'Film_Noir' in cols else next((lab for k, lab in GENRES if re.search(r'\b' + re.escape(k), words)), None) or ('Comedy' if 'Comedy_Films' in cols else 'Science fiction and horror' if 'SciFi_Horror' in cols else None)
    if 'marked-cartoon' in tags or cols & {'classic_cartoons', 'vintage_cartoons', 'more_animation', 'animationandcartoons'} or re.search(r'cartoon|animation|animated', both): return 'animation', 'Cartoon'
    if 'marked-tv' in tags or 'classic_tv' in cols: return 'series', 'TV episode'
    if re.search(r'\bserial\b|chapter \d|episode \d', both): return 'series', 'Serial'
    if re.search(r'documentar|newsreel|travelogue', both): return 'documentary', 'Documentary'
    if secs: return ('short-film', label or 'Short film') if secs < 2400 else ('feature-film', label or 'Feature film')
    # the length is not known yet: the collection it was filed in says what it is
    if 'short_films' in cols or ('feature_films' not in cols and ((year and year < 1915) or re.search(r'\bshorts?\b', words))): return 'short-film', label or 'Short film'
    return 'feature-film', label or 'Feature film'
ia = []; ia_skip = collections.Counter()
for i, it in items.items():
    m = meta.get(i); f = F.get(it.get('wd')) if it.get('wd') else None
    if f and (f['q'] in onsite or f['q'] in curated_q): ia_skip['already here from Commons'] += 1; continue
    if m and m.get('err') == 'gone': ia_skip['gone'] += 1; continue
    known = bool(m) and not m.get('err')
    if known and not m.get('file'): ia_skip['no film file'] += 1; continue
    if known and (m.get('parts') or 1) > 4: ia_skip['many films in one item'] += 1; continue
    if not known and not (MP4 & set(it.get('format') or [])): ia_skip['not read yet, no sign of a film file'] += 1; continue
    title = tidy(f['title']) if f and f['title'] and not re.match(r'^Q\d+$', f['title']) else title_of(it.get('title'))
    if len(title) < 2: ia_skip['no title'] += 1; continue
    year = (f and f['year']) or 0
    if not year:
        y = str(it.get('year') or '')[:4] or str(it.get('date') or '')[:4]
        year = int(y) if y.isdigit() and 1870 < int(y) < 2026 else 0
    if not year:
        y = re.search(r'\((18[89]\d|19\d\d)\)', title) or re.search(r'(?<!\d)(19[0-7]\d)$', i)
        if y: year = int(y.group(1))
    title = re.sub(r'\s*\((18[89]\d|19\d\d)\)\s*$', '', title).strip() or title
    why = next(w for w in WHY if any(t == w or t.startswith(w + '-') for t in it['why']))
    if why == 'early' and not (0 < year <= 1930): why = 'marked' if any(t.startswith('marked') for t in it['why']) else None
    if why == 'marked' and not (0 < year <= 1963): why = None
    if not why: ia_skip['year does not hold up'] += 1; continue
    secs = round((known and m.get('secs')) or 0) or secs_of(it.get('runtime')) or (round(f['mins'] * 60) if f and f['mins'] else 0)
    if known and m.get('secs') and m['secs'] < 8: ia_skip['too short'] += 1; continue
    crew, dirs = credits_of(f, year) if f else ([], [])
    if f: c, kind = kind_of(f, secs)
    else: c, kind = ia_kind(it, why, secs, year)
    by = dirs or (f and directors(f)) or [x for x in [maker(it.get('creator')) or maker(it.get('sponsor'))] if x] or (['Universal Newsreel'] if why == 'newsreel' else ['NASA'] if 'usgov-nasa' in it['why'] else ['Unknown maker'])
    down = it.get('downloads') or 0
    ia.append(dict(title=title, year=year, secs=secs, by=by, kind=kind, cat=c, src=1, id=i, file=known and m.get('file') or None, w=known and m.get('w') or None,
        blurb=blurb_of(f, crew) if f else '', country=[tidy(L[x]) for x in f['country'] if L.get(x)][:1] if f else [], company=[tidy(L[x]) for x in f['company'] if L.get(x)][:1] if f else [],
        lic='Marked public domain' if why == 'marked' else 'Public domain', why=why, wd=f and f['q'], imdb=f and f['imdb'], wiki=f and f['enwiki'], crew=crew,
        score=round(12 * math.log10(down + 1)) + (fame(f['q']) if f else 0) + (6 if secs >= 2400 else 0) - (15 if c == 'vlog' else 0)))
# the same film put up twice: keep the copy that is watched most
ia.sort(key=lambda x: -x['score']); n0 = len(films)
for x in ia:
    if twice(x['title'], x['year'], x['by'][0]) or (x['wd'] and x['wd'] in onsite): ia_skip['same film twice'] += 1; continue
    take(x['title'], x['year'], x['by'][0])
    if x['wd']: onsite[x['wd']] = True
    x['key'] = new_key(x['title'], x['year'], 'film-' + slug(x['id']))
    if x['wd']: onsite[x['wd']] = x['key']
    films.append(x)
print(len(films) - n0, 'films from the Internet Archive;', dict(ia_skip), flush=True)
print('   resolved at build time:', sum(1 for x in films if x['src'] and x['file']), ' to be resolved in the browser:', sum(1 for x in films if x['src'] and not x['file']))
print('   why:', dict(collections.Counter(x['why'] for x in films)))

# ---------- 3. the people ----------
used = {}
for f in films:
    for name, role, pct, q, roles in f['crew']: used.setdefault(q, []).append((f, roles))
imgs = sorted({P[q]['img'] for q in used if P[q].get('img') and q not in curated_people})
pics = {}
for i in range(0, len(imgs), 20):
    d = get(C, dict(action='query', format='json', titles='|'.join('File:' + n for n in imgs[i:i + 20]), prop='imageinfo', iiprop='url|extmetadata|mime', iiextmetadatafilter='LicenseShortName', iiurlwidth=500))
    back = {x['to']: x['from'] for x in d.get('query', {}).get('normalized', [])}
    for p in d.get('query', {}).get('pages', {}).values():
        if 'imageinfo' not in p: continue
        ii = p['imageinfo'][0]
        if OK(ii.get('extmetadata', {}).get('LicenseShortName', {}).get('value')) and ii.get('mime') in ('image/jpeg', 'image/png') and ii.get('thumburl'):
            pics[back.get(p['title'], p['title'])[5:].replace('_', ' ')] = ii['thumburl'].split('?')[0]
    if i % 1000 == 0: print('   portraits', i, '/', len(imgs), flush=True)
people = {}
for q, lst in used.items():
    p = P[q]; name = name_of(q)
    groups = {}
    for f, roles in lst:
        for r in roles: groups.setdefault(r, []).append(f)
    credits = [dict(role='Actor' if r == 'Cast' else r, total=len(groups[r]), list=[dict(title=f['title'], year=f['year'] or None, key=f['key']) for f in sorted(groups[r], key=lambda f: -(f['year'] or 0))]) for r in ORDER if r in groups]
    mine = sorted({f['key']: f for f, _ in lst}.values(), key=lambda f: -f['score'])
    if q in curated_people: people[name] = dict(name=name, more=True, films=[f['key'] for f in mine], credits=credits)
    else:
        allroles = [r for _, roles in lst for r in roles]
        main = max(ORDER, key=lambda r: (allroles.count(r) * (3 if r != 'Cast' else 2), -ORDER.index(r)))
        people[name] = dict(name=name, role='Actor' if main == 'Cast' else main, desc=tidy(p['desc'] or ''), born=p['born'], died=p['died'], bornIn=L.get(p['bp']), diedIn=L.get(p['dp']), occ=[L[o] for o in p['occ'] if L.get(o)],
                            pic=pics.get((p.get('img') or '').replace('_', ' ')), wd=q, imdb=p['imdb'], wiki=p['enwiki'], films=[f['key'] for f in mine], credits=credits)
print(len(people), 'people;', sum(1 for p in people.values() if p.get('pic')), 'with a portrait that is free to show;', sum(1 for p in people.values() if p.get('more')), 'already on the site', flush=True)

# ---------- 4. write ----------
def row(f):
    r = [f['key'], f['title'], f['year'] or 0, f['secs'] or 0, '|'.join(f['by']), f['kind'], CATS.index(f['cat']), f['src']]
    return r + ([f['file'], f['hh'], f['w'], f['at']] + ([f['tn']] if f['tn'] else []) if f['src'] == 0 else [f['id']])
def detail(f, rel):
    d = dict(r=row(f), l=f['lic'], y=f['why'])
    for k, v in (('b', f['blurb']), ('co', f['country']), ('cm', f['company']), ('wd', f['wd']), ('im', f['imdb']), ('wk', f['wiki']), ('cr', [c[:3] + ([people[c[0]]['pic']] if people.get(c[0], {}).get('pic') else []) for c in f['crew']]), ('rel', [row(x) for x in rel])):
        if v: d[k] = v
    if f['src'] == 0: d['v'] = f['v']
    elif f['file']: d['f'] = f['file']
    return d
dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
if os.path.isdir(OUT): shutil.rmtree(OUT)
for sub in ('c', 'd', 'p'): os.makedirs(os.path.join(OUT, sub))
bycat = collections.defaultdict(list); bymaker = collections.defaultdict(list)
for f in sorted(films, key=lambda f: (-f['score'], f['title'])):
    bycat[f['cat']].append(f)
    if f['by'][0] != 'Unknown maker': bymaker[f['by'][0]].append(f)
HEAD = '// Built by tools/catalog/14_films_build.py. Public-domain films from Wikimedia Commons and the Internet Archive; do not edit by hand.\n'
size = 0
for c, lst in bycat.items():
    p = os.path.join(OUT, 'c', c + '.js'); open(p, 'w').write(HEAD + f'FILMS.rows({dump(c)},{dump([row(f) for f in lst])});\n'); size += os.path.getsize(p)
shards = collections.defaultdict(dict)
for f in films:
    rel = [x for x in bymaker.get(f['by'][0], []) if x is not f][:6]
    shards[fnv(f['key']) % SHARDS][f['key']] = detail(f, rel)
for n, d in shards.items():
    p = os.path.join(OUT, 'd', f'{n:02x}.js'); open(p, 'w').write(f'FILMS.detail({dump(d)});\n'); size += os.path.getsize(p)
bykey = {f['key']: f for f in films}
pshards = collections.defaultdict(lambda: ([], {}))
for name, p in people.items():
    s = pshards[fnv(name) % SHARDS]; s[0].append(p)
    for k in p['films'][:400]: s[1][k] = row(bykey[k])
for n, (ps, rows) in pshards.items():
    p = os.path.join(OUT, 'p', f'{n:02x}.js'); open(p, 'w').write(f'FILMS.people({dump(ps)},{dump(list(rows.values()))});\n'); size += os.path.getsize(p)
p = os.path.join(OUT, 'people.js'); open(p, 'w').write(HEAD + f"FILMS.peopleNames({dump([[n, x['role']] for n, x in sorted(people.items()) if not x.get('more')])});\n"); size += os.path.getsize(p)
picks = [row(f) for c in CATS for f in bycat.get(c, [])[: 36 if c in ('feature-film', 'short-film', 'animation', 'documentary') else 16]]
index = dict(total=len(films), counts={c: len(bycat[c]) for c in CATS if bycat.get(c)}, shards=SHARDS, picks=picks, sources=dict(collections.Counter('Wikimedia Commons' if f['src'] == 0 else 'Internet Archive' for f in films)))
p = os.path.join(OUT, 'index.js'); open(p, 'w').write(HEAD + f'const FILMS_INDEX = {dump(index)};\n'); size += os.path.getsize(p)
print(len(films), 'films written:', index['counts'])
print('   index.js', round(os.path.getsize(p) / 1024), 'KB; categories', {c: f"{round(os.path.getsize(os.path.join(OUT, 'c', c + '.js')) / 1024)} KB" for c in bycat}, '; everything', round(size / 1e6, 1), 'MB in', 1 + len(bycat) + len(shards) + len(pshards), 'files')
for c in CATS:
    if bycat.get(c): print('  ', c.ljust(14), ' | '.join(f"{f['title']} ({f['year'] or '?'})" for f in bycat[c][:6]))
