# Architecture

Gratus.CC is a static progressive web app. There is no build step, no framework and no database behind the journal. One HTML shell, one ES module, two stylesheets, a handful of JSON configs and his art. The only server code is one function for the shared goals stream.

## The shell

`app.html` holds, in paint order:

1. `#scene`: a fixed, full-viewport layer that carries the current scene. A scene is either a still (`assets/art/gfx/gNN.jpg`) or a boomerang video (`v1 v2 v3 dhold dlong d2`, each with a poster). `setScene(name)` appends a new layer, fades it in over 1.4 seconds with a timer (not a paint callback, which never fires in a hidden tab), and removes the old one. A gradient scrim sits over the scene so words read.
2. `.stars`: a light field of twinkling points.
3. `#view`: the page. A hero on top, then `.page`, a dark glass column for everything below the hero. The scene stays bright behind the hero and dims behind the column.
4. `.tabs`: the fixed bar with Grow, Gratus and Give. The centre is his logo itself, a 60px squircle image sitting in the bar with no plate behind it, with two swaying arcs of light, an aura ring that rises and fades, five rising embers and a glow that spills onto the bar.
5. `#splash`, `#room`, `#laws`, `#sheets`, `#ceremony`, `#toast`: the overlays.

`index.html` is the landing page. It carries its own copy of the scene layer and the ritual so it behaves like the app without loading it.

## The ritual

Every open, `splash(start)` plays `explode.mp4` from its eleventh second. When the video reaches 24.4 seconds (or ends), the white field fades in, the mark and the name light up, and after 2.6 seconds the splash fades over 1.5 seconds while the app starts underneath. A tap enters early. A hard timer floods at 16 seconds if the video stalls. With reduced motion the mark shows for 1.2 seconds instead. Callbacks check for their nodes, because the splash empties itself when it leaves.

## The home and the tab intros

The Gratus tab is built from his mockup in `viewGratus()`: a brand row, the hero card, three door cards, the Gratus Gives Together block and the goals stream, all on `.hcard` glass with a gold-mint hairline drawn by a masked pseudo-element. The card art lives in `assets/art/home/` and is cropped from the mockup itself. The garden, counts and older doors moved to `viewGarden()` under `/app/garden`.

`go(tab)` plays an intro when a person enters Give or Grow from another tab: `tabIntro()` fills `#intro` with the tab's video (`give-intro.mp4`, `grow-intro.mp4`), floods a white field at the video's bright moment, holds it 1.9 seconds, then fades while the tab renders underneath. It never runs twice at once, exits on a stall of three seconds, and a tap enters early. The first render after the opening ritual never plays an intro.

## Scenes per page

`SCENES` maps each page to a list of scene names. `scene(key, i)` picks one by the number of opens, so the app changes every time it is opened and still feels the same. Home leads with the long zoom of the Gate; every list leads with a video.

## State

One object in `localStorage` under `gratus.galaxy.v1`:

```
{ name, entries[], plants[{emoji, planted, kept[], carried, origin, from, private}],
  gifts{given, received}, my{emojis, recipes}, wishes[], goals[], folders[], milestones{}, sound, made{}, opens, migrated }
```

`entries` are the journal: day, text, emoji, tags, photo, voice, folder. `folders` are named collections an entry can be filed into. `milestones` records the day each mark first lit. `plants` are the garden: one per emoji, with the days it was kept. Older states (`gratus.v1`, `gratus.v2`) migrate on first load. Nothing here is sent anywhere.

## Growth

`config/growth-book.json` names the phases and their days: Planted 0, Nurtured 2, Deepened 5, Bloomed 9, Ready to Give 13. A plant's day count is the number of distinct entry days that mention its emoji. `config/evolutions.json` holds evolution arcs on the schedule 0, 3, 8, 21, 55. `config/recipes.json` holds sixty recipes; a recipe is made when its two emojis share at least three entry days. User emojis and recipes live in `my` and are merged at read time.

## Ceremonies

Planting, reaching a phase, making a recipe and harvesting each open through the Gate's light: the ceremony plays the doorway video from its seventeenth second, and when the light floods (at 24.6 seconds, or nine seconds in as a fallback) the moment is revealed behind a flash.

## Gifts

