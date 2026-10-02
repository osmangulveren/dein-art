from wm import *
from films import FILMS
import re
W = 'https://www.wikidata.org/w/api.php'
QFIX = {'man-with-the-rubber-head': 'Q1851504', 'bluebeard': 'Q2071862'}
ROLES = [('P57', 'Director'), ('P58', 'Writer'), ('P344', 'Cinematographer'), ('P1040', 'Editor'), ('P86', 'Composer'), ('P162', 'Producer'), ('P2554', 'Production designer'), ('P161', 'Cast')]
b1 = json.load(open('b1.json'))

def entities(ids, props='labels|descriptions|claims|sitelinks'):
    out = {}
    ids = list(dict.fromkeys(ids))
    for i in range(0, len(ids), 45):
        d = get(W, dict(action='wbgetentities', format='json', ids='|'.join(ids[i:i + 45]), props=props, languages='en|fr|de', sitefilter='enwiki'))
        out.update(d['entities'])
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
    for l in ('en', 'fr', 'de'):
        if l in e.get('labels', {}): return e['labels'][l]['value']
def year(e, p):
    v = vals(e, p)
    ys = [int(x['time'][1:5]) for x in v if isinstance(x, dict) and 'time' in x]
    return min(ys) if ys else None

fq = {k: QFIX.get(k) or b1[k]['q'] for k, *_ in FILMS}
fe = entities(fq.values())
people = {}
films = {}
for key, file, title, yr, kind, blurb in FILMS:
    e = fe[fq[key]]; f = b1[key]['f']
    crew = []
    for p, role in ROLES:
        for q in ids(e, p)[: 6 if p == 'P161' else 3]:
            crew.append((q, role)); people.setdefault(q, set()).add(key)
    der = {}
    for name, src, typ in []: pass
    films[key] = dict(key=key, q=fq[key], title=title, wdlabel=label(e), year=yr, wdyear=year(e, 'P577'), kind=kind, blurb=blurb, file=file, dur=f['dur'], w=f['w'], h=f['h'], lic=f['lic'], page=f['page'],
                      thumb=f['thumb'], crew=crew, company=ids(e, 'P272'), country=ids(e, 'P495'), genre=ids(e, 'P136'), imdb=(vals(e, 'P345') or [None])[0],
                      enwiki=e.get('sitelinks', {}).get('enwiki', {}).get('title'))
# derivatives
for key in films:
    d = get(C, dict(action='query', format='json', titles='File:' + films[key]['file'], prop='videoinfo', viprop='url|derivatives', viurlwidth=960))
    v = list(d['query']['pages'].values())[0]['videoinfo'][0]
    films[key]['der'] = {x.get('transcodekey', 'original'): x['src'].split('?')[0] for x in v['derivatives']}
pe = entities(people.keys())
aux = set()
P = {}
for q, e in pe.items():
    born, died = year(e, 'P569'), year(e, 'P570')
    P[q] = dict(q=q, name=label(e), desc=e.get('descriptions', {}).get('en', {}).get('value'), born=born, died=died, bp=(ids(e, 'P19') or [None])[0], dp=(ids(e, 'P20') or [None])[0],
                occ=ids(e, 'P106')[:4], img=(vals(e, 'P18') or [None])[0], imdb=(vals(e, 'P345') or [None])[0], enwiki=e.get('sitelinks', {}).get('enwiki', {}).get('title'), country=(ids(e, 'P27') or [None])[0], inst=ids(e, 'P31'), films=sorted(people[q]))
    aux.update(x for x in [P[q]['bp'], P[q]['dp'], P[q]['country'], *P[q]['occ']] if x)
for f in films.values(): aux.update(f['company'] + f['country'] + f['genre'])
ae = entities(aux, props='labels|claims')
L = {q: label(e) for q, e in ae.items()}
CO = {q: dict(name=label(ae[q]), founded=year(ae[q], 'P571'), hq=(ids(ae[q], 'P159') or [None])[0], country=(ids(ae[q], 'P17') or [None])[0]) for f in films.values() for q in f['company']}
more = entities([x for c in CO.values() for x in (c['hq'], c['country']) if x], props='labels')
L.update({q: label(e) for q, e in more.items()})
json.dump(dict(films=films, people=P, labels=L, companies=CO), open('b2.json', 'w'), ensure_ascii=False, indent=1)
for f in films.values():
    print(f['key'], '|', f['wdlabel'], f['wdyear'], '|', round(f['dur'] / 60, 1), '|', sorted(f['der']), '|', [L.get(c) for c in f['company']], [L.get(c) for c in f['country']])
    print('     ', ', '.join(f"{P[q]['name']} ({r})" for q, r in f['crew']))
print(len(P), 'people;', sum(1 for p in P.values() if p['img']), 'with image;', [p['name'] for p in P.values() if p['died'] is None or 'Q5' not in p['inst']])
