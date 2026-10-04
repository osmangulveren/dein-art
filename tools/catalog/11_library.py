"""Builds prototype/assets/library.js: the big free library on the marketplace — more than a thousand public-domain or CC0
files in each of footage, music, sound effects, photos & images, and scripts & documents.
Everything but most sound effects comes from Wikimedia Commons, kept only when Commons records the file as public domain
or CC0 (asked for in the search, then checked again on the file's own licence line). Sound effects are mostly CC0 sounds
from Freesound, found through the Openverse API (licence = cc0; no key needed, 200 requests a day).
Files are not copied: the site links the originals and downloads them through /api/download.
Run from a working directory where a cache/ folder may be written:  python3 11_library.py"""
import json, os, re, sys, html, hashlib, urllib.parse, urllib.request, time, threading
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '../../prototype/assets/library.js')
UA = {'User-Agent': 'dein-art-prototype/0.1 (https://github.com/osmangulveren/dein-art; library build script)'}
API = 'https://commons.wikimedia.org/w/api.php'
FREE = 'haswbstatement:P6216=Q19652|P275=Q6938433'          # copyright status: public domain, or licence: CC0
OK = lambda l: bool(l) and (l.lower() in ('public domain', 'cc0', 'no restrictions') or l.lower().startswith('pd') or 'cc0' in l.lower())
def get(params):
    url = API + '?' + urllib.parse.urlencode(params); key = 'cache/' + hashlib.md5(url.encode()).hexdigest() + '.json'
    if os.path.exists(key): return json.load(open(key))
    for i in range(7):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: d = json.load(r)
            break
        except Exception as e:
            if i == 6: print('GIVE UP', e, file=sys.stderr); return {}
            time.sleep(4 + i * 6)
    os.makedirs('cache', exist_ok=True); json.dump(d, open(key, 'w')); time.sleep(.25)
    return d

