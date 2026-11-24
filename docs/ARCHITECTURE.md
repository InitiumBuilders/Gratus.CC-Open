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

The Gratus tab is built from his mockup in `viewGratus()`: a brand row, the hero card, three door cards and the Gratus Gives Together door, all on `.hcard` glass with a gold-mint hairline drawn by a masked pseudo-element. That door opens `viewTogether()` at `/app/goals`: the goals stream, and the doors to Gratus Vibes, your people and the Gratus Galaxy. The card art lives in `assets/art/home/` and is cropped from the mockup itself. The garden, counts and older doors moved to `viewGarden()` under `/app/garden`.

`go(tab)` plays an intro when a person enters Give or Grow from another tab: `tabIntro()` fills `#intro` with the tab's video (`give-intro.mp4`, `grow-intro.mp4`), floods a white field at the video's bright moment, holds it 1.9 seconds, then fades while the tab renders underneath. It never runs twice at once, exits on a stall of three seconds, and a tap enters early. The first render after the opening ritual never plays an intro.

## The way back

Walking into a room adds a step to the phone’s own history (`goNow()` pushes), so the back gesture walks out the way it walked in. Moving between Give, Gratus and Grow, or between the journal’s three tabs, changes the step the phone is on and adds none. Each step the app writes carries `{ g, d, from, fy, y }` in `history.state`: that it is ours, how many of ours lie under it, the place it was entered from and how far down that place stood, and how far down this page stood when it was left.

Anything a touch opens over the page takes a step of its own when it opens (`stepIn()`): a sheet, a held moment, the tour, the laws, a Passage. The phone’s back takes that step away and the thing closes, with the room under it untouched. Closing it by hand takes the step away the same way (`stepOff()`). Something that opens without a touch, such as the tour on a first visit or the wall when a free week ends, takes no step, because a browser does not honour a step it did not see a person ask for. A sheet like that closes when the phone steps away from the page under it.

The app never adds a step while the phone is stepping back. Browsers read that as a page holding a person in and begin skipping the page’s steps, so a second press would leave the app. Writes to the history wait in `settle()` behind any step back the app asked for itself, which keeps a sheet closing and a room opening in the order they happened.

The gift journey's pages are steps too. A page a tap turns pushes one (`journeyPage()`); the unwrapping, which turns by itself, replaces the step it is on. Each page's step carries the page and where the journey began (`jb`), so `turnTo()` can turn to the page a step names and a reload opens the gift where it was. `closeRoom()` takes all the journey's steps in one traversal, and a journey opened from a link hands its first step back to the app as `/app`.

`stepBack()` is the arrow in the corner and the rightward swipe. With a step of ours underneath it paints the place the room was entered from at once and lets the history follow. With none, which is a room opened from a link, it goes up to the room it belongs to (`UP`). `wayBack()` hears the phone step: it closes whatever stood above the step it landed on, reads the place from the address (`readPlace()`, the reading boot uses) and paints it only if the place changed.

G47 walks all of it with the phone’s own back and forward, and counts any step added while one is being answered. It has two controls: the app as it was, where a room changed the step, and an app that adds a step while it answers one. Its back is the browser’s `history.back()`, which cannot be skipped the way a phone’s gesture can, so the count is the only place that shape is seen before a person meets it. Every scripted read in a Playwright gate counts as a touch to the page, so a check about something no touch opened has the page act on its own timer, after the last touch has run out. It has not been walked on an iPhone.

## Scenes per page

`SCENES` maps each page to a list of scene names. `scene(key, i)` picks one by the number of opens, so the app changes every time it is opened and still feels the same. Home leads with the long zoom of the Gate; every list leads with a video.

Since v56 the lists come from the world the clock is in. `LOOKS` (plain JSON between `/*looks*/` and `/*end looks*/`, so G52 can read it) holds three worlds, `night`, `golden` and `day`, each with a list for every page. `lookAt(hour)` gives night from 20:00 to 04:59, golden from 05:00 to 08:59 and from 17:00 to 19:59, and day between. `look()` takes `?look=night|golden|day` first and keeps it for the visit (session storage), because the app's own steps drop the query; an automated browser (`navigator.webdriver`) sees day unless the address says `?look=auto`, so the gates are the same at any hour. `sceneList(key)` falls back to `SCENES` for a page a world leaves out, and `wire()` writes the world to `<html data-look>` on every paint. Each scene layer carries `data-scene` with the painting's name.

