"""Builds prototype/assets/studios.js: studio pages for film studios, music studios, DAOs, art studios and galleries.

Film studios come from the production companies credited on the films (Wikidata, via catalog.js). The others are
organisations with public records: Musopen (recordings released to the public domain), Nouns DAO (its token and
treasury, read from Ethereum through Blockscout) and Visualize Value (Jack Butcher's studio). The one-line
descriptions are written for dein.art. Living organisations are listed as unclaimed: they have not joined dein.art.
"""
import json, os, urllib.request
BS = 'https://eth.blockscout.com/api/v2'
def get(url):
    return json.load(urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'dein-art-prototype/0.1'}), timeout=60))

import base64
RPC = 'https://ethereum-rpc.publicnode.com'
def token_uri(contract, n):
    data = '0xc87b56dd' + hex(n)[2:].rjust(64, '0')    # tokenURI(uint256)
    req = urllib.request.Request(RPC, json.dumps({'jsonrpc': '2.0', 'id': 1, 'method': 'eth_call', 'params': [{'to': contract, 'data': data}, 'latest']}).encode(), {'content-type': 'application/json', 'User-Agent': 'dein-art-prototype/0.1'})
    r = json.load(urllib.request.urlopen(req, timeout=60)).get('result')
    if not r or r == '0x': return None
    raw = bytes.fromhex(r[2:]); length = int.from_bytes(raw[32:64], 'big'); uri = raw[64:64 + length].decode()
    return json.loads(base64.b64decode(uri.split(',', 1)[1])) if uri.startswith('data:application/json;base64,') else None

STUDIOS = [
 dict(slug='star-film', name='Star Film Company', company='Star Film Company', type='Film studio', place='Montreuil, France', founded=1896, until=1913, wd='Q2297787',
      about="Georges Méliès's production company, with a glass-walled studio at Montreuil, near Paris."),
 dict(slug='prana-film', name='Prana Film', company='Prana Film', type='Film studio', place='Berlin, Germany', founded=1921, until=1922,
      about='A Berlin company set up to make supernatural films. Nosferatu was its only production.'),
 dict(slug='edison-studios', name='Edison Studios', company='Edison Studios', type='Film studio', place='New Jersey and New York, United States', founded=1894, until=1918,
      about="Thomas Edison's film company, where Edwin S. Porter made The Great Train Robbery."),
 dict(slug='vufku', name='VUFKU', company='All-Ukrainian Photo-Cinema Administration', type='Film studio', place='Soviet Ukraine', founded=1922, until=1930,
      about='The state film organisation of Soviet Ukraine, which produced Man with a Movie Camera.'),
 dict(slug='metro-pictures', name='Metro Pictures', company='Metro Pictures', type='Film studio', place='Los Angeles, United States', founded=1915, until=1924,
      about="A Hollywood studio that released Buster Keaton's Sherlock Jr. before it merged into MGM."),
 dict(slug='hal-roach-studios', name='Hal Roach Studios', company='Hal Roach Studios', type='Film studio', place='Culver City, United States', founded=1919,
      about="Hal Roach's comedy studio, home of Safety Last! with Harold Lloyd."),
 dict(slug='rex', name='Rex Motion Picture Company', company='Rex Motion Picture Company', type='Film studio', place='United States', founded=1909,
      about="An American studio of the 1910s that produced Lois Weber's Suspense."),
 dict(slug='musopen', name='Musopen', type='Music studio', place='United States', site='https://musopen.org', unclaimed=True, performer='Musopen',
      about='A non-profit that records classical music and releases the recordings to the public domain.'),
 dict(slug='nouns-dao', name='Nouns DAO', type='DAO', place='Ethereum', founded=2021, site='https://nouns.wtf', unclaimed=True,
      token='0x9C8fF314C9Bc7F6e59A9d9225Fb22946427eDC03', treasury='0xb1a32FC9F9D8b2cf86C068Cae13108809547ef71', treasuryName='nouns.eth',
      about='A DAO that auctions one Noun a day, every day. Each Noun is a vote, and the art is CC0.'),
 dict(slug='visualize-value', name='Visualize Value', type='Art studio', place='Online', founded=2019, site='https://vv.xyz', unclaimed=True, artist='Jack Butcher',
      about="Jack Butcher's studio, behind Checks, Opepen Edition and the VV editions."),
]
for s in STUDIOS:
    if s.get('token'):
        t = get(f"{BS}/tokens/{s['token']}")
        s['chain'] = dict(token=s['token'], name=t.get('name'), symbol=t.get('symbol'), holders=int(t.get('holders_count') or 0), supply=int(t.get('total_supply') or 0), treasury=s['treasury'], treasuryName=s['treasuryName'])
        # Nouns keep their art on-chain: tokenURI returns the metadata, with the image inside it as SVG
        s['chain']['pieces'] = []
        for n in [0, 1, 7, 42, 100, 222, 404, 600, 808, 1000, 1500, 2000]:
            if n >= s['chain']['supply'] + 40: continue
            meta = token_uri(s['token'], n)
            if meta and meta.get('image'): s['chain']['pieces'].append(dict(id=str(n), img=meta['image'], name=meta.get('name')))
        tr = get(f"{BS}/addresses/{s['treasury']}")
        s['chain']['treasuryEth'] = round(int(tr.get('coin_balance') or 0) / 1e18, 2)
        print(s['name'], '| holders', s['chain']['holders'], '| supply', s['chain']['supply'], '| treasury', s['chain']['treasuryEth'], 'ETH |', len(s['chain']['pieces']), 'pieces |', (s['chain']['pieces'][0]['img'] or '')[:40])
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/studios.js')
open(out, 'w').write('// Built by tools/catalog/8_studios.py. Film studios are the production companies credited on the films (Wikidata);\n// Musopen, Nouns DAO and Visualize Value are listed from public records and are unclaimed until they join.\nconst STUDIOS = ' + json.dumps(STUDIOS, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(STUDIOS), 'studios;', round(os.path.getsize(out) / 1024), 'KB')
