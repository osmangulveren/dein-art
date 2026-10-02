"""Builds prototype/assets/onchain.js: artists whose work was minted on Ethereum, with their wallet and collections.

The records come from Art Blocks' public index of its contracts (data.artblocks.io). Artists are picked by one rule:
they released at least one collection under CC0, so its images can be shown. Their other collections are listed without images.
"""
import json, os, urllib.request
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
            full = t['preview_asset_url']; head, name = full.rsplit('/', 1); thumb = f'{head}/thumb/{name}'
            c['tokens'].append(dict(id=t['token_id'], n=t['invocation'], img=thumb if ok(thumb) else full, live=t['live_view_url']))
    a['collections'].append(c)
    print(p['artist_name'], '|', p['name'], '|', 'CC0' if c['cc0'] else p['license'], '|', c['minted'], '/', c['max'], '|', c['chain'], '|', len(c['tokens']), 'images')
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/onchain.js')
open(out, 'w').write('// Built by tools/catalog/6_onchain.py from Art Blocks\' public index of its Ethereum contracts.\n// These artists have not joined dein.art: their pages are unclaimed until signed for with the wallet listed here.\nconst ONCHAIN = ' + json.dumps(list(artists.values()), ensure_ascii=False, separators=(',', ':')) + ';\n')
print(len(artists), 'artists;', round(os.path.getsize(out) / 1024), 'KB')