The finish lives at the end of `galaxy.css`: a filter on `#scene .layer` (saturation, contrast, brightness from `--g-sat`, `--g-con`, `--g-bri`), a vignette in `#scene::after`, and a grain in `#scene::before`, an SVG noise (`assets/css/grain.svg`) at `--g-grain` opacity in overlay. Each world sets those and its own `--violet-text`.

The scene moves. A painting (`.back` and `img.fore`) runs `scene-breathe`, 48 seconds each way in 288 steps, written as `scale` and `translate` because the desktop puts its own `transform` on both layers; a film keeps its own motion. A drifting painting is larger than its layer, so `.layer` clips (`overflow: clip`). The grain runs `grain-run`, six positions a second. Stepping matters: every glass surface blurs what is behind it, and a scene that changes on every frame makes each of them blur again on every frame. Under reduced motion neither runs.

`stars()` draws the sky from the journal: one `<i>` in `.stars` for each of the newest `SKY_MAX` (120) kept days, placed by a hash of the day's own date so it never moves, sized and lit by its age. Today's carries `.now` and breathes, one in three carries `.lit` and twinkles, the rest (`.held`) are still. It runs on every paint and does nothing unless the days or the date changed. The front page keeps its own scattered stars.

When a ceremony ends, `finish()` reads where the seeds of its seed head stood (`skySeeds`) before it clears the card, and `skyRise` flies one light from each seed to its place in the sky: a second `.stars.rise` layer over the page, each light animated with `translate` from its seed to nothing, while the sky itself carries `.wait` and fades in as they arrive. The lights leave 22 ms apart, the oldest day first and today's last, each taking 2.8 seconds; the layer removes itself when the last has landed. A ceremony with no seed head, and reduced motion, do nothing.

## State

One object in `localStorage` under `gratus.galaxy.v1`:

```
{ name, entries[], plants[{emoji, planted, kept[], carried, origin, from, private}],
  gifts{given, received}, my{emojis, recipes}, wishes[], goals[], folders[], milestones{}, seeds[], sound, made{}, opens, migrated }
```

`entries` are the journal: day, at (the moment it was written), took (seconds on the page, pauses left out), text, emoji, tags, photo, voice, folder. `engine/journal.js` works the record out from them and reads no clock; `assets/js/record.js` draws it. `folders` are named collections an entry can be filed into. `milestones` records the day each mark first lit. `plants` are the garden: one per emoji, with the days it was kept. Older states (`gratus.v1`, `gratus.v2`) migrate on first load. Nothing here is sent anywhere.

## Growth

`config/growth-book.json` names the phases and their days: Planted 0, Nurtured 2, Deepened 5, Bloomed 9, Ready to Give 13. A plant's day count is the number of distinct entry days that mention its emoji. `config/evolutions.json` holds evolution arcs on the schedule 0, 3, 8, 21, 55. `config/recipes.json` holds sixty recipes; a recipe is made when its two emojis share at least three entry days. User emojis and recipes live in `my` and are merged at read time.

## Ceremonies

Planting, reaching a phase, making a recipe and harvesting each open through the Gate's light: the ceremony plays the doorway video from its seventeenth second, and when the light floods (at 24.6 seconds, or nine seconds in as a fallback) the moment is revealed behind a flash.

## Gratus Vibes

`api/vibes.js` keeps one JSON document per room in Vercel Blob at `gratus/vibes/<code>.json`: a name, a line about it, a mark, and the posts. A code is six characters from a 32-letter alphabet with no ambiguous glyphs, because it is read aloud and typed by hand. `make` returns the code and a keeper key, shown once, whose sha-256 is stored; the keeper can take a post down. `post` writes a short gratitude with a name and an emoji, capped at 400 a day and 400 kept, with a two-minute dedupe. On the device, `S.vibes` holds the rooms a person has joined, each with a `seen` count: what the room holds is on the server, what you have read is on your device, and the difference is the mark that says a room has words you have not read. At most six rooms are asked at a time, because this is a courtesy and not a service. A vibe link is `/app/vibes?code=XXXXXX`.

## A room's Passage

`vibePassageOf()` encodes a Vibe's shape into the link exactly as a garden's Passage does: the name, the mark, how many said something, how many voices, and the emoji tally from `roomField()`. It deliberately carries neither the code nor the words. A room's code is the only thing that grants entry, so a page that showed what a room grew and also carried its code would open the room to anyone the page reached. Sharing what grew and letting someone in are two separate acts, and the sheet says so.

