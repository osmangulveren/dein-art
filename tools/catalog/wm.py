import json, urllib.request, urllib.parse, time, os, hashlib
UA = {'User-Agent': 'dein-art-prototype/0.1 (https://github.com/osmangulveren/dein-art; catalogue build script)'}
def get(url, params=None, cache=True):
    if params: url += '?' + urllib.parse.urlencode(params)
    key = 'cache/' + hashlib.md5(url.encode()).hexdigest() + '.json'
    if cache and os.path.exists(key): return json.load(open(key))
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=40) as r: d = json.load(r)
            break
        except Exception as e:
            if i == 3: raise
            time.sleep(2 + i * 3)
    os.makedirs('cache', exist_ok=True); json.dump(d, open(key, 'w')); time.sleep(.15)
    return d
C = 'https://commons.wikimedia.org/w/api.php'
def search(q, n=8, kind='video'):
    d = get(C, dict(action='query', format='json', generator='search', gsrnamespace=6, gsrsearch=f'{q} filetype:{kind}', gsrlimit=n,
                    prop='imageinfo', iiprop='url|size|mime|extmetadata', iiurlwidth=960))
    out = []
    for p in sorted(d.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 0)):
        ii = p['imageinfo'][0]; em = ii.get('extmetadata', {})
        out.append(dict(title=p['title'], url=ii['url'], thumb=ii.get('thumburl'), w=ii.get('width'), h=ii.get('height'), dur=ii.get('duration'), size=ii.get('size'), mime=ii.get('mime'),
                        lic=em.get('LicenseShortName', {}).get('value'), artist=em.get('Artist', {}).get('value', '')[:80]))
    return out
