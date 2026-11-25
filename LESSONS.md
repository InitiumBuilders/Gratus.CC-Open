# LESSONS.md: honest

## What is done and verified
- Engine: 24 tests, every rule in §17.3 that the engine owns. Contrast gate: 112 pairs, 0 fails (16 warns above 4.5:1 and below 7:1, listed by the script). Banned-pattern gate: 0 hits.
- The app, walked at 375 × 812 in the browser pane in both modes: onboarding → first seed → journal → plant → ceremony → garden; the day advanced with the dev panel; Leaf ceremony; Give, Ground, You tabs rendered; You's horizontal overflow found by measurement and fixed.
- The flora sheet reviewed for all nine families across all forms; petals widened and the elder canopy rebuilt after the first look.

## What is built but not yet verified end to end
- The server routes (`api/*`) are written against the Blob store pattern proven on MotusMoves, with compare-and-swap writes. They have not been exercised against the live store yet; first production walk: claim a handle, sync, seal a gift to a second handle, open it, watch the ledger. Do this before telling anyone the money works.
- Groups and the three-screen session run through the API; two real accounts on two phones have not completed a session.
- The Pool cron runs at 00:05 UTC; the first real distribution needs to be read from `gratus/pool/paid/<day>.json` the next morning.
- Presence gifts roll on the server (tested by reading the code path, not by a bell on a phone).

## What is not built (and says so in the UI)
- Purchases, Dash rail, wrapped Dash, card rail, redeem: flags off, waitlists.
- Gratus Grace with AI: flag off.
- A true 1.6 s family morph (today: the tend animation into the new form).
- Tap on a star in the night sky.
- Ground together (two people, one bell).
- Push notifications and the daily reminder (a PWA install + a notification permission flow; queued).
- Playwright screenshots at 390/768/1280 as a gate; today they are a manual pass.
- Self-hosted fonts; Twemoji; passkeys; cross-device sync with encryption at rest.
- Group vote resolution job (votes are stored; the monthly tally that moves the Common Pool is not scheduled).

## Walked in production (2026-09-03)
- `/app/garden` at 375: onboarding → handle `Claudia.Dash` claimed against the live store → garden hour → first seed 🙏 → journal → plant → First Seed + Sprout ceremonies → Sprout mark → `/api/me` answers with the handle over the bearer token. Zero console errors. The rest of the money path (seal → open between two handles, the Pool at 00:05 UTC) remains to be walked.

## v2 (2026-09-04), after the owner's "D+"
- **Built and walked at 375:** the black neon world; Ground as the journal's home; the editor; Days · Practices · Patterns · Letters; companions; the isometric field with species cards and the gardener; Grow with the journey, the week, the program.
- **Still to walk:** photos on a real phone (IndexedDB), voice on iOS, the journal lock across a session, the write-for-a-past-day path, the Letters "give as a gift" hand-off end to end.
- **Lesson:** the first build honored the spec's structure and shipped a thin *surface* for the thing the owner cares most about. Read the owner's emphasis, not just the document's section count: "the journal is the core" should have been the first day's work, not the fourth's.

## The cache trap (2026-09-04, cost two deploys)
- v1 shipped code and config with `max-age=3600, stale-while-revalidate=86400`. v2's `app.js?v=5` imported `engine/state.js` **unversioned**; a returning browser served the stale `state.js` (and its stale `?v=1` config) from the SWR cache for up to a day, and the new app died on `prompts.ground`. Even the fix deploy failed because `app.js?v=5` itself was the same URL as the deploy before it.
- Now: every module import carries a version; code and config are `max-age=0, must-revalidate`; only images cache long; `scripts/ship.sh` stamps the entry scripts and the service-worker cache name with a fresh timestamp on every ship. **Never SWR on code. Never reuse an entry-script URL across deploys.**

