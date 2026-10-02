from wm import *
W = 'https://www.wikidata.org/w/api.php'
OKL = lambda l: bool(l) and (l.lower() in ('public domain', 'cc0', 'no restrictions') or l.lower().startswith('pd') or l.lower().startswith('cc0'))
def info(name, width=960):
    d = get(C, dict(action='query', format='json', titles='File:' + name, prop='videoinfo', viprop='url|size|mime|extmetadata|derivatives', viurlwidth=width))
    p = list(d['query']['pages'].values())[0]
    if 'videoinfo' not in p: print('MISSING', name); return None
    v = p['videoinfo'][0]; em = v.get('extmetadata', {})
    return dict(file=name, page='https://commons.wikimedia.org/wiki/File:' + urllib.parse.quote(name.replace(' ', '_')), url=v['url'].split('?')[0], thumb=(v.get('thumburl') or '').split('?')[0], w=v.get('width'), h=v.get('height'), dur=v.get('duration'), mime=v.get('mime'),
                lic=em.get('LicenseShortName', {}).get('value'), credit=__import__('re').sub('<[^>]+>', '', em.get('Artist', {}).get('value', '')).strip()[:90],
                der={x.get('transcodekey', 'original'): x['src'].split('?')[0] for x in v.get('derivatives', [])})
def person_img(name, hint):
    d = get(W, dict(action='wbsearchentities', format='json', language='en', search=name, type='item', limit=5))
    for r in d['search']:
        if hint in r.get('description', ''):
            e = get(W, dict(action='wbgetentities', format='json', ids=r['id'], props='claims'))['entities'][r['id']]
            c = e['claims'].get('P18')
            if c:
                i = info(c[0]['mainsnak']['datavalue']['value'], 500)
                if i and OKL(i['lic']): return i['thumb'], r['id']
            return None, r['id']
    return None, None
MUSIC = [
 ('Kimiko Ishizaka - J.S. Bach- -Open- Goldberg Variations, BWV 988 (Piano) - 01 Aria.mp3', 'Goldberg Variations: Aria', 'Johann Sebastian Bach', 'Kimiko Ishizaka, piano', 'composer'),
 ('Nocturne Op. 9 no. 2 in E flat major.mp3', 'Nocturne in E-flat major, Op. 9 No. 2', 'Frédéric Chopin', '', 'composer'),
 ('Clair de lune (Claude Debussy) Suite bergamasque.ogg', 'Clair de lune', 'Claude Debussy', '', 'composer'),
 ("Ludwig van Beethoven - sonata no. 14 in c sharp minor 'moonlight', op. 27 no. 2 - i. adagio sostenuto.ogg", 'Moonlight Sonata: Adagio sostenuto', 'Ludwig van Beethoven', '', 'composer'),
 ('Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg', 'Gymnopédie No. 1', 'Erik Satie', '', 'composer'),
 ('Grieg - Peer Gynt Suite No. 1, Op. 46 - I. Morning Mood (Musopen Symphony).flac', 'Peer Gynt: Morning Mood', 'Edvard Grieg', 'Musopen Symphony', 'composer'),
 ('Grieg - Peer Gynt Suite No. 1, Op. 46 - IV. In the Hall of the Mountain King (Musopen Symphony).flac', 'Peer Gynt: In the Hall of the Mountain King', 'Edvard Grieg', 'Musopen Symphony', 'composer'),
 ('Kimiko Ishizaka - Bach - Well-Tempered Clavier, Book 1 - 03 Prelude No. 2 in C minor, BWV 847.ogg', 'The Well-Tempered Clavier: Prelude No. 2 in C minor', 'Johann Sebastian Bach', 'Kimiko Ishizaka, piano', 'composer'),
]
IMAGES = [
 ('Great Wave off Kanagawa2.jpg', 'The Great Wave off Kanagawa', 'Katsushika Hokusai', 'c. 1831', 'Woodblock print'),
 ('Vincent van Gogh - Starry Night - Google Art Project.jpg', 'Starry Night Over the Rhône', 'Vincent van Gogh', '1888', 'Painting'),
 ('Meisje met de parel.jpg', 'Girl with a Pearl Earring', 'Johannes Vermeer', 'c. 1665', 'Painting'),
 ('Monet - Impression, Sunrise.jpg', 'Impression, Sunrise', 'Claude Monet', '1872', 'Painting'),
 ('Klimt - The Kiss.jpg', 'The Kiss', 'Gustav Klimt', '1908', 'Painting'),
 ('Hilma af Klint - The Ten Largest No. 3 - Youth - 1907.jpg', 'The Ten Largest, No. 3: Youth', 'Hilma af Klint', '1907', 'Painting'),
 ('Composition VII - Wassily Kandinsky, GAC.jpg', 'Composition VII', 'Wassily Kandinsky', '1913', 'Painting'),
 ('Kaplumbağa Terbiyecisi vers2.jpg', 'The Tortoise Trainer', 'Osman Hamdi Bey', '1906', 'Painting'),
 ('NASA-Apollo8-Dec24-Earthrise.jpg', 'Earthrise', 'William Anders, NASA', '1968', 'Photograph'),
 ('The Earth seen from Apollo 17.jpg', 'The Blue Marble', 'Apollo 17 crew, NASA', '1972', 'Photograph'),
 ('Lange-MigrantMother02.jpg', 'Migrant Mother', 'Dorothea Lange', '1936', 'Photograph'),
 ('Adams The Tetons and the Snake River.jpg', 'The Tetons and the Snake River', 'Ansel Adams', '1942', 'Photograph'),
 ('Voyage dans la Lune affiche.jpg', 'A Trip to the Moon: the 1902 poster', 'Georges Méliès', '1902', 'Poster'),
]
FOOTAGE = [
 ('Time-lapse Earth Flyover from NASA Astronaut in Space.webm', 'Earth flyover from the Space Station, time-lapse', 'NASA'),
 ('A Trip down market street (1906).webm', 'A Trip Down Market Street, San Francisco 1906', 'Miles Brothers'),
 ('Apollo 11 launch, video of engines at 500 fps (camera E-8).ogv', 'Apollo 11 launch at 500 frames per second', 'NASA'),
 ('Power for Apollo - Saturn V.webm', 'Power for Apollo: building the Saturn V', 'NASA'),
 ('Aurora Borealis and the United States at Night.ogv', 'Aurora over North America at night, from orbit', 'NASA'),
]
out = dict(music=[], images=[], footage=[])
cache = {}
for f, title, comp, perf, hint in MUSIC:
    i = info(f)
    if comp not in cache: cache[comp] = person_img(comp, hint)
    i.update(title=title, by=comp, perf=perf, pic=cache[comp][0]); out['music'].append(i)
    print('M', title, '|', i['lic'], '|', round(i['dur']), '|', sorted(i['der']), '|', i['credit'], '|', bool(i['pic']))
for f, title, by, yr, medium in IMAGES:
    i = info(f); i.update(title=title, by=by, year=yr, medium=medium); out['images'].append(i)
    print('I', title, '|', i['lic'], '|', i['w'], i['h'], '|', i['thumb'][-60:])
for f, title, by in FOOTAGE:
    i = info(f); i.update(title=title, by=by); out['footage'].append(i)
    print('F', title, '|', i['lic'], '|', round(i['dur']), '|', sorted(i['der']))
out['music'][4]['pic'] = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Erik_Satie_-_BNF1.jpeg/500px-Erik_Satie_-_BNF1.jpeg'  # SATIE: public-domain portrait from the BnF
json.dump(out, open('b4.json', 'w'), ensure_ascii=False, indent=1)
