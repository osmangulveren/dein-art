"""Builds prototype/assets/onchain.js: artists whose work was minted on Ethereum, with their wallet and collections.

The records come from Art Blocks' public index of its contracts (data.artblocks.io). Artists are picked by one rule:
they released at least one collection under CC0, so its images can be shown. Their other collections are listed without images.
"""
import json, os, re, urllib.request
API = 'https://data.artblocks.io/v1/graphql'
def q(query):
    r = urllib.request.Request(API, json.dumps({'query': query}).encode(), {'content-type': 'application/json', 'User-Agent': 'dein-art-prototype/0.1'})
    d = json.load(urllib.request.urlopen(r, timeout=60))
    if 'errors' in d: raise SystemExit(d['errors'])
    return d['data']
def ok(url):
    try: return urllib.request.urlopen(urllib.request.Request(url, method='HEAD', headers={'User-Agent': 'dein-art-prototype/0.1'}), timeout=40).status == 200
    except Exception: return False
is_cc0 = lambda l: bool(l) and 'cc0' in l.lower()
CHAINS = {1: 'Ethereum', 42161: 'Arbitrum', 8453: 'Base'}
FIELDS = 'id name artist_name artist_address license invocations max_invocations chain_id contract_address project_id website start_datetime'
seed = q('{ projects_metadata(where:{license:{_ilike:"%cc0%"}, chain_id:{_eq:1}}) { artist_address } }')['projects_metadata']
wallets = sorted({p['artist_address'] for p in seed})
projects = q('{ projects_metadata(where:{artist_address:{_in:%s}}, order_by:{start_datetime:asc}) { %s } }' % (json.dumps(wallets), FIELDS))['projects_metadata']
artists = {}
for p in projects:
    a = artists.setdefault(p['artist_address'], dict(name=p['artist_name'], address=p['artist_address'], website=None, collections=[]))
    a['website'] = a['website'] or p['website']
    c = dict(name=p['name'], cc0=is_cc0(p['license']), minted=p['invocations'], max=p['max_invocations'], chain=CHAINS.get(p['chain_id'], str(p['chain_id'])), contract=p['contract_address'],
             project=p['project_id'], date=(p['start_datetime'] or '')[:10], tokens=[])
    if c['cc0'] and p['chain_id'] == 1 and p['invocations']:
        n = p['invocations']; picks = sorted({int(n * x) for x in (0, .13, .27, .41, .55, .69, .83, .97)})
        toks = q('{ tokens_metadata(where:{project_id:{_eq:"%s"}, invocation:{_in:%s}}, order_by:{invocation:asc}) { token_id invocation preview_asset_url live_view_url } }' % (p['id'], json.dumps(picks)))['tokens_metadata']
        for t in toks:
            full = t['preview_asset_url']; head, name = full.rsplit('/', 1); still = name.rsplit('.', 1)[0] + '.png'
            # animated pieces have a video preview; use a still image of them, or leave the piece out
            img = next((u for u in (f'{head}/thumb/{still}', f'{head}/{still}') if ok(u)), None)
            if img: c['tokens'].append(dict(id=t['token_id'], n=t['invocation'], img=img, live=t['live_view_url']))
    a['collections'].append(c)
    print(p['artist_name'], '|', p['name'], '|', 'CC0' if c['cc0'] else p['license'], '|', c['minted'], '/', c['max'], '|', c['chain'], '|', len(c['tokens']), 'images')