# category → (kind, target, [(kind of thing, search words, most to take, what the file name must contain)])
# The last one keeps a shelf honest: None = anything the search returns, True = one of the search words, or a pattern.
W = lambda sub, words: [(sub, w, 120, True) for w in words.split(', ')]
MAG = r'motion picture|moving picture|photoplay|film|movie|cinema|screen|exhibitor|variety|boxoffice|showmen|radio|cinematograph|picture'
PLAN = {
 'Footage': ('video', 1700, [('Space & science', 'NASA', 260, None), ('Archival film', 'newsreel', 200, None), ('Archival film', 'silent film', 160, None), ('Nature & wildlife', 'wildlife', 200, None), ('Timelapse', 'timelapse', 140, None),
    ('Aerial', 'aerial', 180, None), ('Science & technology', 'laboratory experiment', 120, None), ('Cities & travel', 'city street', 140, None), ('Earth & weather', 'storm hurricane satellite', 160, None), ('Sea & water', 'ocean underwater', 160, None),
    ('People & work', 'factory workers', 120, None), ('Aviation', 'aircraft flight', 160, None), ('Archival film', 'documentary 19', 160, None), ('Space & science', 'spacewalk astronaut', 160, None), ('Space & science', 'rocket launch', 180, None),
    ('Nature & wildlife', 'USFWS', 200, None), ('Earth & weather', 'NOAA', 160, None), ('Nature & wildlife', 'national park', 200, None), ('Space & science', 'Hubble', 160, None), ('Space & science', 'animation orbit', 160, None)]),
 'Music': ('audio', 1800, [('Orchestral', 'Musopen symphony', 220, None), ('Piano', 'Musopen piano', 200, None), ('Chamber', 'Musopen quartet', 140, None), ('Marches & bands', 'United States Navy Band', 130, None), ('Marches & bands', 'United States Marine Band', 130, None),
    ('Marches & bands', 'Air Force Band', 110, None), ('Piano', 'sonata', 140, None), ('Orchestral', 'symphony', 200, None), ('Orchestral', 'concerto', 160, None), ('Piano', 'piano', 220, None), ('Chamber', 'string quartet', 120, None), ('Dances', 'waltz', 120, None),
    ('Ragtime & early jazz', 'ragtime', 120, None), ('Ragtime & early jazz', 'jazz 19', 120, None), ('Opera & song', 'opera aria', 120, None), ('Folk & traditional', 'folk song', 140, None), ('Anthems', 'national anthem', 120, None), ('Organ & choral', 'organ', 120, None),
    ('Guitar & strings', 'guitar', 120, None), ('Orchestral', 'overture', 120, None), ('Early recordings', 'Edison cylinder', 160, None), ('Early recordings', 'Victor record 19', 160, None)]),
 'Sound effects': ('audio', 1450, [('Freesound', 'freesound', 260, None), ('Animals', 'xeno-canto', 260, None)]
    + W('Weather & nature', 'rain, thunder, wind, waves, river, stream, water, storm, forest, sea, waterfall, fire, snow, hail, beach, jungle, creek, surf')
    + W('Animals', 'bird, birds, frog, cricket, dog, cat, horse, whale, cow, sheep, rooster, owl, crow, gull, bee, cicada, wolf, lion, elephant, monkey, pig, duck, goose, chicken, dolphin, bat, toad, sparrow, blackbird, nightingale, cuckoo, woodpecker, insects, chirping, purring, barking, howl, warbler, thrush, finch, robin, wren, lark, heron, eagle, hawk, parrot, pigeon, dove, swan, crane, loon, seal, elk, coyote, bear, deer, goat, donkey, turkey, peacock, cicadas, crickets, frogs, mosquito, wasp, birdsong')
    + W('Transport', 'train, car, aircraft, ship, motorcycle, helicopter, jet, tram, bus, tractor, traffic, airport, station, locomotive, subway, metro, bicycle, truck, boat, horn, railway')
    + W('Machines', 'machine, engine, motor, chainsaw, drill, hammer, saw, vacuum, printer, pump, fan, generator, turbine, compressor, lathe, mill, typewriter')
    + W('Alarms & signals', 'siren, alarm, bell, bells, whistle, beep, chime, gong, buzzer, ringtone, ring, morse, sonar, signal, tone')
    + W('Foley & objects', 'door, footsteps, clock, keyboard, glass, paper, knock, click, creak, squeak, zipper, coin, keys, shutter, switch, drip, splash, pouring, boiling, crash, bang, pop, scratch, walking, steps, bottle, chain, wood, metal, stone, scissors, camera, telephone, toilet, shower, sink, tap, faucet, kettle, microwave, fridge, lighter, match, broom, lawnmower, elevator, escalator, gate, lock, window, drawer, chair, stairs, pen, book, coins, dice, cards')
    + W('Rooms & ambience', 'ambience, ambient, street, crowd, market, restaurant, cafe, playground, stadium, church, school, city, night, harbor, atmosphere, soundscape, noise, field recording')
    + W('People', 'applause, laugh, laughter, cough, scream, heartbeat, breath, snore, sneeze, clapping, cheering, whistling')
    + W('Impacts & weapons', 'explosion, gunshot, fireworks, cannon, shot, thunderclap, firecracker')
    + W('Electronic', 'synth, static, hum, buzz, laser, sweep, sine, glitch, modem, radio, interference')
    + [('Sounds', 'sound', 300, True), ('Sounds', 'sounds', 300, True), ('Sounds', 'sfx', 100, True), ('Sounds', 'effect', 100, True), ('Space & radio', 'sonification', 80, True), ('Space & radio', 'NASA', 120, None), ('Weather & nature', 'Yellowstone', 120, True), ('Weather & nature', 'NPS', 120, None)]),
 'Photos & images': ('bitmap', 2100, [('Space & science', 'NASA', 200, None), ('Paintings & prints', 'painting oil on canvas', 220, None), ('Paintings & prints', 'ukiyo-e', 150, None), ('Photography', 'Carol M. Highsmith', 200, None),
    ('Photography', 'Dorothea Lange', 120, None), ('Photography', 'Lewis Hine', 100, None), ('Photography', 'Ansel Adams', 100, None), ('Photography', 'Farm Security Administration photograph', 140, None),
    ('Posters & lobby cards', 'film poster', 200, r'poster'), ('Posters & lobby cards', 'lobby card', 120, r'lobby'), ('Illustrations', 'illustration engraving', 160, None), ('Maps', 'map 18', 140, r'map|carte|karte|plan'),
    ('Film stills', 'film still 19', 160, r'still|\(19\d\d'), ('Nature & wildlife', 'USFWS', 160, None), ('Nature & wildlife', 'National Park Service', 160, None), ('Architecture', 'architecture building', 140, None),
    ('Photography', 'Library of Congress photograph', 200, None), ('Paintings & prints', 'watercolor', 150, None), ('Earth & weather', 'NOAA', 140, None)]),
 'Scripts & documents': ('doc', 1600, [('Film magazines', w, 45, MAG) for w in ['"motion picture" magazine', 'Photoplay', '"moving picture world"', '"Motion Picture Herald"', '"Film Daily"', '"Motion Picture News"', '"Exhibitors Herald"', 'Picture-Play', 'Screenland',
      '"Modern Screen"', 'Variety 19', 'Boxoffice', '"Showmen\'s Trade Review"', '"American Cinematographer"', '"International Photographer"', '"Movie Makers"', '"Radio Mirror"', '"Motion Picture Daily"', '"New Movie Magazine"', 'Cinemundial']]
    + [('Plays', 'play "in three acts"', 200, r'play|drama|comedy|tragedy|acts?\b|farce'), ('Plays', 'drama "in four acts"', 160, r'play|drama|comedy|tragedy|acts?\b|farce'), ('Plays', 'comedy "in one act"', 160, r'play|drama|comedy|tragedy|acts?\b|farce'),
       ('Plays', 'farce "in two acts"', 120, r'play|drama|comedy|tragedy|acts?\b|farce'), ('Plays', 'tragedy "in five acts"', 120, r'play|drama|comedy|tragedy|acts?\b|farce'),
       ('Screenwriting & craft', 'photoplay writing', 140, r'photoplay|scenario|screen|script|writ|motion picture|film|movie'), ('Screenwriting & craft', 'scenario', 120, r'photoplay|scenario|screen|script|motion picture|film|movie'),
       ('Screenwriting & craft', 'radio script', 120, r'script'), ('Film history', 'motion pictures', 200, r'motion picture|film|cinema|movie|moving picture|photoplay'), ('Film history', 'cinema history', 140, r'motion picture|film|cinema|movie|moving picture'),
       ('Theatre', 'theatre stage', 160, r'theat|stage|acting|actor|drama'), ('Photography manuals', 'photography manual', 140, r'photograph|camera'), ('Sheet music', 'sheet music', 160, r'music|song|waltz|march|score|piano')]),
}
KIND = {'video': 'filetype:video fileh:>479', 'audio': 'filetype:audio -filemime:audio/midi', 'bitmap': 'filetype:bitmap filew:>1500 -filemime:image/tiff', 'doc': 'filemime:application/pdf'}
BAD_AUDIO = re.compile(r'pronunc|^(LL-|[A-Za-z]{2,3}-\S)|\bIPA\b|spoken|wikipedia|\.mid$|interview|speech|lecture|podcast|reading|audiobook|librivox|voice|Q\d{3,}', re.I)
NOT_SFX = re.compile(r'band\b|symphon|sonat|concert|perform|anthem|\bop\.|remarks|president|speaking|announce|victor|edison|komiku|\(\d{4}|recording\)|orchestra|quartet|choir|waltz|ragtime|\bjazz|\bhymn|track|album|remix|feat\.|theme|\bNo\.? ?\d'
    r'|sung|\bsongs?\b(?!.*\b(bird|whale|frog|sparrow|thrush|warbler|robin|wren|lark|nightingale|blackbird)s?\b)|music|guitar|\bSMV\b|\bSVA\b|berlioz|handel|bach\b|mozart|chopin|blues|VOA|learning english|\bpart [IVX\d]+|ballad|\bmarch\b|polka|\brag\b|opera|\baria\b|chorus'
    r'|\btrio\b|duet|violin|piano|flute|cello|\bbpm\b|prelude|fugue|serenade|lullaby|carol|psalm|mass\b|tango|foxtrot|\bfox trot|two-step|medley|vocal|tenor|soprano|baritone|contralto|\bdub\b|\bmix\b|demo|instrumental|melody|tune\b|folk|dance', re.I)
