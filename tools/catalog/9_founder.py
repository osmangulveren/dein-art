"""Builds prototype/assets/founder.js: the profile of dein.art's founder, Osman Burak Gülveren, at his request.

Sources, read on 2026-10-03 in a browser (both sites block scripts):
- IMDb, https://www.imdb.com/name/nm10748755/ : credits, roles, years, episode counts, posters, mini bio.
- OpenSea, https://opensea.io/osmangulveren : wallet, ENS name, bio, avatar, banner and the collections he created.
Family details and wallet value shown on those pages are left out on purpose.
"""
import json, os, re
WALLET = '0xe803aad78e6eabcde6f820d2c64cf83402eddbe2'
POSTER = lambda h: f'https://m.media-amazon.com/images/M/{h}._V1_QL75_UX380_.jpg'
TITLES = {
 'tt13705320': ('Berber', 2016, 'Short film', 'MV5BNWI5OTllYmQtODI0NS00NDQ0LThlODctZTQ4OTQ2ZGM3Y2E1XkEyXkFqcGc@'),
 'tt13241712': ('Usta Eller Masali', 2019, 'TV series', 'MV5BZjYzZDkzYzQtYWUyNi00Njk5LTljMzUtNTFkNGY1ZTJiOGM5XkEyXkFqcGc@'),
 'tt10452186': ('Ucuz Hayatlar', 2019, 'TV series', 'MV5BOTk0YTdkNDktYWMxNi00MzYxLTljNjEtNDRlMjNmOTgwMWQyXkEyXkFqcGc@'),
 'tt21217174': ('Bes Halka', 2022, 'TV mini series', 'MV5BOGM4OTNmZGMtZDMxOC00MzgyLTkwZmYtZDMyNmFlYWFhNTgxXkEyXkFqcGc@'),
 'tt11690036': ('Homur & Gumur (Dumper & Skoop)', 2019, 'TV series', 'MV5BZjgyZjU0NjMtOTcxYy00NGI4LTk0NzQtYTYxMzkwNTk3Mjc4XkEyXkFqcGc@'),
 'tt27997350': ('Crossing the Red Line', 2024, 'Feature film', 'MV5BMzZkYjkzM2QtMGY4Zi00Y2JlLTgyYTctZWVmMmY4N2Q5M2JjXkEyXkFqcGc@'),
 'tt32874797': ("Russian Invasion of Ukraine, What's Next?", None, 'Documentary', 'MV5BZTE1YjljNDEtN2FiMC00NjQzLWIwMWEtYzRiMTg0ZWZlY2Y3XkEyXkFqcGc@'),
}
# role on IMDb, title, how he is credited, episodes, upcoming
CREDITS = [
 ('Director', 'tt32874797', 'directed by', 0, True), ('Director', 'tt13705320', 'directed by', 0, False),
 ('Writer', 'tt32874797', 'created by', 0, True), ('Writer', 'tt13241712', 'written by', 5, False), ('Writer', 'tt10452186', 'writer', 8, False), ('Writer', 'tt13705320', 'written by', 0, False),
 ('Producer', 'tt32874797', 'producer', 0, True), ('Producer', 'tt11690036', 'line producer assistant', 0, False), ('Producer', 'tt13705320', 'producer', 0, False),
 ('Editor', 'tt32874797', 'edited by', 0, True), ('Editor', 'tt13705320', 'edited by', 0, False),
 ('Assistant director', 'tt21217174', 'assistant director', 0, False), ('Assistant director', 'tt13241712', 'assistant director', 5, False), ('Assistant director', 'tt10452186', 'assistant director', 8, False),
 ('Self', 'tt27997350', 'self', 0, False),
]
CREATED = {  # collection name on OpenSea -> cover image
 "Russian Invasion of Ukraine: What's Next?": 'ethereum/393179d553a84956a23ac6f85e8db80e/4ad921c03958c476ad9d7ce5cebeec/e14ad921c03958c476ad9d7ce5cebeec.jpeg',
 'OUR Film3 Studio - Ring of Values': 'ethereum/4008d2b0f7c94d36a1c55578e5fa7471/0f41d4f9fe7cced77ae634fae5dfc8/300f41d4f9fe7cced77ae634fae5dfc8.jpeg',
 'Tales Of Earth': 'ethereum/0x495f947276749ce646f68ac8c248420045cb7b5e/fa8aec2627c439cf0694128daa0e39c8.png',
 'A Fistful of Dollars': 'ethereum/f379bb6011d74686868bf35dfce27c0a/8bd3704d8bc099a408c1864e7f1953/648bd3704d8bc099a408c1864e7f1953.jpeg',
 'A Street Story [MOMENTs]': 'ethereum/0x495f947276749ce646f68ac8c248420045cb7b5e/37964fecea3a739e589c85fa111d3b6b.png',
 'bLACK&Work': 'ethereum/0x495f947276749ce646f68ac8c248420045cb7b5e/e4ef517fc9eb968e9f7da24223b1e1c0.png',
 'More Than One by OSMAN GULVEREN': 'ethereum/0x495f947276749ce646f68ac8c248420045cb7b5e/880f7943a5dd0028d646a45029359e05.png',
 'NINFA 1:1s V1': 'ethereum/37098c1fdfae45a6837ef9f848ac42ae/6e279ed01a3934b225a6d457e29391/226e279ed01a3934b225a6d457e29391.png',
 'The Journey by 0sman': 'ethereum/5ff453418d204b7c8dbd67e3b1e22262/2248c76f85534d7ec71206e1f17b02/b22248c76f85534d7ec71206e1f17b02.png',
 'STATE OF MIND by Osman Gulveren': 'ethereum/0x495f947276749ce646f68ac8c248420045cb7b5e/e7ddef141843f659dfe33f69581d076c.png',
 'experiMENTAL': 'ethereum/f2f3d7ea83274786906b37d3f57e0e44/2bc124126ddbe7d10ff73811e81dd1/422bc124126ddbe7d10ff73811e81dd1.png',
 'BLeU WaR': 'ethereum/0xb9983f4d2dedc266b4bfc131da9cdd04548c1feb/a0f6870ffe45a7e6ba1786338274cb96.jpeg',
 'Save > Freedom to Transact': 'zora/0xbf7b150cd01f610c7178f904c173e5d346b37ea2/a19c9edabf71b4ffb9275c83dc1762/fea19c9edabf71b4ffb9275c83dc1762.jpeg',
 'Day by Day': 'ethereum/0x6df9bb5d8c067de97031d62de63c4d94a54fb567/9746ddc3afcfed95496bcec5d290b5/ec9746ddc3afcfed95496bcec5d290b5.jpeg',
 'BluePrint.': 'ethereum/0xe2541c3a2367ed85c8138993cef9cbd3809706de/415655fbd16d40ddfcb50d02aeca00c1.jpeg',
 '//Sketches': 'zora/044b3d09b08746e88aae7720c73b778a/3b99c33c14ffd8a11bccd2949d9eca/b83b99c33c14ffd8a11bccd2949d9eca.png',
 'FakePoster by OSMVN': 'ethereum/f710b6fbecca4c74bad72cf57daaf489/2208ddc5397571c2218553f9918376/1a2208ddc5397571c2218553f9918376.jpeg',
 "BURN don't OBEY": 'ethereum/0x2a962871ba3d2da835ff7085b1c7a3c9658b6972/43b609c10c6d3e0f0cd68dcbdb2c594d.gif',
 'temple': 'ethereum/cd99148cfa4742d1b08667d9d72f7bd3/6f78919f81489b8116e50969a00566/3d6f78919f81489b8116e50969a00566.jpeg',
 'Based One': 'base/0x47049a8ac15488a99c15a103ce008685e6effebc/30591bae855cb66572008d0aae575f1a.png',
 'Desire of Beauty': 'matic/81b3b2f9da8d3b068e55671d26605058/a05d5a857024f977d393c9cd6ece1f/4ea05d5a857024f977d393c9cd6ece1f.jpeg',
 'The Blood Lake & The Blue Sky': 'ethereum/0x8a31fa75bd0d6cfc08a2fd1738d465e82c816798/1b486befc2d5d4d5f1ebb81fc2ed007a.jpeg',
 'reserve(d)': 'ethereum/6160e2a9e3f13a77b7a102cd508f3170/9ffb94e6fca97bbcad47d121a84b15/be9ffb94e6fca97bbcad47d121a84b15.jpeg',
 '↓free_fall↓ editions↓ merge derivative': 'ethereum/0xde30d9bcae9bee89359d6d70831aa0110662fb8d/9471c1cd9b5e274dc2d56bb6c447b860.png',
 'Becoming Zorba': 'base/4a20edda2b314bd2aba2208346c0eeb1/54ee47f94f10f8a4a5e74e306a08ee/f154ee47f94f10f8a4a5e74e306a08ee.png',
 'JustArt': 'base/3bce107d9b804ccb9bf2da17515402f7/12379f5462a6fb33ba5d10056b6758/7712379f5462a6fb33ba5d10056b6758.png',
 'Look Around.': 'collection/lookaroundyou-sVjrhAC2ul/image/b45923a3df04bb376beed073b0e7c1/fcb45923a3df04bb376beed073b0e7c1.jpeg',
 'Censored Content': 'ethereum/0x5187329a595791d52ebc6ea3ad260eefe486676a/af9178a87a3057b84e52ad35dca35229.png',
 '0Nchain': 'base/2ea0d3fedb344e96ace8a7fe7e92243c/6476a1332747a951171bc541505b6c/546476a1332747a951171bc541505b6c.png',
 '[one/one]': 'ethereum/1874f0d3fa8d4e9abfcef824f666a59e/2e07739884e03d5d79b446b7f26565/ed2e07739884e03d5d79b446b7f26565.jpeg',
 'Quratorz': 'ethereum/027f25158ec24540aa97932a2178beee/c530e341e17a712f1173e929aa7997/1cc530e341e17a712f1173e929aa7997.jpeg',
 '0>1': None,
}
CHAINS = {'ethereum': 'Ethereum', 'base': 'Base', 'matic': 'Polygon', 'zora': 'Zora', 'collection': 'Ethereum'}
slug = lambda n: re.sub(r'[^a-z0-9]+', '-', n.lower()).strip('-') or 'collection'
collections = []
for name, path in CREATED.items():
    c = dict(name=name, slug=slug(name), year='', cc0=False, own=True, chain=CHAINS[path.split('/')[0]] if path else 'Ethereum', tokens=[dict(img=f'https://i2c.seadn.io/{path}?w=500')] if path else [],
             page='https://opensea.io/osmangulveren/created', market='https://opensea.io/osmangulveren/created')
    if name.startswith('Russian Invasion'): c['about'] = 'Photographs from Ukraine in March and April 2022, released as NFTs alongside the documentary of the same name.'
    collections.append(c)
