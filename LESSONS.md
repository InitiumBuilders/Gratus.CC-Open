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