NOT_SFX2 = re.compile(r' - \d{1,3} - |\b(18|19)\d\d\b|counsel|defend|radio oranje|station spatiale|espace|astronomie|berättar|news|report|broadcast|testimon|trial|نطق|in arabic|in english|wikipedia|article|\b(US|UK|GB|AU)$|argument|opinion|admissions|justice|court|petitioner|v\. ', re.I)
NOT_MUSIC = re.compile(r'dostoyevsky|berättar|chapter|kapitel|librivox|\bread by\b|audiobook|lecture|interview|speech|argument|opinion', re.I)
NOT_STOCK = re.compile(r'minute|what.s up|discuss|interview|briefing|conference|podcast|\btalks?\b|lecture|webinar|speech|remarks|hearing|address|message from|q&a|testimony|statement', re.I)
def clean(title):
    t = re.sub(r'\.[A-Za-z0-9]{2,5}$', '', title.split(':', 1)[1]).replace('_', ' ')
    t = re.sub(r'\s*\((IA|cc0|freesound|pd|page \d+)[^)]*\)', '', t, flags=re.I); t = re.sub(r'^\d{5,}\s+\S+\s+', '', t); t = re.sub(r'\s{2,}', ' ', t).strip(' -–.')
    if ' ' not in t: t = re.sub(r'(?<=[a-z])(?=[A-Z])|(?<=[A-Za-z])(?=\d{4,})', ' ', re.sub(r'[-_]+', ' ', t))     # NASA-Mars2020Rover-FirstTestDrive → words
    t = re.sub(r'\s*[-–]?\s*\b(20\d{6}|\d{9,})\b$', '', t).strip(' -–.(')
    return (t[:1].upper() + t[1:])[:90]
