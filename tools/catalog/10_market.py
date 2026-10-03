"""Builds prototype/assets/market.js and prototype/files/sfx/*.zip: the marketplace items that are not films, people or
merch — CC0 and public-domain sound effects (single sounds and zipped packs), photographs and footage from Wikimedia Commons,
and the templates dein.art made itself (tools/templates). Every Commons file is kept only if it is public domain or CC0."""
import json, os, re, zipfile, urllib.parse, urllib.request, urllib.error
from wm import get, C
HERE = os.path.dirname(os.path.abspath(__file__)); SITE = os.path.join(HERE, '../../prototype')
OK = lambda l: bool(l) and (l.lower() in ('public domain', 'cc0', 'no restrictions') or l.lower().startswith('pd') or 'cc0' in l.lower())
slug = lambda s: re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]
def info(name, width=960):
    d = get(C, dict(action='query', format='json', titles='File:' + name, prop='videoinfo', viprop='url|size|mime|extmetadata|derivatives', viurlwidth=width))
    p = list(d['query']['pages'].values())[0]
    if 'videoinfo' not in p: print('MISSING', name); return None
    v = p['videoinfo'][0]; lic = v.get('extmetadata', {}).get('LicenseShortName', {}).get('value')
    if not OK(lic): print('NOT FREE', lic, name); return None
    return dict(name=name, url=v['url'].split('?')[0], thumb=(v.get('thumburl') or '').split('?')[0].replace('thumb.wikimedia.org', 'upload.wikimedia.org'), w=v.get('width'), h=v.get('height'),
                dur=v.get('duration'), size=v.get('size'), mime=v.get('mime'), lic='CC0' if 'cc0' in lic.lower() else 'Public domain',
                page='https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name.replace(' ', '_')), der={x.get('transcodekey', 'original'): x['src'].split('?')[0] for x in v.get('derivatives', [])})
import time
def fetch(url):
    for n in range(8):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'dein-art-prototype/0.1 (https://github.com/osmangulveren/dein-art)'}), timeout=120).read()
            time.sleep(1.5); return data
        except urllib.error.HTTPError as e:
            if e.code != 429 or n == 7: raise
            time.sleep(10 * (n + 1))
def clock(s): s = int(round(s or 0)); return f'{s // 60}:{s % 60:02}'
items = []
# ---------- sound effects: single sounds, and a zip per pack ----------
SFX = {
 'Weather & nature': [('Rain and thunder (1).ogg', 'Rain and thunder'), ('Rain against the window.ogg', 'Rain against a window'), ('Howling wind.ogg', 'Howling wind'), ('Birds chirping in a garden.ogg', 'Birds in a garden'), ('Rain thunder and birds.ogg', 'Rain, thunder and birds')],
 'Rooms & ambience': [('Restaurant ambience.ogg', 'Restaurant ambience'), ('Shopping mall less crowded.ogg', 'Shopping mall'), ('Indoor swimming pool hall.ogg', 'Indoor swimming pool'), ('1 minute at the alexa mall in berlin.ogg', 'A minute in a Berlin mall')],
 'Foley & objects': [('Door handle creaking.ogg', 'Door handle creak'), ('Metal cabinet door jarring.ogg', 'Metal cabinet door'), ('Rusty metal door clasp.ogg', 'Rusty door clasp'), ('Clock ticking.ogg', 'Clock ticking'), ('Alarm clock ticking.ogg', 'Alarm clock ticking'), ('406243 stubb typewriter-ding-near-mono.wav', 'Typewriter bell'), ('Car Horn.wav', 'Car horn'), ('Steam engine.ogg', 'Steam engine')],
 'Applause & crowd': [('Clapping hurray.ogg', 'Clapping and cheering'), ('277021 sandermotions applause-2.wav', 'Applause'), ('619016 mrrap4food clapping-then-leaving.mp3', 'Clapping, then leaving')],
}
os.makedirs(f'{SITE}/files/sfx', exist_ok=True)
for pack, sounds in SFX.items():
    got = []
    for f, title in sounds:
        i = info(f)
        if not i: continue
        prev = i['der'].get('mp3') or (i['url'] if i['mime'] == 'audio/mpeg' else None)
        it = dict(id='sfx-' + slug(title), cat='Sound effects', sub=pack, title=title, by='Wikimedia Commons contributors', price=0, lic=i['lic'], kind='audio', audio=prev,
                  files=[dict(name=f, size=i['size'], url=i['url'])], specs=dict(Length=clock(i['dur']), Format=f.rsplit('.', 1)[-1].upper()), source=i['page'],
                  desc=f'{title}. A {clock(i["dur"])} recording, free to use in any project.')
        items.append(it); got.append((i, it))
    zpath = f'{SITE}/files/sfx/{slug(pack)}.zip'
    if not os.path.exists(zpath):
        with zipfile.ZipFile(zpath, 'w', zipfile.ZIP_STORED) as z:
            for i, it in got:
                data = fetch(i['url'])
                z.writestr(f'{pack}/{it["title"]}.{i["name"].rsplit(".", 1)[-1]}', data)
            z.writestr(f'{pack}/SOURCES.txt', '\n'.join(f'{it["title"]}: {i["page"]} ({i["lic"]})' for i, it in got) + '\n')
    items.append(dict(id='sfx-pack-' + slug(pack), cat='Sound effects', sub='Packs', title=f'{pack} — sound pack', by='Wikimedia Commons contributors', price=0, lic='CC0 and public domain', kind='pack',
                      audio=got[0][1]['audio'], files=[dict(name=os.path.basename(zpath), size=os.path.getsize(zpath), url='files/sfx/' + os.path.basename(zpath))],
                      contents=[dict(title=it['title'], length=it['specs']['Length'], audio=it['audio'], id=it['id']) for i, it in got],
                      specs=dict(Sounds=len(got), Format='Zip of OGG, WAV and MP3'), desc=f'{len(got)} {pack.lower()} sounds in one download, each free to use. The pack lists where every sound comes from.'))
    print(pack, len(got), 'sounds,', round(os.path.getsize(zpath) / 1e6, 1), 'MB')