roles = {}
for role, tt, credited, eps, upcoming in CREDITS:
    title, year, kind, img = TITLES[tt]
    roles.setdefault(role, []).append(dict(title=title, year=year, key=None, imdb=tt, img=POSTER(img), kind=kind, credited=credited, eps=eps, upcoming=upcoming))
founder = dict(
  name='Osman Burak Gülveren', address=WALLET, ens='osmanburak.eth', listed=True, founder=True,
  role='Director', line='Documentary filmmaker and photographer · Writer · Producer · Türkiye',
  bio="Documentary filmmaker and photographer from Türkiye, archiving important moments and stories for the future. He started at Mavi Baykuş Animation Studio on 'Homur ile Gumur', wrote the documentaries 'Ucuz Hayatlar' and 'Usta Eller Masalı', and is finishing 'Russian Invasion of Ukraine: What's Next?' as director, writer, producer and editor. Founder of dein.art.",
  pic='https://i2c.seadn.io/profiles/0xe803aad78e6eabcde6f820d2c64cf83402eddbe2/avatar/5898b827dcf0f4750aa260a60daaca/055898b827dcf0f4750aa260a60daaca.jpeg?w=500',
  banner='https://i2c.seadn.io/profiles/0xe803aad78e6eabcde6f820d2c64cf83402eddbe2/banner/71fa933f95f6dfb37e5574df78ec67/2d71fa933f95f6dfb37e5574df78ec67.jpeg?w=2000',
  links=[['IMDb', 'https://www.imdb.com/name/nm10748755/'], ['OpenSea', 'https://opensea.io/osmangulveren'], ['X', 'https://x.com/osmangulveren'], ['Instagram', 'https://www.instagram.com/osmanburakgulveren'], ['Linktree', 'https://linktr.ee/osmangulveren']],
  imdb='nm10748755', credits=[dict(role=r, total=len(l), list=l) for r, l in roles.items()], collections=collections,
)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/assets/founder.js')
open(out, 'w').write('// Built by tools/catalog/9_founder.py: the founder\'s own profile, from his IMDb and OpenSea pages, at his request.\nONCHAIN.unshift(' + json.dumps(founder, ensure_ascii=False, separators=(',', ':')) + ');\n')
print(len(collections), 'collections,', sum(len(l) for l in roles.values()), 'credits')