## The Passage

`/passage#<code>` shows a garden from outside. The whole page is base64url-encoded into the link, exactly like a Gratus Gift: the name, each plant's emoji and day count and dedication, the seeds that bloomed, the milestones and the alchemy marks, and four counts. **No journal text is ever included**, and nothing is uploaded, so there is nothing to delete later; the link simply stops being shared.

## A project's Gratus page

`/p/<slug>` reads the project from Giveth and the trace from our own store, and shows the responsiveness reading plus the seeds whose authors published them. A steward can post that link.

## Who can read a seed

`api/trace.js` answers three ways. An open read returns the reading and only published seeds, with a count of the ones held back. A read with the project key returns everything, for the steward. A read with `ids=` returns those seeds, which only the person who planted them holds, since an id is sixteen random hex characters. A seed also carries `mine`, the sha-256 of a key given once to its author, which is what lets them speak in the thread and publish their words.

## Gifts

A gift is the plant, its days, its message and the hands that held it, encoded base64url into the URL: `/gift#<code>`. No server is involved. The receiver walks eight pages, sees how it grew, and chooses how to keep it; kept gifts are planted in their garden with `carried` and `from` set. `/gift` without a code opens the demo gift.

## The goals stream

`api/goals.js` is a Vercel function over `@vercel/blob`. One JSON document at `gratus/goals/feed.json`. `GET` returns the last eighty goals, newest first. `POST` takes `{text ≤ 160, name ≤ 40, emoji}` and appends. Writes are last-writer-wins and the comment in the file says so; this is the right size for now and will change when the stream matters more. Offline or without the token, the client shows seed goals labelled "as imagined" and resyncs local goals when it can.

## Giveth and the Emotional TRACE

`api/giveth.js` reads Giveth's public GraphQL API (`https://mainnet.serve.giveth.io/graphql`) with no key and a five-minute edge cache, and serves four lanes: GIVbacks eligible, boosted with GIVpower, projects nobody has given to yet, and everything. It never writes and never sees a wallet.

`api/trace.js` holds the loop, one JSON document per project in Vercel Blob at `gratus/trace/<slug>.json`: `{ claim, seeds[] }`. A seed carries the project, the donor's words and name, an optional transaction hash, a status of `dormant` or `bloomed`, and the water when it comes. Watering requires a project key whose sha-256 hash is stored on first claim; the key itself is shown once and never kept. The donor's own copy of their seeds lives in `S.seeds` on the device, and `checkBloom()` asks the trace about dormant ones shortly after boot, playing a ceremony for anything newly watered.

The whole design, its limits and the five loops still to build are in [EMOTIONAL-TRACE.md](EMOTIONAL-TRACE.md); what Giveth built and what we use is in [GIVETH.md](GIVETH.md).

## The Return

`api/echo.js` keeps one JSON document per gift in Vercel Blob at `gratus/echo/<id>.json`, where the id is sixteen hex characters generated by `echoId()` on the giver's device and carried inside the gift link as `g.e`. It is the only thing the two sides of a gift share.

A document holds notes, and a note holds four fields: the kind (`landed` or `grew`), the phase, the emoji, and the day. It holds no name, no words, no journal, no address and no clock time. The giver knows who they gave it to because they typed it themselves, and that stays in `S.gifts.given` on their own device, so the sentence "the gift you gave to Sara reached Bloomed" is assembled on the phone out of one thing the server knows and one thing only the phone knows. Nothing in the store can be read backwards into a person.

On the receiving side `offerReturn()` shows `returnSheet()` once per event, and records the answer on the plant as `p.told` whichever way it goes, so declining is silent and permanent. On the giving side `checkReturns()` asks for its own ids alone, compares the count with `x.seen`, and plays the new ones as ceremonies carrying `soundPhase` for the phase reached.

Limits: eight notes per gift, twenty returns per gift per day, one note per kind and phase, and at most twenty ids in a read. Named risk: anyone holding a gift link holds its echo and can post a return for it, so the worst case is a false kind word reaching the giver. The app never claims the receiver said anything beyond the phase. Named limit: a document is kept until someone removes it. It holds a kind, a phase, an emoji and a day against a random number, so there is nothing in one to expire, and there is no sweep yet that deletes documents nobody reads any more.

