<p align="center">
  <img src="brand/dein-art-avatar-k.png" width="120" alt="dein.art emblem: a dot turning into blocks">
</p>

<h1 align="center">dein.art</h1>

<p align="center">One place for creators to publish, go live, fund the next project and share the revenue with everyone who worked on it.</p>

<p align="center"><a href="https://dein-art.osmangulveren.workers.dev"><b>Open the live prototype →</b></a></p>

---

## What this is

dein.art is an idea for a blockchain-based home for creators. It starts with filmmakers and is meant for every kind of artist: musicians, illustrators, photographers, writers.

Today a creator needs one platform to publish, another to stream, another to share assets, another to raise funds, and a spreadsheet to pay the crew. dein.art brings these into one place:

- **Watch** — publish films and videos, free to watch
- **Live** — streaming with chat and tips
- **Marketplace** — footage, scripts, storyboards, templates and collectible scenes
- **Funding and merch** — on each creator's own page
- **Shared revenue** — every payment is split across cast and crew automatically
- **Credits** — every credit builds a page for the person behind it

The chain works in the background: who made what, who owns it, who gets paid. Creators and their audience should not have to think about it.

## Status

This is an early, side-project build, made in public a little at a time. Right now the repository holds a design prototype, not a working product. All people, films and numbers in it are invented sample data.

## What's in the repository

| Folder | Contents |
| --- | --- |
| [`prototype/`](prototype) | Clickable website design: static HTML, CSS and JavaScript, no build step. Live at [dein-art.osmangulveren.workers.dev](https://dein-art.osmangulveren.workers.dev) |
| [`brand/`](brand) | The emblem, as SVG and PNG |
| [`promo/`](promo) | The promo video ([watch](promo/dein-art-promo.mp4)) |

### Pages in the prototype

| Page | File |
| --- | --- |
| Home | `index.html` |
| Watch a film | `watch.html` |
| Live | `live.html` |
| Marketplace | `market.html` |
| Trending | `trending.html` |
| Creator page (videos, credits, collections, merch, funding) | `creator.html` |
| Artist page | `artist.html` |
| Funding campaign | `fund.html` |
| Publish flow | `upload.html` |

Light and dark themes are both included; the switch is in the header.

## Run it locally

```bash
git clone https://github.com/osmangulveren/dein-art.git
cd dein-art/prototype
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## The dot

The dot in the name is the symbol: a solid dot turning into blocks. Your work, going on record as yours.

## Follow along

Updates are posted on X at [@deindotart](https://x.com/deindotart).
