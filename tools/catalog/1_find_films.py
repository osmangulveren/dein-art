from wm import *
from films import FILMS
W = 'https://www.wikidata.org/w/api.php'
OK = lambda lic: lic and lic.lower().replace('-', ' ').strip() in ('public domain', 'cc0', 'pd', 'no restrictions') or (lic or '').lower().startswith('pd')
def fileinfo(name, width=960):
    d = get(C, dict(action='query', format='json', titles='File:' + name, prop='videoinfo', viprop='url|size|mime|extmetadata|derivatives', viurlwidth=width))
    p = list(d['query']['pages'].values())[0]
    if 'videoinfo' not in p: return None
    v = p['videoinfo'][0]; em = v.get('extmetadata', {})
    return dict(file=name, page='https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name.replace(' ', '_')), url=v['url'], thumb=v.get('thumburl'), w=v.get('width'), h=v.get('height'), dur=v.get('duration'),
                lic=em.get('LicenseShortName', {}).get('value'), der=[(x.get('shorttitle') or x.get('title'), x['src'], x.get('type')) for x in v.get('derivatives', [])])
def wd_find(title, year):
    d = get(W, dict(action='wbsearchentities', format='json', language='en', search=title, type='item', limit=10))
    for r in d['search']:
        desc = r.get('description', '')
        if str(year) in desc and 'film' in desc: return r['id'], desc
    for r in d['search']:
        desc = r.get('description', '')
        if 'film' in desc and any(str(y) in desc for y in (year - 1, year + 1)): return r['id'], desc
    return None, [ (r['id'], r.get('description')) for r in d['search'] ]
out = {}
for key, file, title, year, kind, blurb in FILMS:
    f = fileinfo(file)
    q, desc = wd_find(title, year)
    print(key, '|', f and f['lic'], '|', f and round(f['dur'] / 60, 1), '|', q, '|', desc)
    if f: print('    ', [d[0] for d in f['der']])
    out[key] = dict(f=f, q=q)
json.dump(out, open('b1.json', 'w'))