## The frame

A project's picture arrives from Giveth at whatever shape its steward uploaded. Sixty real ones were measured before this was designed: none portrait, about a tenth square, nearly half between 1.35 and 2.6, a third near 3, and a handful as wide as 7 to 1. A single fixed band cannot serve that spread, and both of the obvious answers fail it: `cover` crops the subject out of a square logo, `contain` leaves a black moat around it. So `frameArt()` reads each image's natural size once it has loaded and sets `--ar` on its frame, clamped between `AR_MIN` 1.2 and `AR_MAX` 3.2, and the CSS gives the frame that aspect ratio with `object-fit: cover`. Inside the clamp there is no crop and no remainder. Outside it, the picture is zoomed to the nearest shape a card can hold, centred slightly above the middle because that is where subjects sit. The blurred wash of the image survives underneath, now bright rather than dark, because it is what shows through a logo with a transparent background.

## The Gratus Sound

`TONES` is five frequencies: D3, A3, D4, F sharp 4, A4. They are the root, the fifth, the octave, the third above the octave and the fifth above it, which is one chord spelled out across the five growth phases in order. `soundPhase(i)` plays every note up to and including `i`, so a crossing sounds everything the plant has already been. `soundGiven()` plays the chord from the top downwards and then holds the root alone. `tone()` is a triangle oscillator for body plus a sine an octave up and slightly detuned for shimmer, through a lowpass at 2100 Hz so nothing is ever shrill, with a fast attack and a long exponential tail.

Nothing is a sample, so the sound adds no bytes to the app and cannot fail to load. `audioCtx()` returns nothing at all when the sound switch is off, and the context is resumed on the same first gesture that starts his song, because browsers will not make sound before one.

## Voice

`api/voice.js` is a Vercel function. The recording arrives as the raw request body (webm, mp4 or ogg from `MediaRecorder`), is checked for origin, a `X-Gratus: voice` header and size (six megabytes), and is posted to ElevenLabs speech to text (`scribe_v1`) with the key from `ELEVENLABS_API_KEY`. The function returns `{ text, language }` and keeps nothing. The key is in the Vercel environment of both projects and in no file; the open-source gate knows its shape.

The endpoint carries an allowance, because transcription spends real money on a real account and an open endpoint without a ceiling is a bill waiting to happen. One day's counters live in one Blob document, `gratus/voice/<YYYY-MM-DD>.json` = `{ total, who }`: forty recordings per device per day, six hundred across everyone. The device is a salted hash of the forwarded address, never the address itself, and the document is a day old at most. The count is reserved before the call to ElevenLabs, because a ceiling applied after the spend is not a ceiling. Named limit: it is a read, then a write, so recordings landing in the same instant can undercount. It is a soft ceiling against runaway spend, not an exact meter.

On the device, `assets/js/keep.js` is a small IndexedDB store keyed by entry id. The composer records with `MediaRecorder`, shows the recording to hear back, sends it for words, and on planting keeps the blob under the new entry's id. The entry carries `voice: { mime, dur }`; the entry sheet plays it from the keep. Recordings are not in the JSON export, and the sheet says so.

## The desktop

At 1024px and wider the scene layer has two children: `.back`, the poster of the same scene, blurred and darkened, scaled to cover; and `.fore`, the painting or the video at its own aspect, `object-fit: contain`, centred, feathered at its vertical edges with a mask. The source art is 941×1672, so on a desktop it is shown at or under its own size and stays sharp; the blurred wall carries the colour to the edges. Under 1024px only `.fore` shows and covers. The content column widens to 760px, the statement to 52px.

## Song

`<audio id="song" loop preload="none">` plays his song on open. Browsers that block autoplay start it on the first touch or key. The mute button in the top bar toggles it and the preference is kept in state.

## Type and colour

Tokens live in `tokens.css`. Every ink is white and solid; mint (`#B9FFE4`) is for growing and labels, gold (`#FFD98A`) for giving. Body type is 18 on 28 and nothing is set under 14px. A kicker whose text ends a sentence is tagged `.say` at render (a MutationObserver watches the body) and reads in sentence case at 17px; kickers that are labels keep small caps. Fields, segments and buttons stand on dark glass so they read on any scene.

## Edges and touch