# An artist's own site can list more than one index knows. These entries are a plain index of what the artist publishes there:
# name, year, a one-line description written for dein.art, and links. No text or images are taken from the site.
# slug on the site, name, year, description, marketplace or project link (as given on the site), contract (as given on the site), chain
JACK = 'https://jack.art/'
LISTED = {
 '0xc8f8e2f59dd95ff67c3d39109eca2e2a017d4c8a': dict(site=JACK, film=dict(title='VV (A Film by Zora)', page=JACK), works=[
  ('credits', 'Credits', '2026', 'Payment records drawn as grids of four printing colours.', 'https://opensea.io/collection/credits', None, None),
  ('kyc', 'Know Your Collector', '2026', 'Invented portraits, each shaped by the collector who chose it.', 'https://opensea.io/collection/kyc-vv', None, None),
  ('wrappers', 'Wrappers', '2026', 'Images of opened card packs, issued as collectible wrappers.', 'https://opensea.io/collection/wrappers-jackbutcher', '0xd716473c8eb83a2102def2b6390d9dfe74b2f580', None),
  ('economy-of-words', 'Economy of Words', '2026', 'Single words issued as graded cards and priced at auction.', 'https://economyofwords.com', None, None),
  ('stock', 'Stock', '2025', 'A soup brand shown as a stock chart, in six generative treatments.', 'https://opensea.io/collection/stock-jackbutcher', '0x6ccdaf280fe8df9f3c2406223df3312b8cf6db14', None),
  ('self-checkout', 'Self Checkout', '2025', 'An installation where what a visitor pays sets the length of the receipt.', 'https://receipts.vv.xyz', None, None),
  ('gas-wars', 'Gas Wars', '2025', 'Generative aircraft simulations, released through Art Blocks.', 'https://www.artblocks.io/collection/gas-wars-by-jack-butcher', None, None),
  ('lemonade-stand', 'Lemonade Stand', '2025', 'Nine poster-style images about the market around publishing online.', 'https://zora.co/@visualizevalue', None, None),
  ('full-set', 'Full Set', '2025', 'Twenty-seven editions that form one grid.', 'https://opensea.io/collection/vv-full-set', None, None),
  ('hardware-2025', 'Hardware', '2025', 'Digital images that borrow the look of physical proof.', 'https://hardware.highlight.xyz', '0x82e30a63bccde3724877878a30c4977b52348198', 'Base'),
  ('latent', 'Latent', '2024', 'Generated images paired with digital negatives and darkroom prints.', None, None, None),
  ('supply', '1 of 1 of ?', '2024', 'One image issued both as a unique work and as an open edition.', None, None, None),
  ('opepen-edition', 'Opepen Edition', '2023', 'A running collection: artists propose sets and collectors opt in.', 'https://opepen.art', None, None),
  ('checks-originals', 'Checks', '2023', 'A work about verification. Collectors combine pieces, so fewer remain each time.', 'https://checks.art', None, None),
  ('trademark', 'Trademark', '2023', 'Generative images built from the registered-trademark symbol.', 'https://opensea.io/collection/trademark-by-jack-butcher', None, None),
  ('signature', 'Signature', '2023', 'Generative marks based on the burnout a racing driver leaves after a win.', None, None, None),
  ('checks-elements', 'Checks Elements', '2023', 'Monoprints paired with digital works from Checks.', None, None, None),
  ('vv-rare', 'VV Rare', '2021', 'Unique digital works about ownership and online markets.', None, None, None),
  ('vv-editions', 'VV Editions', '2021', 'Digital works released in different edition sizes.', None, None, None),
 ]),
}
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-')
for a in artists.values():
    for c in a['collections']: c.update(slug=slug(c['name']), year=c['date'][:4])
    x = LISTED.get(a['address'])
    if not x: continue
    a.update(site=x['site'], film=x['film'])
    known = {c['name']: c for c in a['collections']}; ordered = []
    for sl, name, year, about, market, contract, chain in x['works']:
        c = known.pop(name, None) or dict(name=name, cc0=False, tokens=[], slug=slug(name), listed=True)
        c.update(year=year, about=about, page=x['site'] + sl)
        if market: c['market'] = market
        if contract and not c.get('contract'): c.update(contract=contract, chain=chain or 'Ethereum')
        ordered.append(c)
    a['collections'] = ordered + list(known.values())
    print(a['name'], ':', len(a['collections']), 'collections,', sum(1 for c in a['collections'] if c['tokens']), 'with images')
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/onchain.js')
open(out, 'w').write('// Built by tools/catalog/6_onchain.py from Art Blocks\' public index of its Ethereum contracts.\n// These artists have not joined dein.art: their pages are unclaimed until signed for with the wallet listed here.\nconst ONCHAIN = ' + json.dumps(list(artists.values()), ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(artists), 'artists;', round(os.path.getsize(out) / 1024), 'KB')
