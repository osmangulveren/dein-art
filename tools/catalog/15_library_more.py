"""Builds prototype/assets/library-more.js: art that museums have released to the public domain, and public-domain books.

  Cleveland Museum of Art     its Open Access works, released under CC0 (openaccess-api.clevelandart.org)
  National Gallery of Art     open-access images, CC0 (github.com/NationalGalleryOfArt/opendata)
  Wellcome Collection         images under the Public Domain Mark or CC0 (api.wellcomecollection.org)
  Project Gutenberg           books in the US public domain, from its own catalogue file (gutenberg.org/cache/epub/feeds)

Nothing is copied: the site links each museum's own image and each book's own page. The Art Institute of Chicago is
left out on purpose: its image server turns away requests that do not come from its own pages. So is the Metropolitan
Museum: its API stops answering programs after a couple of hundred requests, and that is theirs to decide.
"""
from wm import *
import re, html, sys
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '../../prototype/assets/library-more.js'); OLD = os.path.join(HERE, '../../prototype/assets/library.js')
from concurrent.futures import ThreadPoolExecutor
import csv, urllib.request
csv.field_size_limit(10**9)
tidy = lambda t: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', str(t or '')))).replace('<', '').replace('>', '').strip()
art, books, seen = [], [], set()

# ---------- Cleveland Museum of Art ----------
CMA = [('Painting', 'Paintings & prints', 2400), ('Print', 'Paintings & prints', 1300), ('Photograph', 'Photography', 900), ('Drawing', 'Illustrations', 800), ('Textile', 'Patterns & textiles', 400), ('Sculpture', 'Sculpture & objects', 400), ('Ceramic', 'Sculpture & objects', 250), ('Manuscript', 'Illustrations', 250)]
for typ, sub, want in CMA:
    got = 0
    for skip in range(0, want + 1000, 1000):
        d = get('https://openaccess-api.clevelandart.org/api/artworks/', dict(cc0=1, has_image=1, limit=1000, skip=skip, type=typ, fields='id,accession_number,title,creation_date,creators,type,technique,images,url,share_license_status'))
        for a in d.get('data', []):
            acc = a.get('accession_number'); web = (a.get('images') or {}).get('web') or {}; pr = (a.get('images') or {}).get('print') or {}
            if a.get('share_license_status') != 'CC0' or not acc or web.get('url') != f'https://openaccess-cdn.clevelandart.org/{acc}/{acc}_web.jpg' or pr.get('url') != f'https://openaccess-cdn.clevelandart.org/{acc}/{acc}_print.jpg': continue
            title = tidy(a.get('title'))[:110]
            if not title or ('c', acc) in seen: continue
            seen.add(('c', acc))
            by = tidy(((a.get('creators') or [{}])[0].get('description') or '').split(' (')[0])[:60] or 'Unknown artist'
            art.append([sub, title, by, tidy(a.get('creation_date'))[:30], int(pr.get('width') or 0), int(pr.get('height') or 0), 'c', acc, int(pr.get('filesize') or 0)]); got += 1
            if got >= want: break
        if got >= want or len(d.get('data', [])) < 1000: break
    print('Cleveland', typ.ljust(12), got, flush=True)

# ---------- National Gallery of Art: its open data, published as files ----------
def cached(name, url):
    p = 'cache/' + name
    if not os.path.exists(p):
        os.makedirs('cache', exist_ok=True)
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=600) as r: open(p, 'wb').write(r.read())
    return p
NGA = 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/'
objs = {r['objectid']: r for r in csv.DictReader(open(cached('nga_objects.csv', NGA + 'objects.csv'), encoding='utf-8'))}
NGA_SUB = [('Painting', 'Paintings & prints', 2200), ('Drawing', 'Illustrations', 900), ('Print', 'Paintings & prints', 900), ('Photograph', 'Photography', 500), ('Index of American Design', 'Illustrations', 400), ('Sculpture', 'Sculpture & objects', 300)]
pool = {}
for r in csv.DictReader(open(cached('nga_images.csv', NGA + 'published_images.csv'), encoding='utf-8')):
    o = objs.get(r['depictstmsobjectid'])
    if r['openaccess'] != '1' or r['viewtype'] != 'primary' or not o or not o['title'].strip() or not re.match(r'^[0-9a-f-]{36}$', r['uuid']): continue
    pool.setdefault(o['classification'], []).append((0 if o.get('wikidataid') else 1, int(o['objectid']), r, o))          # works with a Wikidata entry first: the better known ones
for cls, sub, want in NGA_SUB:
    got = 0
    for _, _, r, o in sorted(pool.get(cls, []), key=lambda x: x[:2]):
        if ('n', o['objectid']) in seen: continue
        seen.add(('n', o['objectid']))
        art.append([sub, tidy(o['title'])[:110], tidy(o['attribution'])[:60] or 'Unknown artist', tidy(o['displaydate'])[:30], int(r['width'] or 0), int(r['height'] or 0), 'n', r['uuid'], int(o['objectid'])]); got += 1
        if got >= want: break
    print('Washington', cls.ljust(12), got, flush=True)

