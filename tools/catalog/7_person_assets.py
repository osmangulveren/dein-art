"""Builds prototype/assets/assets.js: the assets on an artist's page, grouped by type, with the details shown in the pop-up.

Each file is on Wikimedia Commons and is kept only if it is marked public domain or CC0. Titles and captions are written here;
dates, credits, sizes and licences come from the file's own record.
"""
import json, os, re, html, urllib.parse
from wm import get, C
OK = lambda l: bool(l) and (l.lower() in ('public domain', 'cc0', 'no restrictions') or l.lower().startswith('pd') or l.lower().startswith('cc0'))
WIDTHS = [250, 330, 500, 960, 1280]
# type, file on Commons, title, caption, year, film on dein.art (key in catalog.js) if any
PEOPLE = {
 'Buster Keaton': [
  ('Posters', 'Sherlock jr poster.jpg', 'Sherlock Jr.: release poster', 'One-sheet poster for the 1924 release.', 1924, 'sherlock-jr'),
  ('Posters', 'Buster Keaton in The General; poster.jpg', 'The General: release poster', 'Poster for the 1926 release.', 1926, 'the-general'),
  ('Posters', 'Buster keaton one week poster.jpg', 'One Week: release poster', 'Poster for the 1920 two-reeler.', 1920, 'one-week'),
  ('Posters', 'Buster Keaton - The Navigator film poster.jpg', 'The Navigator: release poster', 'Poster for the 1924 feature.', 1924, None),
  ('Posters', 'Seven Chances (poster, 1925).jpg', 'Seven Chances: insert poster', 'Tall insert poster for the 1925 feature.', 1925, None),
  ('Posters', 'Keaton Go West 1925.jpg', 'Go West: release poster', 'Poster for the 1925 feature.', 1925, None),
  ('Posters', 'Cops 1922 poster.jpg', 'Cops: release poster', 'Poster for the 1922 two-reeler.', 1922, None),
  ('Posters', 'The Cameraman (Keaton) poster.jpg', 'The Cameraman: half-sheet poster', 'Poster for the 1928 feature.', 1928, None),
  ('Lobby cards', 'Buster Keaton Neighbors (1920) Lobby Card.jpg', 'Neighbors: lobby card', 'Card displayed in cinema lobbies for the 1920 two-reeler.', 1920, None),
  ('Lobby cards', 'Cops (1922) Lobby Card.jpg', 'Cops: lobby card', 'Card displayed in cinema lobbies for the 1922 two-reeler.', 1922, None),
  ('Lobby cards', 'The Electric House (1922) lobby card.jpg', 'The Electric House: lobby card', 'Card displayed in cinema lobbies for the 1922 two-reeler.', 1922, None),
  ('Lobby cards', 'Lobby card for the Buster Keaton film College (1927).jpg', 'College: lobby card', 'Card displayed in cinema lobbies for the 1927 feature.', 1927, None),
  ('Production stills', 'Buster Keaton on the cow-catcher in The General.jpg', 'The General: on the cow-catcher', 'Keaton riding the front of the locomotive.', 1926, 'the-general'),
  ('Production stills', 'Buster Keaton attempts to enlist in The General.jpg', 'The General: at the recruiting office', 'Keaton tries to enlist.', 1926, 'the-general'),
  ('Production stills', 'Buster Keaton drives a two-man, railroad handcar in The General.jpg', 'The General: the handcar', 'Keaton working a two-man railroad handcar alone.', 1926, 'the-general'),
  ('Production stills', 'Buster Keaton kissing Marion Mack in The General.jpg', 'The General: with Marion Mack', 'Keaton and Marion Mack.', 1926, 'the-general'),
  ('Production stills', 'Buster Keaton relaxing with a newspaper in The General.jpg', 'The General: with a newspaper', 'Keaton reading a newspaper between scenes of the film.', 1926, 'the-general'),
  ('Production stills', 'Silent film theater in Sherlock Jr., 1924, with Buster Keaton.png', 'Sherlock Jr.: the cinema', 'The cinema where the projectionist walks into the screen.', 1924, 'sherlock-jr'),
  ('Production stills', 'Kathryn McGuire and Buster Keaton in The Navigator.jpg', 'The Navigator: with Kathryn McGuire', 'Keaton and Kathryn McGuire.', 1924, None),
  ('Production stills', 'Still from Cops 1922.png', 'Cops: still', 'A frame from the 1922 two-reeler.', 1922, None),
  ('Photographs', 'Busterkeaton edit.jpg', 'Studio portrait', 'Portrait photograph of Keaton.', None, None),
  ('Photographs', 'Buster Keaton, film actor (SAYRE 3998).jpg', 'Portrait from the Sayre collection', 'Portrait photograph of Keaton.', None, None),
  ('Photographs', 'Buster Keaton with writers and director in 1923.jpg', 'With his writers and director', 'Keaton with his writers and director in 1923.', 1923, None),
  ('Photographs', 'Buster Keaton in costume.jpg', 'In costume', 'Keaton in costume.', None, None),
  ('Footage', 'Scene from One Week (1920).webm', 'One Week: a scene', 'A short scene from the 1920 two-reeler.', 1920, 'one-week'),
  ('Footage', 'Keaton Cops pt2.ogv', 'Cops: part 2', 'A section of the 1922 two-reeler.', 1922, None),
  ('Footage', 'Keaton Cops pt3.ogv', 'Cops: part 3', 'A section of the 1922 two-reeler.', 1922, None),
  ('Footage', 'Keaton Cops pt5.ogv', 'Cops: part 5', 'A section of the 1922 two-reeler.', 1922, None),
  ('Press', 'Buster Keaton - Jan 1921 Film Fun.jpg', 'Film Fun, January 1921', 'Magazine page featuring Keaton.', 1921, None),
  ('Press', 'Battling Butler (Picture-Play, October 1926).jpg', 'Picture-Play, October 1926', 'Magazine page for Battling Butler.', 1926, None),
  ('Press', 'Exhibitors Herald - October 14, 1922 frozen north.jpg', 'Exhibitors Herald, 14 October 1922', 'Trade paper page for The Frozen North.', 1922, None),
 ],
}
def clean(s): return re.sub(r'\s+', ' ', html.unescape(re.sub('<[^>]+>', '', s or ''))).strip()
def clock(s): s = int(round(s)); return f'{s // 60}:{s % 60:02}'
def info(name):
    d = get(C, dict(action='query', format='json', titles='File:' + name, prop='videoinfo', viprop='url|size|mime|extmetadata|derivatives', viurlwidth=500))
    p = list(d['query']['pages'].values())[0]
    return p['videoinfo'][0] if 'videoinfo' in p else None