# ---------- photographs ----------
PHOTOS = [('Aldrin Apollo 11 original.jpg', 'Buzz Aldrin on the Moon', 'NASA', 1969, 'Space & science'), ('Pillars of creation 2014 HST WFC3-UVIS full-res denoised.jpg', 'Pillars of Creation', 'NASA, ESA, Hubble', 2014, 'Space & science'),
 ('Hubble ultra deep field.jpg', 'Hubble Ultra Deep Field', 'NASA, ESA', 2004, 'Space & science'), ('Saturn from Cassini Orbiter (2004-10-06).jpg', 'Saturn from Cassini', 'NASA, JPL', 2004, 'Space & science'),
 ('Mount Everest ISS008-E-6150.JPG', 'Mount Everest from the Space Station', 'NASA', 2004, 'Space & science'), ('Detroit Publishing Company - Shakespeare\'s Memorial Theatre, Stratford-on-Avon, England.jpg', "Shakespeare's Memorial Theatre, Stratford", 'Detroit Publishing Co.', 1900, 'Photography'),
 ('Dresden. Zwinger & Sophienkirche. - Detroit Publishing Co.jpg', 'Dresden, Zwinger and Sophienkirche', 'Detroit Publishing Co.', 1900, 'Photography'), ('Flatiron Building NYC c1903.jpg', 'Flatiron Building, New York', 'Detroit Publishing Co.', 1903, 'Photography'),
 ('New York City views. LOC gsc.5a22644.jpg', 'Times Square, New York', 'Gottscho-Schleisner, Library of Congress', 1950, 'Photography'),
 ('Trees with snow on branches, "Half Dome, Apple Orchard, Yosemite," California. April 1933., 1933 - NARA - 520018.jpg', 'Half Dome, Apple Orchard, Yosemite', 'Ansel Adams, National Archives', 1933, 'Photography')]
for f, title, by, year, sub in PHOTOS:
    i = info(f)
    if not i: continue
    items.append(dict(id='ph-' + slug(title), cat='Photos & images', sub=sub, title=title, by=by, price=0, lic=i['lic'], kind='image', pic=i['thumb'], files=[dict(name=f, size=i['size'], url=i['url'])],
                      specs=dict(Year=year, Size=f'{i["w"]:,} × {i["h"]:,} px', Format=i['mime'].split('/')[-1].upper()), source=i['page'], desc=f'{title}, {year}. Full-resolution original, free to use.'))
