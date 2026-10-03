"""Makes the dein.art LUT pack: eight .cube colour looks (CC0), with a before/after preview for each.
A .cube LUT works in Premiere Pro, After Effects, DaVinci Resolve, Final Cut Pro, Edius and Photoshop."""
import numpy as np, os, zipfile, urllib.request, io
from PIL import Image
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/files/templates')
N = 33
def lum(c): return c[..., 0] * .2126 + c[..., 1] * .7152 + c[..., 2] * .0722
def mix(a, b, t): return a + (b - a) * t
def s_curve(x, k): return np.clip(.5 + (x - .5) * (1 + k) - k * 4 * (x - .5) ** 3 * (1 if k > 0 else 0), 0, 1)
def tint(l, dark, light): l = l[..., None]; return mix(np.array(dark), np.array(light), l)
LOOKS = {
 'Melies 1902 Sepia': lambda c: tint(s_curve(lum(c), .25), [.10, .06, .03], [1.0, .93, .78]),
 'Nitrate Night Blue': lambda c: tint(s_curve(lum(c), .2) * .92, [.01, .03, .10], [.62, .80, 1.0]),
 'Amber Interior': lambda c: tint(s_curve(lum(c), .2), [.08, .04, .0], [1.0, .82, .48]),
 'Nocturne Teal and Amber': lambda c: np.clip(mix(c, tint(lum(c), [.0, .16, .2], [1.0, .78, .55]), .45) * 1.02, 0, 1),
 'Bleach Bypass': lambda c: np.clip(s_curve(mix(c, lum(c)[..., None].repeat(3, -1), .62), .35), 0, 1),
 'Faded Film': lambda c: np.clip(mix(np.array([.07, .06, .07]), c * np.array([1.0, .97, .9]), .86) + .02, 0, 1),
 'Silver Contrast BW': lambda c: s_curve(lum(c), .55)[..., None].repeat(3, -1),
 'Day for Night': lambda c: np.clip((mix(c, lum(c)[..., None].repeat(3, -1), .55) * np.array([.55, .68, 1.0])) ** 1.35 * .8, 0, 1),
}
grid = np.stack(np.meshgrid(*(np.linspace(0, 1, N),) * 3, indexing='ij'), -1)   # [r][g][b]
def write_cube(name, f):
    vals = f(grid)   # .cube order: red changes fastest
    lines = [f'TITLE "{name} by dein.art (CC0)"', f'LUT_3D_SIZE {N}', 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1']
    for b in range(N):
        for g in range(N):
            for r in range(N): lines.append('%.6f %.6f %.6f' % tuple(vals[r, g, b]))
    return '\n'.join(lines) + '\n'
def apply(img, f):
    a = np.asarray(img).astype(np.float32) / 255
    return Image.fromarray((np.clip(f(a), 0, 1) * 255).astype(np.uint8))
src = Image.open(io.BytesIO(urllib.request.urlopen(urllib.request.Request('https://commons.wikimedia.org/wiki/Special:FilePath/Dresden._Zwinger_%26_Sophienkirche._-_Detroit_Publishing_Co.jpg?width=960', headers={'User-Agent': 'dein-art-prototype/0.1'})).read())).convert('RGB')
src = src.resize((960, int(960 * src.height / src.width)))
os.makedirs(f'{OUT}/luts', exist_ok=True)
z = zipfile.ZipFile(f'{OUT}/dein-art-film-looks-luts.zip', 'w', zipfile.ZIP_DEFLATED)
tiles = []
for name, f in LOOKS.items():
    slug = name.lower().replace(' ', '-')
    z.writestr(f'dein.art film looks/{name}.cube', write_cube(name, f))
    out = apply(src, f)
    half = Image.new('RGB', src.size); half.paste(src.crop((0, 0, src.width // 2, src.height)), (0, 0)); half.paste(out.crop((src.width // 2, 0, src.width, src.height)), (src.width // 2, 0))
    half.save(f'{OUT}/luts/{slug}.jpg', quality=84); tiles.append(out.resize((320, int(320 * src.height / src.width))))
z.writestr('dein.art film looks/README.txt', 'Eight film looks as 33-point .cube LUTs, made by dein.art and released under CC0 (public domain).\nUse them in Premiere Pro (Lumetri > Creative > Look), After Effects (Lumetri or Apply Color LUT), DaVinci Resolve (LUTs folder), Final Cut Pro (Custom LUT effect), Edius (Primary Color Correction > LUT) or Photoshop (Color Lookup).\nPreview photo: Dresden, Zwinger and Sophienkirche, Detroit Publishing Co. photochrom (public domain).\n')
z.close()
cover = Image.new('RGB', (1280, int(tiles[0].height * 2)))
for i, t in enumerate(tiles): cover.paste(t, ((i % 4) * 320, (i // 4) * t.height))
cover.save(f'{OUT}/luts/cover.jpg', quality=84)
print('LUT pack', round(os.path.getsize(f'{OUT}/dein-art-film-looks-luts.zip') / 1e3), 'KB;', list(LOOKS))