def artist(em):
    a = html.unescape(re.sub(r'<[^>]+>', '', em.get('Artist', {}).get('value', ''))).strip(); a = re.sub(r'\s+', ' ', a).split('\n')[0]
    return '' if not a or len(a) > 60 or re.search(r'unknown|anonymous|see |http', a, re.I) else a

def build(cat, kind, target, queries, out):
    rows, seen = [], set()
    for sub, words, most, must in queries:
        if len(rows) >= target: break
        took, cont = 0, {}
        need = re.compile(r'(?<![a-z])(' + '|'.join(re.escape(w) for w in words.replace('"', '').split()) + ')', re.I) if must is True else re.compile(must, re.I) if must else None
        for _ in range(16 if must else 12):
            # a word that must be in the name is asked for as such, so the search does the filtering
            ask = ('intitle:"' + words + '"' if ' ' in words else 'intitle:' + words) if must is True else words
            d = get(dict(action='query', format='json', generator='search', gsrnamespace=6, gsrsearch=f'{ask} {KIND[kind]} {FREE}', gsrlimit=50, prop='imageinfo', iiprop='url|size|mime|extmetadata', iiextmetadatafilter='LicenseShortName|Artist', **cont))
            for p in sorted(d.get('query', {}).get('pages', {}).values(), key=lambda p: p.get('index', 0)):
                ii = (p.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {}); url = ii.get('url', '').split('?')[0]; lic = em.get('LicenseShortName', {}).get('value')
                path = url.split('/wikipedia/commons/')[-1]
                if not url or path in seen or not OK(lic) or '/wikipedia/commons/' not in url: continue
                w, h, dur, mime, name = ii.get('width') or 0, ii.get('height') or 0, ii.get('duration') or 0, ii.get('mime', ''), p['title']
                if need and not need.search(name.split(':', 1)[1].replace('_', ' ')): continue
                if kind == 'video' and NOT_STOCK.search(name): continue
                if cat == 'Sound effects' and (NOT_SFX.search(name) or NOT_SFX2.search(name.split(':', 1)[1].rsplit('.', 1)[0])): continue
                if cat == 'Music' and (NOT_MUSIC.search(name) or dur > 2400): continue
                if kind == 'video' and (h < 480 or dur < 4 or dur > 7200 or mime not in ('video/webm', 'application/ogg', 'video/ogg', 'video/mpeg', 'video/mp4')): continue
                if kind == 'bitmap' and (w < 1300 or mime not in ('image/jpeg', 'image/png') or w * h > 150e6): continue
                if kind == 'doc' and (w < 500 or ii.get('size', 0) > 400e6): continue
                if kind == 'audio':
                    if BAD_AUDIO.search(name.split(':', 1)[1]) or mime not in ('application/ogg', 'audio/ogg', 'audio/x-flac', 'audio/flac', 'audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/webm'): continue
                    if cat == 'Music' and dur < 40 or cat == 'Sound effects' and not (1.5 <= dur <= 900): continue
                if len(name.encode()) > 150: continue                                   # longer names get a different thumbnail address
                title = clean(name)
                if len(title) < 3: continue
                seen.add(path); took += 1
                rows.append([sub, title, urllib.parse.unquote(path), w, h, round(dur), ii.get('size', 0), 1 if 'cc0' in lic.lower() else 0, artist(em)])
                if took >= most or len(rows) >= target: break
            cont = d.get('continue') or {}
            if took >= most or len(rows) >= target or not cont: break
        print(f'{cat:20} {sub:24} {words:32} +{took:4} = {len(rows)}', flush=True)
    out[cat] = rows

