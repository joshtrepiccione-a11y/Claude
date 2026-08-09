# `share/` — a single-file build of the app

`index.html` is the whole app in one self-contained file: the CSS, the JS
bundle and the certified precinct GeoJSON are all inlined, and a small `fetch`
shim serves the GeoJSON back to the app from memory. It needs no server, no
build step and no network except the basemap tiles.

Regenerate it after any data or UI change:

```bash
cd hammonton-boe
npm run build
node scripts/build-artifact.mjs --standalone share/index.html
```

It exists so the app can be handed to someone as a link or a file without
deploying anything. Because this repository's GitHub Pages site is already
taken by the LD8 dashboard, a public URL for this file can be served straight
from the repo by a raw-render host, addressed by commit SHA:

    https://raw.githack.com/joshtrepiccione-a11y/Claude/<commit-sha>/hammonton-boe/share/index.html

Use a SHA rather than the branch name — this branch has a `/` in it, which the
raw hosts cannot parse.

This is a build output that is deliberately committed. It is generated, never
hand-edited: change the app or the data and re-run the command above.
