# Two cheap additions to what 12_ and 13_ gathered: which Archive collections each item sits in (tells features from shorts
# when the length is not known yet), and how many Wikipedias have an article on each film (a fair measure of how well known it is).
import json, urllib.request, urllib.parse, time, os, hashlib
UA = {'User-Agent': 'dein-art-prototype/0.1 (https://github.com/osmangulveren/dein-art; catalogue build script)'}
def fetch(url, accept=None):
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={**UA, **({'Accept': accept} if accept else {})}), timeout=180) as r: return json.load(r)
        except Exception as e:
            if i == 3: raise
            time.sleep(8 + i * 8)
items = json.load(open('ia_lists.json')); cols = {}
for c in ['feature_films', 'short_films', 'silent_films', 'classic_cartoons', 'vintage_cartoons', 'more_animation', 'animationandcartoons', 'classic_tv', 'Film_Noir', 'SciFi_Horror', 'Comedy_Films']:
    cursor, n = None, 0
    while True:
        p = {'q': f'collection:{c} AND mediatype:movies', 'fields': 'identifier', 'count': 10000}
        if cursor: p['cursor'] = cursor
        d = fetch('https://archive.org/services/search/v1/scrape?' + urllib.parse.urlencode(p))
        for it in d.get('items', []):
            if it['identifier'] in items: cols.setdefault(it['identifier'], []).append(c); n += 1
        cursor = d.get('cursor')
        if not cursor: break
    print(c.ljust(26), n, flush=True)
json.dump(cols, open('ia_cols.json', 'w'))
links = {}
for q in ['SELECT ?f ?n WHERE { ?f wdt:P10 ?v ; wikibase:sitelinks ?n . ?f wdt:P31/wdt:P279* wd:Q11424 . }',
          'SELECT ?f ?n WHERE { VALUES ?t { wd:Q11424 wd:Q24862 wd:Q226730 wd:Q202866 wd:Q93204 wd:Q17517379 wd:Q506240 wd:Q24869 wd:Q336144 } ?f wdt:P31 ?t ; wdt:P724 ?ia ; wdt:P6216 wd:Q19652 ; wikibase:sitelinks ?n . }']:
    for r in fetch('https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q}), 'application/sparql-results+json')['results']['bindings']:
        links[r['f']['value'].rsplit('/', 1)[1]] = int(r['n']['value'])
json.dump(links, open('wd_links.json', 'w'))
print(len(cols), 'items tagged;', len(links), 'films with a count of Wikipedias; best known:', sorted(links.values())[-5:])