# ---------- CC0 sound effects from Freesound, through Openverse ----------
SOUNDS = {
 'Weather & nature': 'rain, thunder, wind, ocean waves, river stream, forest ambience, fire crackling, storm, waterfall, snow',
 'Animals': 'birds singing, dog bark, cat meow, horse, cow, frog, crickets, wolf howl, bees, owl, rooster, sheep, seagulls, pig',
 'Transport': 'train passing, car engine, airplane, helicopter, motorcycle, boat, traffic, bus, subway, bicycle, car door',
 'Machines': 'machine, drill, engine start, vacuum cleaner, printer, washing machine, chainsaw, fan, typewriter, projector',
 'Alarms & signals': 'siren, alarm, bell, whistle, beep, phone ring, notification, buzzer, church bells',
 'Foley & objects': 'door, footsteps, clock ticking, keyboard typing, glass break, paper, knock, zipper, coins, keys, camera shutter, switch click, water drip, splash, pouring water, cloth, chair, drawer, book, bottle',
 'Rooms & ambience': 'city ambience, crowd, restaurant, market, playground, office, room tone, night ambience, park, airport, cafe, street',
 'People': 'applause, laugh, cough, scream, heartbeat, breathing, sneeze, running footsteps, clapping',
 'Impacts & weapons': 'explosion, gunshot, punch, impact, crash, fireworks, sword',
 'Electronic & interface': 'synth, glitch, laser, whoosh, swoosh, riser, ui click, game, static noise, drone, sci-fi',
}
def openverse(q, page):
    url = 'https://api.openverse.org/v1/audio/?' + urllib.parse.urlencode(dict(license='cc0', source='freesound', page_size=20, q=q, page=page)); key = 'cache/ov-' + hashlib.md5(url.encode()).hexdigest() + '.json'
    if os.path.exists(key): return json.load(open(key))
    for i in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r: d = json.load(r)
            os.makedirs('cache', exist_ok=True); json.dump(d, open(key, 'w')); time.sleep(3.3); return d          # 20 requests a minute are allowed
        except Exception as e:
            print('openverse', q, e, file=sys.stderr); time.sleep(20 + i * 30)
    return {}