# ---------- footage ----------
FOOTAGE = [('Earth Illuminated- ISS Time-lapse Photography.webm', 'Earth at night from the Space Station', 'NASA', 'Space & science'), ('Artemis I Launch to ICPS (1222409007178).webm', 'Artemis I launch', 'NASA', 'Space & science'),
 ('Falcon 9 Flight 99 first stage landing (KSC-20201121-MH-MAT01-0001).webm', 'Falcon 9 booster landing', 'NASA', 'Space & science'), ('STS-132 Liftoff Space Shuttle Atlantis.ogv', 'Space Shuttle Atlantis lift-off', 'NASA', 'Space & science'),
 ('Jellyfish- 2016 Deepwater Exploration of the Marianas.webm', 'Deep-sea jellyfish', 'NOAA', 'Nature'), ('Underwater video of melon-headed whales at Palmyra Atoll.webm', 'Melon-headed whales underwater', 'U.S. Fish and Wildlife Service', 'Nature'),
 ('Sunrise high tide on the Oregon Coast (38715168302).webm', 'Sunrise at high tide, Oregon coast', 'Bureau of Land Management', 'Nature'), ('Kilauea volcano eruption- Watch incredible footage of lava lake.webm', 'Kilauea lava lake', 'USGS', 'Nature')]
for f, title, by, sub in FOOTAGE:
    i = info(f)
    if not i: continue
    d = i['der']; hd = d.get('1080p.vp9.webm') or d.get('720p.vp9.webm') or d.get('480p.vp9.webm')
    items.append(dict(id='ft-' + slug(title), cat='Footage', sub=sub, title=title, by=by, price=0, lic=i['lic'], kind='video', pic=i['thumb'], video=d.get('480p.vp9.webm') or d.get('240p.vp9.webm'), mov=d.get('360p.mpeg4.mov'),
                      files=[dict(name=f'{slug(title)}-1080p.webm' if '1080p.vp9.webm' in d else f'{slug(title)}.webm', size=None, url=hd)] + ([dict(name=f, size=i['size'], url=i['url'], note='original')] if i['size'] < 2.5e8 else []),
                      specs=dict(Length=clock(i['dur']), Size=f'{i["w"]} × {i["h"]}', Format='WebM'), source=i['page'], desc=f'{title}. {clock(i["dur"])} of public-domain footage, free to use.'))
