from wm import *
d = json.load(open('b2.json')); P = d['people']
OKL = lambda l: bool(l) and (l.lower() in ('public domain', 'cc0', 'no restrictions') or l.lower().startswith('pd') or l.lower().startswith('cc0'))
# portraits
names = [p['img'] for p in P.values() if p['img']]
info = {}
for i in range(0, len(names), 40):
    r = get(C, dict(action='query', format='json', titles='|'.join('File:' + n for n in names[i:i + 40]), prop='imageinfo', iiprop='url|size|extmetadata', iiurlwidth=500))
    norm = {n['to']: n['from'] for n in r['query'].get('normalized', [])}
    for pg in r['query']['pages'].values():
        if 'imageinfo' not in pg: continue
        ii = pg['imageinfo'][0]; t = norm.get(pg['title'], pg['title'])[5:]
        info[t] = dict(thumb=ii['thumburl'].split('?')[0], lic=ii['extmetadata'].get('LicenseShortName', {}).get('value'), w=ii['width'], h=ii['height'])
for p in P.values():
    k = p['img'] and p['img'].replace('_', ' ')
    ii = info.get(p['img']) or info.get(k)
    p['portrait'] = ii['thumb'] if ii and OKL(ii['lic']) else None
    p['portraitLic'] = ii and ii['lic']
print(sum(1 for p in P.values() if p['portrait']), 'portraits ok;', sorted(set(str(p['portraitLic']) for p in P.values() if p['img'] and not p['portrait'])))
# filmographies
S = 'https://query.wikidata.org/sparql'
ROLES = {'P57': 'Director', 'P58': 'Writer', 'P161': 'Cast', 'P344': 'Cinematographer', 'P1040': 'Editor', 'P162': 'Producer', 'P86': 'Composer', 'P2554': 'Production designer'}
qs = list(P)
rows = []
for i in range(0, len(qs), 12):
    q = '''SELECT ?p ?prop ?film ?filmLabel (MIN(YEAR(?d)) AS ?year) (SAMPLE(?sl) AS ?links) WHERE {
  VALUES ?p { %s } VALUES ?prop { %s }
  ?film ?prop ?p ; wikibase:sitelinks ?sl . OPTIONAL { ?film wdt:P577 ?d }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,fr,de,ru". }
} GROUP BY ?p ?prop ?film ?filmLabel''' % (' '.join('wd:' + x for x in qs[i:i + 12]), ' '.join('wdt:' + x for x in ROLES))
    r = get(S, dict(query=q, format='json'))
    for b in r['results']['bindings']:
        rows.append((b['p']['value'].rsplit('/', 1)[1], ROLES[b['prop']['value'].rsplit('/', 1)[1]], b['film']['value'].rsplit('/', 1)[1], b['filmLabel']['value'], int(b['year']['value']) if 'year' in b else None, int(b['links']['value'])))
    print(i, len(rows))
ours = {f['q']: k for k, f in d['films'].items()}
for p in P.values(): p['credits'] = {}
for pq, role, fq, label, yr, links in rows:
    if re.match(r'^Q\d+$', label) if (re := __import__('re')) else False: continue
    P[pq]['credits'].setdefault(role, []).append(dict(q=fq, title=label, year=yr, links=links, key=ours.get(fq)))
for p in P.values():
    for role, lst in p['credits'].items():
        lst.sort(key=lambda c: (c['key'] is None, -c['links']))
        keep = lst[:10]; keep.sort(key=lambda c: -(c['year'] or 0))
        p['credits'][role] = dict(total=len(lst), list=keep)
json.dump(d, open('b3.json', 'w'), ensure_ascii=False, indent=1)
for n in ('Georges Méliès', 'F. W. Murnau', 'Buster Keaton', 'Yelizaveta Ignatevna Svilova'):
    p = next(x for x in P.values() if x['name'] == n)
    print(n, p['born'], p['died'], d['labels'].get(p['bp']), [d['labels'].get(o) for o in p['occ']], p['portrait'], {r: (c['total'], [x['title'] for x in c['list'][:4]]) for r, c in p['credits'].items()})