# ---------- Wellcome Collection: medicine, science and the body, in pictures ----------
n = 0
for q in ['anatomy', 'botanical', 'surgery', 'astronomy', 'alchemy', 'caricature', 'herbal', 'skeleton', 'physician', 'apothecary', 'zoology', 'chemistry']:
    for page in (1, 2):
        try: d = get('https://api.wellcomecollection.org/catalogue/v2/images', {'query': q, 'locations.license': 'pdm,cc-0', 'pageSize': 100, 'page': page, 'include': 'source.contributors'})
        except Exception as e: print('   stopped', q, str(e)[:60]); break
        for im in d.get('results', []):
            loc = next((l for l in im.get('locations', []) if l.get('locationType', {}).get('id') == 'iiif-image'), None)
            m = loc and re.match(r'https://iiif\.wellcomecollection\.org/image/([\w.-]+)/info\.json$', loc['url'])
            src = im.get('source') or {}
            if not m or loc['license']['id'] not in ('pdm', 'cc-0') or ('w', m.group(1)) in seen or not src.get('title'): continue
            seen.add(('w', m.group(1)))
            who = tidy(((src.get('contributors') or [{}])[0].get('agent') or {}).get('label'))
            who = re.sub(r',\s*(approximately\s*)?\d{3,4}.*$', '', who); who = ' '.join(reversed(who.split(', ', 1))) if ', ' in who else who
            art.append(['Science & medicine', tidy(src['title'])[:110].rstrip('.'), who[:60] or 'Unknown artist', '', 0, 0, 'w', m.group(1), src.get('id') or '', 1 if loc['license']['id'] == 'cc-0' else 0]); n += 1
        if len(d.get('results', [])) < 100: break
print('Wellcome  ', n, flush=True)

# ---------- Project Gutenberg: its own catalogue file, the way it asks to be read by programs ----------
PG = 'cache/pg_catalog.csv'
if not os.path.exists(PG):
    os.makedirs('cache', exist_ok=True)
    with urllib.request.urlopen(urllib.request.Request('https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv', headers=UA), timeout=300) as r: open(PG, 'wb').write(r.read())
SHELVES = [('Category: Plays/Films/Dramas', 'Plays', 1700), ('Movie Books', 'Novels & classics', 400), ('Best Books Ever Listings', 'Novels & classics', 400), ('Category: Classics of Literature', 'Novels & classics', 1200),
           ('Category: Science-Fiction & Fantasy', 'Science fiction & fantasy', 900), ('Category: Crime, Thrillers and Mystery', 'Crime & mystery', 700), ('Category: Mythology, Legends & Folklore', 'Myths & folk tales', 500),
           ('Category: Short Stories', 'Short stories', 600), ('Category: Poetry', 'Poetry', 400)]
def author(a):
    a = tidy(a.split(';')[0]); a = re.sub(r'\s*\[[^\]]*\]', '', a); a = re.sub(r',\s*[\d?]{2,4}\??\s*(BCE)?\s*-.*$|,\s*-\d{3,4}.*$|,\s*active .*$', '', a); a = re.sub(r'\s*\([^)]*\)', '', a).strip(' ,')
    return (' '.join(reversed(a.split(', ', 1))) if ', ' in a else a)[:60] or 'Unknown author'
rows = [r for r in csv.DictReader(open(PG, encoding='utf-8')) if r['Type'] == 'Text' and r['Language'] == 'en' and r['Title'].strip()]
rows.sort(key=lambda r: int(r['Text#']))          # the low numbers are the books people asked for first
for shelf, sub, want in SHELVES:
    got = 0
    for r in rows:
        if shelf not in [x.strip() for x in r['Bookshelves'].split(';')] or ('g', r['Text#']) in seen: continue
        seen.add(('g', r['Text#']))
        books.append([sub, tidy(r['Title'].split('\n')[0])[:110], author(r['Authors']), int(r['Text#'])]); got += 1
        if got >= want: break
    print('Gutenberg', shelf.replace('Category: ', '').ljust(34), got, flush=True)

more = {'Photos & images': art, 'Scripts & documents': books}
dump = lambda x: json.dumps(x, ensure_ascii=False, separators=(',', ':'))
open(OUT, 'w').write('// Museum art released to the public domain and public-domain books, built by tools/catalog/15_library_more.py. Linked, never copied.\n'
      '// Art rows: [shelf, title, artist, date, width, height, source, image key, the work\'s number (or bytes), 1 if CC0]. Sources: "c" Cleveland Museum of Art,\n'
      '// "n" National Gallery of Art, "w" Wellcome Collection. Book rows: [shelf, title, author, Project Gutenberg number].\n'
      f'const LIBRARY_MORE = {dump(more)};\n')
old = open(OLD).read()
if '\n// LIBRARY_MORE' in old: open(OLD, 'w').write(old.split('\n// LIBRARY_MORE', 1)[0].rstrip('\n') + '\n')          # an earlier version of this script wrote into library.js
print(len(art), 'works of art,', len(books), 'books; library-more.js is', round(os.path.getsize(OUT) / 1024), 'KB')
import collections
print(dict(collections.Counter(r[6] for r in art)), dict(collections.Counter(r[0] for r in art)), dict(collections.Counter(r[0] for r in books)))