A gift is the plant, its days, its message and the hands that held it, encoded base64url into the URL: `/gift#<code>`. No server is involved. The receiver walks eight pages, sees how it grew, and chooses how to keep it; kept gifts are planted in their garden with `carried` and `from` set. `/gift` without a code opens the demo gift.

## The goals stream

`api/goals.js` is a Vercel function over `@vercel/blob`. One JSON document at `gratus/goals/feed.json`. `GET` returns the last eighty goals, newest first. `POST` takes `{text ≤ 160, name ≤ 40, emoji}` and appends. Writes are last-writer-wins and the comment in the file says so; this is the right size for now and will change when the stream matters more. Offline or without the token, the client shows seed goals labelled "as imagined" and resyncs local goals when it can.

## Voice

`api/voice.js` is a Vercel function. The recording arrives as the raw request body (webm, mp4 or ogg from `MediaRecorder`), is checked for origin, a `X-Gratus: voice` header and size (six megabytes), and is posted to ElevenLabs speech to text (`scribe_v1`) with the key from `ELEVENLABS_API_KEY`. The function returns `{ text, language }` and keeps nothing. The key is in the Vercel environment of both projects and in no file; the open-source gate knows its shape.

On the device, `assets/js/keep.js` is a small IndexedDB store keyed by entry id. The composer records with `MediaRecorder`, shows the recording to hear back, sends it for words, and on planting keeps the blob under the new entry's id. The entry carries `voice: { mime, dur }`; the entry sheet plays it from the keep. Recordings are not in the JSON export, and the sheet says so.

## The desktop

At 1024px and wider the scene layer has two children: `.back`, the poster of the same scene, blurred and darkened, scaled to cover; and `.fore`, the painting or the video at its own aspect, `object-fit: contain`, centred, feathered at its vertical edges with a mask. The source art is 941×1672, so on a desktop it is shown at or under its own size and stays sharp; the blurred wall carries the colour to the edges. Under 1024px only `.fore` shows and covers. The content column widens to 760px, the statement to 52px.

## Song

`<audio id="song" loop preload="none">` plays his song on open. Browsers that block autoplay start it on the first touch or key. The mute button in the top bar toggles it and the preference is kept in state.

## Type and colour

Tokens live in `tokens.css`. Every ink is white and solid; mint (`#B9FFE4`) is for growing and labels, gold (`#FFD98A`) for giving. Body type is 18 on 28 and nothing is set under 14px. A kicker whose text ends a sentence is tagged `.say` at render (a MutationObserver watches the body) and reads in sentence case at 17px; kickers that are labels keep small caps. Fields, segments and buttons stand on dark glass so they read on any scene.

## Service worker

`sw.js` caches the shell (HTML, CSS, JS, configs, posters, logo) under a version string `gratus-<stamp>` and serves the shell cache-first, everything else network-first. The ship script writes the same stamp into `app.html` and `sw.js`, so a returning browser can never keep an old module against a new shell.

## Gates

- `scripts/gates/contrast.mjs` reads the tokens and computes every ink against every surface (7:1 target, 4.5 floor).
- `scripts/gates/banned.mjs` refuses words and patterns this house never ships (presence words, money words, ranks, `repeat(auto-fit`, `rotate(360deg)`).
- `scripts/gates/open-source.mjs` refuses secrets, keys, tokens, environment files, Vercel state, personal paths, personal emails and private infrastructure names. With `--decoy` it plants one decoy per rule and proves every rule fires before anything ships.
- `scripts/tests/gratus.test.mjs` covers the engine.

## Shipping

`scripts/ship.sh "message"`:

1. tests, contrast gate, banned gate, and the open-source gate's decoy test; any red stops the ship
2. stamps `galaxy.js?v=<epoch>` into `app.html` and `sw.js`, and the same epoch into the worker's version
3. commits
4. `vercel deploy --prod --yes`
5. probes the routes, then refutes: fetches the live `app.html` up to eight times until its stamp equals the one just written; a mismatch is a failed ship
6. `scripts/publish-open.sh`: exports the tree without git state, env files, Vercel state or `node_modules`; gates the export; commits it on top of the public repository's history; pushes; clones the public repository back and gates the clone

The second host (grow-gratus-cc) receives the same tree by rsync and its own deploy; the two projects share the Blob store through the Vercel environment, never through code.
