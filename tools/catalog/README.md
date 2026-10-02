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
```

`films.py` lists the films and their descriptions. `picks.py` holds the thumbnail frame and the scenes chosen for each film. Responses are cached in `cache/`, which is not committed.
