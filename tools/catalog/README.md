# Catalogue build

These scripts build `prototype/assets/catalog.js`, the list of films, people, music, images and footage shown on the demo site.

Everything comes from two open sources:

- **Wikimedia Commons** for the files. Only works marked public domain or CC0 are kept, and each entry keeps a link to its file page.
- **Wikidata** for the credits: who directed, shot, edited and acted in each film, and each person's dates and filmography.

Run them in order from this folder (Python 3, no packages needed):

```bash
python3 1_find_films.py   # match each film in films.py to its Commons file and Wikidata entry
python3 2_credits.py      # credits, companies and people for each film
python3 3_people.py       # portraits (licence-checked) and filmographies
python3 4_assets.py       # music, images and footage for the marketplace
python3 5_build.py        # write ../../prototype/assets/catalog.js
python3 6_onchain.py      # write ../../prototype/assets/onchain.js
python3 7_person_assets.py  # write ../../prototype/assets/assets.js
python3 8_studios.py      # write ../../prototype/assets/studios.js
python3 10_market.py      # write ../../prototype/assets/market.js and the zipped sound packs in ../../prototype/files/sfx
python3 9_founder.py      # write ../../prototype/assets/founder.js (data copied from IMDb and OpenSea in a browser)
```

`7_person_assets.py` lists the assets on an artist's page by type (posters, lobby cards, stills, photographs, footage, press) with the details shown in the pop-up. It covers Buster Keaton so far.

`6_onchain.py` stands alone. It reads Art Blocks' public index of its Ethereum contracts and lists artists who released at least one collection under CC0, with the wallet that created the work. Those artists have not joined dein.art; their pages on the demo are unclaimed until signed for with that wallet.

`films.py` lists the films and their descriptions. `picks.py` holds the thumbnail frame and the scenes chosen for each film. Responses are cached in `cache/`, which is not committed.

## The free library

`11_library.py` builds `prototype/assets/library.js`: about 10,000 free files for the marketplace — footage, music,
photos and images, scripts and documents from Wikimedia Commons (public domain or CC0 only, checked twice), and CC0
sound effects from Freesound, found through the Openverse API. Nothing is copied: the site links the originals and
downloads go through `/api/download`. Openverse allows 200 requests a day without a key; answers are cached in `cache/`.

## The big film catalogue

These scripts build `prototype/films/`: about 25,000 public-domain films and the pages of 9,700 people credited on them, cut into pieces that a page loads only when it
needs them (see the top of `prototype/assets/films.js`).

```bash
python3 12_films_wikidata.py   # every film on Wikidata with its video on Commons, or marked public domain with a copy at the Internet Archive
python3 13_films_archive.py    # public-domain films at the Internet Archive (takes hours: see below)
python3 13b_archive_extra.py   # which Archive collections each item sits in, and how many Wikipedias write about each film
python3 12b_films_match.py     # find the Wikidata entry of Archive films by title and year (about an hour the first time)
python3 16_people_credits.py   # everything Wikidata credits each person with
python3 14_films_build.py      # write ../../prototype/films/
```

A film is only taken when one of these holds, and its page on the site says which:

- its file is on Wikimedia Commons under a public-domain or CC0 licence (trailers, clips and files much shorter than the film are left out);
- Wikidata records it as public domain and points to its copy at the Archive;
- it was first shown before 1931;
- it belongs to the Prelinger Archives, to Universal Newsreels, or is a work of the US government (FedFlix, NASA);
- its page at the Archive marks it public domain **and** it was first shown before 1964. This is the weakest reason, since
  the mark is put there by whoever uploaded the film. These films say so on their page and carry a link to report a mistake.

Credits come from Wikidata. Only people who have died, or were born before 1900, get a page; nobody living is listed as a
member. Portraits are shown only when their own licence is public domain or CC0.

The Archive answers about one request a second and slows down when asked several at once, so `13_films_archive.py` reads
the file list of each item one at a time and keeps what it has in `ia_meta.jsonl`. It can be stopped and started again.
`14_films_build.py` works with whatever has been read so far: a film whose file list has not been read yet is still
listed, and its page finds the file in the visitor's browser when it opens. Running the build again later fills in more
running times and puts more films in the right category (feature or short).

## Museum art and books

`15_library_more.py` builds `prototype/assets/library-more.js`, the second half of the free library: about 14,000 works of
art that museums have released (Cleveland Museum of Art and National Gallery of Art under CC0, Wellcome Collection under
the Public Domain Mark or CC0) and about 5,800 public-domain books from Project Gutenberg's own catalogue file. The site
links each museum's own image and each book's own page; downloads of the pictures go through `/api/download`. The file
is large, so pages load it after they are up. Two museums are left out on purpose, because their servers turn programs
away: the Art Institute of Chicago and the Metropolitan Museum.

Two things keep the catalogue clean. `12b_films_match.py` looks up Archive films on Wikidata by title and year (only when
exactly one film fits), which gives them their makers and credits and lets the build recognise the same film put up twice,
or under a title like *Charlie Chaplin's "The Rink"*. `16_people_credits.py` reads each person's whole list of credits
from Wikidata, so a page lists every film Wikidata knows them for, not only the ones that play here. Measured against
IMDb's public data files with `tools/qa/credits.py`, the pages went from naming 5% of IMDb's film credits to 48%; the
rest is not on Wikidata, and each page links the person's IMDb page for it. IMDb's own data is never copied to the site.