No surface is drawn with a line. One rule near the end of `galaxy.css` makes every border colour transparent (`!important`, on every element and pseudo-element), so a border keeps its width and draws nothing; in forced colours the browser draws it again. The edges are light, as inset shadows built from a few tokens: `--rim` (neutral), `--rim-gold`, `--rim-mint`, their `-hi` versions for a pointer, `--sheen` for the pale gold pills and `--margin-light` for the paper's margin. A picture keeps every pixel: its edge is an overlay carrying the inset light above it (`::before` on `.hcard`, `::after` on `.doorcard`, `.galaxy` and the front page's `.plate`). A new surface takes a rim token in its `box-shadow`, since a border colour on it will not show. A press sets the `scale` property, which adds to any transform an element already has: round buttons give to 0.92, chips and pills to 0.96, whole cards to 0.985, in 120 ms, and spring back over half a second. A room arrives: when `wire()` sees the room change, `arrive()` marks the first blocks of `#view` (up to twelve, skipping any with an animation of their own) with `.arrive` for 900 ms, and the `room-in` keyframe raises them 10px into place, 28 ms apart; under reduced motion they simply appear. G51 holds all of it.

## The journal, at any size

`journalInOrder()` sorts the journal once each time it changes. `journalList()` draws whole days, newest first, up to `JOURNAL_PAGE` (40) entries, and `#j-more` adds more. Typing in search calls `redrawList()`, which draws the list region and nothing else, so the search box is never built again while somebody types. A new search or filter starts from the newest day. What is being written is kept under `gratus.draft` by `keepDraft()` and read back by `readDraft()` at boot; planting clears it. G50 holds the shape at 1,500 entries and G49 holds the draft and the restore.

## Time in the app

`assets/js/trax.js` counts seconds only while `document.visibilityState` is `visible`. A page leaving the screen sends what it counted, a page that stays sends every two minutes, and the clock never starts again on a hidden page. The server caps a device at twelve hours a day. G48 holds it to that on a faked clock.

## Service worker

`sw.js` caches the shell (HTML, CSS, JS, configs, posters, logo) under a version string `gratus-<stamp>` and serves the shell cache-first, everything else network-first. The ship script writes the same stamp into `app.html` and `sw.js`, so a returning browser can never keep an old module against a new shell.

## Gates

- `scripts/gates/contrast.mjs` reads the tokens and computes every ink against every surface (7:1 target, 4.5 floor).
- `scripts/gates/banned.mjs` refuses words and patterns this house never ships (presence words, money words, ranks, `repeat(auto-fit`, `rotate(360deg)`).
- `scripts/gates/slop.mjs` refuses the mechanical habits of machine writing in my prose: a dash standing in for a decision, a contrast with nothing on the other side, a word that sounds expert and carries nothing, a run-up that announces a point instead of making it. It reads `config/his-words.json` and every value under `locked` in `config/copy.json` first, and skips whole any line containing one of August's, because a writing gate that cannot tell whose words it is judging will sand the voice off the one part of a product that has one. `--decoy` proves both directions before every ship: each rule still catches a planted violation, and his lines still come through untouched. Fenced blocks are skipped, so a document can quote the habit it exists to remove. What it cannot see is written down in [REFINEMENT.md](REFINEMENT.md).
- `scripts/gates/open-source.mjs` refuses secrets, keys, tokens, environment files, Vercel state, personal paths, personal emails and private infrastructure names. With `--decoy` it plants one decoy per rule and proves every rule fires before anything ships.
- `scripts/tests/gratus.test.mjs` covers the engine.

## Shipping

`scripts/ship.sh "message"`:

1. tests, contrast gate, banned gate, and the open-source gate's decoy test; any red stops the ship
2. stamps `galaxy.js?v=<epoch>` into `app.html` and `sw.js`, strikes the four shared pages (`gift.html`, `p.html`, `passage.html`, `guided.html`) from `app.html` again with `scripts/shells.py` and refuses one that kept an old stamp, and puts the same epoch into the worker's version
3. commits
4. `vercel deploy --prod --yes`
5. probes the routes, then refutes: fetches the live `app.html` up to eight times until its stamp equals the one just written; a mismatch is a failed ship
6. `scripts/publish-open.sh`: exports the tree without git state, env files, Vercel state or `node_modules`; gates the export; commits it on top of the public repository's history; pushes; clones the public repository back and gates the clone

The second host (grow-gratus-cc) receives the same tree by rsync and its own deploy; the two projects share the Blob store through the Vercel environment, never through code.