def freesound():
    rows, seen = [], set()
    terms = [(sub, q.strip()) for sub, qs in SOUNDS.items() for q in qs.split(',')]
    for page in (1, 2):
        for sub, q in terms[:len(terms) if page == 1 else 34]:
            took = 0
            for r in openverse(q, page).get('results', []):
                url, secs = r.get('url') or '', (r.get('duration') or 0) / 1000
                if r.get('license') != 'cc0' or not url.startswith('https://cdn.freesound.org/') or url in seen or not (0.3 <= secs <= 600): continue
                title = re.sub(r'\.(wav|mp3|aiff?|flac|ogg|m4a)$', '', r.get('title') or '', flags=re.I).replace('_', ' ').strip(' -.')
                title = re.sub(r'\s{2,}', ' ', title)
                if len(title) < 3 or NOT_SFX2.search(title) and not re.search(r'\d{4}', title): continue
                seen.add(url); took += 1
                rows.append([sub, (title[:1].upper() + title[1:])[:90], url, 0, 0, max(1, round(secs)), r.get('filesize') or 0, 1, (r.get('creator') or '')[:60], r.get('foreign_landing_url') or ''])
            print(f'Freesound            {sub:24} {q:24} p{page} +{took:3} = {len(rows)}', flush=True)
    return rows

out = {}
threads = [threading.Thread(target=build, args=(c, k, t, q, out)) for c, (k, t, q) in PLAN.items()]
[t.start() for t in threads]; [t.join() for t in threads]
# music and sound effects are both audio: a file belongs to one of them only
music = {r[2] for r in out['Music']}; out['Sound effects'] = [r for r in out['Sound effects'] if r[2] not in music]
fs = freesound()
# Freesound and Commons share shelves; the sounds alternate so neither source fills the first pages alone
# Commons has few real sound effects among much music and speech, so only the plainly natural recordings are kept from there
SURE = re.compile(r'Yellowstone sound library|National Park|\bwhales?\b|\bcalls?\b|singing|chirp|howls?\b|bark|purr|geyser|\bsound of\b|ambience|ambiance', re.I)
commons = [r for r in out['Sound effects'] if SURE.search(r[1]) and r[5] <= 400]; mixed = []
for i in range(max(len(fs), len(commons))):
    if i < len(fs): mixed.append(fs[i])
    if i < len(commons): mixed.append(commons[i])
out['Sound effects'] = mixed
for r in mixed:
    r[0] = {'Freesound': 'More sounds', 'Sounds': 'More sounds', 'Space & radio': 'More sounds', 'Electronic': 'Electronic & interface'}.get(r[0], r[0])
print('sound effects:', len(fs), 'from Freesound,', len(commons), 'from Commons')
with open(OUT, 'w') as f:
    f.write('// Built by tools/catalog/11_library.py: public-domain and CC0 files on Wikimedia Commons, linked, not copied.\n// Each row: [kind, title, path on Commons (or a full address elsewhere), width, height, seconds, bytes, 1 if CC0 else public domain, credit, source page]\n')
    f.write('const LIBRARY = ' + json.dumps({c: out[c] for c in PLAN}, ensure_ascii=False, separators=(',', ':')) + ';\n')
print({c: len(v) for c, v in out.items()}, os.path.getsize(OUT))
