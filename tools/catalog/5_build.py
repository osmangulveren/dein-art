"""Builds prototype/assets/catalog.js: every film, person, track and image on the demo site, with its source and licence."""
import json, os, re, urllib.parse
from picks import PICKS
d = json.load(open('b3.json')); a = json.load(open('b4.json'))
F, P, L, CO = d['films'], d['people'], d['labels'], d['companies']
up = lambda u: u and u.split('?')[0].replace('thumb.wikimedia.org', 'upload.wikimedia.org')
def clock(s):
    s = int(round(s)); h, m, s = s // 3600, s % 3600 // 60, s % 60
    return f'{h}:{m:02}:{s:02}' if h else f'{m}:{s:02}'
def keep(q, role, year):
    p = P[q]
    if 'Q5' not in p['inst'] or not p['name'] or re.match(r'^Q\d+$', p['name']): return False
    if p['died'] is None and (p['born'] is None or p['born'] >= 1900): return False
    if role == 'Composer' and p['born'] and p['born'] > year - 20: return False        # scores written for later releases
    if role == 'Cast' and p['born'] and p['born'] > year - 12: return False
    return True
WEIGHT = {'Director': 30, 'Writer': 12, 'Cinematographer': 15, 'Editor': 10, 'Composer': 8, 'Producer': 10, 'Production designer': 7, 'Cast': 6}
films, used = [], set()
for key, f in F.items():
    crew = {}
    for q, role in f['crew']:
        if keep(q, role, f['year']): crew.setdefault(q, []).append(role)
    rows = sorted(crew.items(), key=lambda kv: -sum(WEIGHT[r] for r in kv[1]))[:8]
    tot = sum(sum(WEIGHT[r] for r in roles) for _, roles in rows)
    pct = [round(100 * sum(WEIGHT[r] for r in roles) / tot) for _, roles in rows]
    pct[0] += 100 - sum(pct)
    used.update(q for q, _ in rows)
    der = f['der']; base = up(f['thumb']); head, name = base.rsplit('/', 1)
    hero, scenes = PICKS.get(key, (int(f['dur'] * .45), [(int(f['dur'] * x), None) for x in (.15, .4, .62, .85)]))
    dirs = [q for q, roles in crew.items() if 'Director' in roles]
    films.append(dict(key=key, title=f['title'], year=f['year'], kind=f['kind'], secs=round(f['dur']), dur=clock(f['dur']), blurb=f['blurb'],
        by=[P[q]['name'] for q in dirs][:2], country=[L[c] for c in f['country']][:1], company=[CO[c]['name'] for c in f['company']][:1],
        tb=head + '/', tn=name.split('px--', 1)[1], at=hero, scenes=[[t, n] for t, n in scenes],
        w=f['w'], webm=der.get('480p.vp9.webm') or der.get('240p.vp9.webm'), hd=der.get('1080p.vp9.webm'), mov=der.get('360p.mpeg4.mov'),
        page=f['page'], lic=f['lic'], wd=f['q'], imdb=f['imdb'], wiki=f['enwiki'],
        crew=[dict(name=P[q]['name'], role=', '.join(roles).capitalize() if len(roles) < 4 else ', '.join(roles[:3]).capitalize() + ' and more', pct=p) for (q, roles), p in zip(rows, pct)]))
bykey = {f['key']: f for f in films}
people = {}
ORDER = ['Director', 'Writer', 'Cinematographer', 'Editor', 'Composer', 'Producer', 'Production designer', 'Cast']
for q in used:
    p = P[q]
    mine = [f for f in films if any(c['name'] == p['name'] for c in f['crew'])]
    roles = [r for f in F.values() for qq, r in f['crew'] if qq == q]
    main = max(ORDER, key=lambda r: (roles.count(r) * (3 if r != 'Cast' else 2), -ORDER.index(r)))
    credits = []
    for role in ORDER:
        c = p['credits'].get(role)
        if not c: continue
        lst = [dict(title=bykey[x['key']]['title'] if x['key'] in bykey else x['title'], year=x['year'], key=x['key'] if x['key'] in bykey else None) for x in c['list'] if not re.match(r'^Q\d+$', x['title'])]
        if lst: credits.append(dict(role='Actor' if role == 'Cast' else role, total=c['total'], list=lst))
    people[p['name']] = dict(name=p['name'], role='Actor' if main == 'Cast' else main, desc=p['desc'], born=p['born'], died=p['died'], bornIn=L.get(p['bp']), diedIn=L.get(p['dp']),
        occ=[L[o] for o in p['occ'] if L.get(o)], pic=up(p['portrait']), wd=q, imdb=p['imdb'], wiki=p['enwiki'], films=[f['key'] for f in mine], credits=credits)
def asset(i, **kw):
    return dict(title=i['title'], by=i['by'], lic=i['lic'], page=i['page'], **kw)
music = [asset(i, perf=i['perf'] or (i['credit'] if i['credit'] and i['by'].split()[-1] not in i['credit'] else ''), secs=round(i['dur']), dur=clock(i['dur']), pic=up(i['pic']), src=i['der'].get('mp3') or i['url'], alt=i['der'].get('ogg')) for i in a['music']]
images = [asset(i, year=i['year'], medium=i['medium'], pic=up(i['thumb']), w=i['w'], h=i['h']) for i in a['images']]
footage = []
for i in a['footage']:
    head, name = up(i['thumb']).rsplit('/', 1)
    footage.append(asset(i, w=i['w'], secs=round(i['dur']), dur=clock(i['dur']), tb=head + '/', tn=name.split('px--', 1)[1], webm=i['der'].get('480p.vp9.webm') or i['der'].get('240p.vp9.webm'), mov=i['der'].get('360p.mpeg4.mov')))
companies = {}
for f in F.values():
    for c in f['company']:
        x = CO[c]; companies.setdefault(x['name'], dict(name=x['name'], founded=x['founded'], place=L.get(x['hq']) or L.get(x['country']), films=[]))['films'].append(f['key'])
cat = dict(films=films, people=people, companies=list(companies.values()), music=music, images=images, footage=footage)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/catalog.js')
open(out, 'w').write('// Built by the scripts in tools/catalog from Wikimedia Commons and Wikidata. Every work listed is public domain or CC0;\n// each entry keeps a link to its source page. Do not edit by hand.\nconst CATALOG = ' + json.dumps(cat, ensure_ascii=False, separators=(',', ':')) + ';\n')
import os
print(len(films), 'films,', len(people), 'people,', len(music), 'tracks,', len(images), 'images,', len(footage), 'footage;', round(os.path.getsize(out) / 1024), 'KB')
print([ (c['name'], c['founded'], c['place'], len(c['films'])) for c in companies.values()])
for f in films[:3]: print(f['title'], f['by'], f['crew'])
print([ (p['name'], p['role']) for p in list(people.values())[:12]])
print(music[1]['perf'], '|', music[4]['perf'], '|', [f for f in films if not f['webm']])