# ---------- templates dein.art made (tools/templates) ----------
T = 'files/templates/'; sz = lambda p: os.path.getsize(f'{SITE}/{p}')
WORKS_LUT = ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', 'Edius', 'Photoshop']
WORKS_ANY = ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', 'Edius', 'CapCut']
looks = ['Melies 1902 Sepia', 'Nitrate Night Blue', 'Amber Interior', 'Nocturne Teal and Amber', 'Bleach Bypass', 'Faded Film', 'Silver Contrast BW', 'Day for Night']
items += [
 dict(id='tpl-film-looks', cat='Templates', sub='Colour grading (LUTs)', title='Film looks — 8 LUTs', by='dein.art Studio', price=0, lic='CC0', kind='template', pic=T + 'luts/cover.jpg', gallery=[T + f'luts/{slug(l)}.jpg' for l in looks],
      files=[dict(name='dein-art-film-looks-luts.zip', size=sz(T + 'dein-art-film-looks-luts.zip'), url=T + 'dein-art-film-looks-luts.zip')], works=WORKS_LUT,
      specs=dict(Looks=8, Format='.cube, 33-point', Includes=', '.join(looks)), desc='Eight looks from early cinema to modern grading: sepia, night blue and amber tints, teal and amber, bleach bypass, faded film, high-contrast black and white, and day for night. Each preview shows the photo before (left) and after (right).'),
 dict(id='tpl-film-grain', cat='Templates', sub='Overlays', title='Film grain overlay', by='dein.art Studio', price=0, lic='CC0', kind='video', pic=T + 'film-grain.jpg', video=T + 'dein-art-film-grain-overlay.mp4',
      files=[dict(name='dein-art-film-grain-overlay.mp4', size=sz(T + 'dein-art-film-grain-overlay.mp4'), url=T + 'dein-art-film-grain-overlay.mp4')], works=WORKS_ANY,
      specs=dict(Length='0:08, loops', Size='1920 × 1080, 24 fps', Format='MP4 (H.264)', Blend='Overlay or Soft Light'), desc='Fine moving grain on mid grey. Put it above your footage and set the blend mode to Overlay or Soft Light.'),
 dict(id='tpl-dust-scratches', cat='Templates', sub='Overlays', title='Dust and scratches overlay', by='dein.art Studio', price=0, lic='CC0', kind='video', pic=T + 'dust-and-scratches.jpg', video=T + 'dein-art-dust-and-scratches-overlay.mp4',
      files=[dict(name='dein-art-dust-and-scratches-overlay.mp4', size=sz(T + 'dein-art-dust-and-scratches-overlay.mp4'), url=T + 'dein-art-dust-and-scratches-overlay.mp4')], works=WORKS_ANY,
      specs=dict(Length='0:08, loops', Size='1920 × 1080, 24 fps', Format='MP4 (H.264)', Blend='Screen'), desc='Specks, a passing scratch and a little flicker on black, for an old-print feel. Use the Screen blend mode.'),
 dict(id='tpl-light-leaks', cat='Templates', sub='Overlays', title='Light leaks overlay', by='dein.art Studio', price=0, lic='CC0', kind='video', pic=T + 'light-leaks.jpg', video=T + 'dein-art-light-leaks-overlay.mp4',
      files=[dict(name='dein-art-light-leaks-overlay.mp4', size=sz(T + 'dein-art-light-leaks-overlay.mp4'), url=T + 'dein-art-light-leaks-overlay.mp4')], works=WORKS_ANY,
      specs=dict(Length='0:08', Size='1920 × 1080, 24 fps', Format='MP4 (H.264)', Blend='Screen or Add'), desc='Warm leaks drifting across black, for transitions and dreamy moments. Use the Screen or Add blend mode.'),
 dict(id='tpl-lower-thirds', cat='Templates', sub='Titles & lower thirds', title='Lower thirds — 6 designs', by='dein.art Studio', price=0, lic='CC0', kind='template', pic=T + 'lower-thirds/lower-third-bar.png', dark=True,
      gallery=[T + f'lower-thirds/{n}.png' for n in ['lower-third-bar', 'lower-third-glass', 'lower-third-serif', 'lower-third-minimal', 'location-tag', 'chapter-title']],
      files=[dict(name='dein-art-lower-thirds.zip', size=sz(T + 'dein-art-lower-thirds.zip'), url=T + 'dein-art-lower-thirds.zip')], works=WORKS_ANY + ['Illustrator', 'Figma'],
      specs=dict(Designs=6, Format='SVG (editable text) and PNG with transparency', Size='1920 × 1080'), desc='Names, roles, places and chapter titles. Edit the text in the SVGs, or drop the transparent PNGs straight onto your timeline.'),
 dict(id='tpl-intertitles', cat='Templates', sub='Titles & lower thirds', title='Silent film intertitles — 4 cards', by='dein.art Studio', price=0, lic='CC0', kind='template', pic=T + 'silent-film-intertitles/intertitle-classic.png',
      gallery=[T + f'silent-film-intertitles/{n}.png' for n in ['intertitle-classic', 'intertitle-dialogue', 'intertitle-chapter', 'intertitle-the-end']],
      files=[dict(name='dein-art-silent-film-intertitles.zip', size=sz(T + 'dein-art-silent-film-intertitles.zip'), url=T + 'dein-art-silent-film-intertitles.zip')], works=WORKS_ANY + ['Illustrator', 'Figma'],
      specs=dict(Cards=4, Format='SVG (editable text) and PNG', Size='1920 × 1080'), desc='Ornate black title cards in the style of the 1920s: a narration card, a dialogue card, an act card and The End.'),
]
out = f'{SITE}/assets/market.js'
open(out, 'w').write('// Built by tools/catalog/10_market.py: marketplace items beyond films, people and merch. Commons files are public domain or CC0;\n// templates were made by dein.art (tools/templates) and are CC0.\nconst MARKET_EXTRA = ' + json.dumps(items, ensure_ascii=False, separators=(',', ':')) + ';\n')
from collections import Counter
print(len(items), 'items', Counter(i['cat'] for i in items), round(os.path.getsize(out) / 1024), 'KB')
