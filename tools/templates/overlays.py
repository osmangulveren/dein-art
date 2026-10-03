"""Makes three CC0 overlay clips for editors (1080p, 24 fps, 8 seconds, loopable in any editor):
film grain (blend: Overlay or Soft Light), dust and scratches (Screen) and light leaks (Screen or Add)."""
import numpy as np, subprocess, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../prototype/files/templates')
W, H, FPS, SEC = 1920, 1080, 24, 8
rng = np.random.default_rng(7)
def enc(name, frames, crf=24):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray' if frames[0].ndim == 2 else 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', str(crf), '-preset', 'slow', '-movflags', '+faststart', f'{OUT}/{name}.mp4'], stdin=subprocess.PIPE)
    for f in frames: p.stdin.write(f.tobytes())
    p.stdin.close(); p.wait(); print(name, round(os.path.getsize(f'{OUT}/{name}.mp4') / 1e6, 1), 'MB')
n = FPS * SEC
# 1. grain: mid-grey with fine, changing noise
def grain():
    for i in range(n):
        g = rng.normal(0, 16, (H // 2, W // 2)).repeat(2, 0).repeat(2, 1) + rng.normal(0, 8, (H, W))
        yield np.clip(128 + g, 0, 255).astype(np.uint8)
enc('dein-art-film-grain-overlay', list(grain()), crf=30)
# 2. dust and scratches on black
def dust():
    yy, xx = np.mgrid[0:H, 0:W]
    scratch = None
    for i in range(n):
        f = np.zeros((H, W), np.float32)
        for _ in range(rng.integers(6, 22)):
            x, y, r = rng.integers(0, W), rng.integers(0, H), rng.uniform(1, 4.5)
            x0, x1, y0, y1 = max(0, int(x - 8)), min(W, int(x + 8)), max(0, int(y - 8)), min(H, int(y + 8))
            f[y0:y1, x0:x1] = np.maximum(f[y0:y1, x0:x1], np.clip(1 - (np.hypot(xx[y0:y1, x0:x1] - x, yy[y0:y1, x0:x1] - y) / r) ** 2, 0, 1) * rng.uniform(.5, 1))
        if scratch is None and rng.random() < .05: scratch = [rng.integers(100, W - 100), rng.integers(8, 30)]
        if scratch:
            x = int(scratch[0] + rng.normal(0, 1.5)); f[:, x:x + 2] = np.maximum(f[:, x:x + 2], rng.uniform(.35, .7)); scratch[1] -= 1
            if scratch[1] <= 0: scratch = None
        if rng.random() < .03: f += rng.uniform(.03, .08)   # a flicker
        yield (np.clip(f, 0, 1) * 255).astype(np.uint8)
enc('dein-art-dust-and-scratches-overlay', list(dust()), crf=26)
# 3. light leaks: warm blurred blobs drifting across black
def leaks():
    h, w = H // 8, W // 8
    yy, xx = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
    blobs = [dict(c=np.array(c), x=rng.uniform(-.2, 1.2), y=rng.uniform(0, 1), vx=rng.uniform(-.06, .06), vy=rng.uniform(-.04, .04), r=rng.uniform(.25, .5), ph=rng.uniform(0, 6)) for c in ([1, .45, .1], [1, .2, .15], [1, .75, .3], [.9, .3, .5])]
    for i in range(n):
        t = i / FPS; img = np.zeros((h, w, 3))
        for b in blobs:
            x, y = b['x'] + b['vx'] * t, b['y'] + b['vy'] * t
            a = np.exp(-((xx - x) ** 2 + ((yy - y) * .6) ** 2) / (b['r'] ** 2)) * (.55 + .45 * np.sin(t * 1.3 + b['ph']))
            img += a[..., None] * b['c']
        small = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        yield np.repeat(np.repeat(small, 8, 0), 8, 1)
enc('dein-art-light-leaks-overlay', list(leaks()), crf=22)