out = {}
for person, rows in PEOPLE.items():
    groups = {}
    for typ, f, title, note, year, key in rows:
        v = info(f)
        if not v: print('MISSING', f); continue
        em = v.get('extmetadata', {}); lic = em.get('LicenseShortName', {}).get('value')
        if not OK(lic): print('SKIP', lic, f); continue
        thumb = v['thumburl'].split('?')[0].replace('thumb.wikimedia.org', 'upload.wikimedia.org'); w = v['width']
        big = thumb
        if v['mime'].startswith('image') and '/thumb/' in thumb:
            best = [x for x in WIDTHS if x <= w][-1]; big = thumb.replace('/500px-', f'/{best}px-')
            if w < 500: thumb = thumb.replace('/500px-', f'/{[x for x in WIDTHS if x <= w][-1]}px-')
        credit = clean(em.get('Artist', {}).get('value'))
        it = dict(title=title, note=note, year=year, film=key, pic=thumb, big=big, w=w, h=v['height'], format=v['mime'].split('/')[-1].upper().replace('JPEG', 'JPEG').replace('WEBM', 'WebM').replace('OGG', 'Ogg'),
                  mb=round(v['size'] / 1e6, 1), lic=lic, credit=credit if 0 < len(credit) <= 70 and 'unknown' not in credit.lower() else '', page='https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(f.replace(' ', '_')), url=v['url'].split('?')[0])
        if v.get('duration'):
            der = {x.get('transcodekey', 'original'): x['src'].split('?')[0] for x in v.get('derivatives', [])}
            it.update(dur=clock(v['duration']), webm=der.get('480p.vp9.webm') or der.get('240p.vp9.webm'), mov=der.get('360p.mpeg4.mov'))
        groups.setdefault(typ, []).append(it)
        print(typ, '|', title, '|', lic, '|', f"{w}x{v['height']}", '|', it['format'], it['mb'], 'MB |', it.get('dur', ''), '|', it['credit'])
    out[person] = [dict(type=t, items=items) for t, items in groups.items()]
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/assets.js')
open(path, 'w').write('// Built by tools/catalog/7_person_assets.py from Wikimedia Commons. Public-domain and CC0 files only.\nconst ASSETS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(round(os.path.getsize(path) / 1024), 'KB')