## Lessons (for the next build)
0. **`cleanUrls: true` silently breaks `.html` rewrite destinations on Vercel.** Two deploys served 404 on every rewritten route. The working pattern (MotusMoves) is no `cleanUrls` and one explicit `.html` rewrite per page. Mirror the incumbent config before the first deploy.
1. **Cache-bust from minute one.** The preview served a stale `app.js` and I chased two errors that no longer existed. `?v=` on every touched asset, every edit, is not a deploy step; it is a dev step.
2. **Measure, never eyeball, at 375.** The You tab overflowed by 23 px because a four-button segmented control could not shrink; the screenshot showed a clipped date, the DOM showed the culprit in one query.
3. **Judge the grammar on a sheet before the garden.** `/dev/flora.html` found the sea-urchin bloom and the umbrella canopy in one screenshot; the garden would have hidden them for days.
4. **The bridge eats `$`.** Twice this session a shell string crossed Windows → WSL and lost its variables. Script files with literal paths, every time.
5. **The pane paints only the first viewport.** Scrolled screenshots came back blank; a 2 600 px-tall viewport with sections collapsed showed the whole page in one frame. When a harness lies, change the frame, don't argue with it.
6. **Public Blob needs unguessable paths.** User documents are keyed by a salted hash of the handle, set as `GRATUS_SALT`. Journal text never reaches the server regardless; this protects the ledger and the inbox.

## v3 (2026-09-04), after the owner's "D-"
- **Diagnosis, measured, not guessed:** the "text literally not visible" was the app's default `auto` mode showing the paper (Dawn) theme all day while stat cells, plant cards and day chips kept hard-coded dark surfaces, so their text was dark on dark. My own v2 judgement had been made in Dawn too, from a tab that carried a stored mode. Two lessons: assert the instrument's mode before every look, and never keep two themes when one is the product.
- **Built and walked at 375, dark, on the local build:** Ground · Field · Forge (Combine → ceremony → Plant it) · Trove (sheet with Grace's draft) · story sheet · Grow · Give · the editor with Grace's local reflection. 37 tests, contrast 68 pairs 0 fail, banned 0 hits, zero console errors (the local `/api/cause` 404 is the static server).
- **Still to walk:** the production build in a returning browser (the SW takeover); Grace's mind end to end (needs env); a real evolution ceremony on the third tended day of a fresh emoji; the landing page, which still describes plants in places; photos, voice and the lock on a real phone.
- **Lesson (L3.5):** a design reference is a *contract to read*, not a mood to interpret. The tokens that finally matched were read off the images one by one: rim, bloom, ink, pill, icon, tab. The two failed builds interpreted; the third transcribed.

## v4 (2026-09-07)
- **Text must never wait on motion.** Entrance animations never complete in a backgrounded tab, so every animated-in element stayed invisible in the preview pane. The fix is structural (choreography only under `html.anim`, everything landed after 1.1 s by `html.landed`), and it is the same law the cinematic-statements skill already carried. Read the law before the build, not after the screenshot.
- **A stale render hides a thrown render.** Grow showed the empty state while eight emojis existed because `render()` threw inside `innerHTML` composition and the old markup stayed. When a view looks like an older state, read the console before reading the data.
- **Sixty statements in one voice** were written by hand in one sitting; the content test (unique ids, unique formulas, six families of ten, no exclamation marks, every emoji named) caught two duplicate formulas that a reader never would.
## v5 (2026-09-07)
- **The local service worker serves yesterday's files.** After the first load the shell is cached, and every later edit is invisible until the worker is unregistered and the caches cleared. Three fixes were "verified" against the stale shell before the mismatch showed. Locally: unregister, clear, then load.
- **The local server has no rewrites.** `/app/ground` is a 404 on http-server; `/app.html` is the local door. A blank page on the first local load is the server, not the app.
- **Two sheets stack into one unreadable pane.** A sheet opened from inside another sheet must close the first; glass over glass reads as noise.
- **A green deploy is live a few seconds after "Ready".** The ship script asked the production host for the new stamp one second after the alias printed and declared the deploy missing; a second ask found it. The refutation now retries eight times, five seconds apart, before it says no.
- **The first review fleet paid for itself once.** Three finders and one skeptic (four agents, about 760k tokens) found the one defect no walk would have shown: formulas name an emoji, entries recorded only the seed, so a formula naming an evolved face could never be made. Twenty-two findings confirmed, two refuted, all folded in before the ship.

## v6 (2026-09-19)
- **A drawing loop must never own a completion.** The hold finished inside requestAnimationFrame; a hidden or throttled tab never ticks, so the give never fired. The clock decides now, the frame only draws.
- **Read, then clear.** A field read after the room that held it was emptied returned null. Order the reads before the teardown.
- **A card sized in vw inside a padded room overflows by the padding.** Size cards in percent of the room, never the viewport.
- **A restart is a deletion first.** Tagging the old tree and removing what the new one does not load left 24 files where there were 90, and every file left is read by something.

## v7 (2026-09-19)
- **His mockups are assets, not references.** Cropping the hero regions out of the composites and fading them into the ground put his exact art in the product in an hour; redrawing it would have taken a day and matched worse.
- **A gift that lives in its own link needs no backend to be real.** The journey shipped working on day one because the link carries the story.
- **Run the banned gate on the landing copy too.** "come back" slipped into a caption; the gate caught it before the ship.

## v8 (2026-09-19)
- **A `> *` rule eats the art layer.** `.hero > * { position: relative }` turned the absolute background into a grid item and every hero shrank to an inset rectangle. Exclude the art: `.hero > :not(.art)`.
- **Ask for the art before drawing it.** Twenty-eight of his scenes and a logo were one message away; the v7 crops of his mockups were a worse version of what he already had.

## v46 to v50 (2026-11-21)
- A line on the screen that no rule draws is a seam between two layers. The wash over each room's picture reached full strength exactly where the page's own darkening began, so the scene showed again below it. It looked designed for months; reading the pixel rows across the edge found it in a minute.
- Style a thing by its class, never by a data attribute it carries. A rim meant for journal paper was written against `[data-e]`, which also marks the tappable row on the home card, and it boxed that row.
- A focus rule sets an outline and nothing about shape. Ours set every focused button's corners to 6px, which squared the pills for anyone using a keyboard.
- A stylesheet cleanup is proven by the browser, not by reading. Every computed property of every element on 61 screens at three widths was recorded before 381 overridden declarations came out, and again after. Zero differences; the only noise was the test server's port inside a URL.
- Restore has to accept what export writes. Export had moved on to version 5 while restore still asked for version 1, so every export made for a new phone was refused. A gate now takes a month out and puts it back.
- Never push to the history while answering a popstate: phone browsers then skip the page's own steps. Writes wait until the app's own step back has landed.
- Every Playwright `page.evaluate` counts as a user gesture. To test what happens without a touch, set a timer inside the page and read nothing until it has fired.

## v54 to v56 (2026-11-24)
- A measurement's window decides what it counts. G28 counted what had arrived 3.5 seconds after a page loaded, so a picture asked for a moment later was counted on some runs and left out on others, and ceilings had been set on counts that left the front page's scene picture out. Wait until the page has finished fetching on its own, then count each file once.
- A test server's headers are part of the measurement. The gate server sends no-store, so Chrome fetched the logo again every time a view drew it, and the gate counted two downloads where a phone, with the site's day of caching, makes one.
- A room that turns its painting is weighed with the heaviest one it can show. G28 weighed whichever painting the fixture's count of opens landed on, so a ceiling of 0.35 MB sat over a home that could weigh 0.50.
- A setting applied to all text reaches characters nobody had in mind. Tabular figures were set everywhere so columns would line up; in Inter they also give the hyphen and the brackets a digit's width, and "real-world" read as "real - world" for months. Set figures to a fixed width only where they stand in a column.
- A check that asks one question about a fix passes a fix that moves the problem. The first kicker fix moved the dot from the end of one line to the front of the next, and G37 passed it because it only looked at line ends. Write the check against the problem (a dot at a break), and show it failing on the broken version before the fix goes in.
- Walk the first visit with nothing skipped. Every gate opened the app with the tour switched off, so nobody saw that each lit step of the tour blurred the thing it pointed at.
- An animation written as `transform` replaces every transform already on the element. The first drift shoved the desktop's painting 225 pixels off centre; `scale` and `translate` leave `transform` alone.
- Glass over a moving scene is blurred again on every frame it changes. A drift that steps six times a second, a fifth of a pixel at a time, looks continuous and asks a tenth of the work.
- One finish over many pictures does more for a look than choosing among them. Less saturation, deeper shadows, a vignette and a grain made thirty paintings read as one series, and grouping them by the light of the day gave each room one world at a time.
- A border with no colour still has its width, and a background that starts at the padding edge starts again underneath it. Thirteen surfaces drew a line that way for three releases after the borders lost their colour. Set `background-origin: border-box` wherever borders are made invisible, and look for lines by what is painted, never only by which property usually paints them.
- To see what one rule does, photograph the page once and undo the rule inside the same loaded page. Two separate loads showed a third of the home page changing, and it was the scene turning with each open.
- A fix can uncover the next fault. Taking the blur off the tour's steps (v55) left its card see-through; the walk that found the first fault has to be walked again after the fix.
- When WSL stops answering, Windows has run out of memory. Every session on the machine shares it; a second browser beside a running suite was the last push on 2026-11-23. Count the browsers and the free memory before starting one, and a suite that ran through the starvation counts for nothing.
