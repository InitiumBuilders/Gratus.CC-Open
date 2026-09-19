# Evolutions

Every version of Gratus.CC, what changed and why. The full working record is in [DECISIONS.md](../DECISIONS.md), [BUILD-NOTES.md](../BUILD-NOTES.md) and [LESSONS.md](../LESSONS.md).

## v22 · The room says what arrived (2026-09-19)

- **The first room opens by itself when you arrive**, which marked it read before the mark on it could ever be seen. So the room says it instead: a line above the feed counting the words that arrived since your last look. The mark on a room's chip still stands for the rooms you are not in.
- The first time you walk into a room, nothing in it is new. It is simply the room.

## v21 · Fourteen pixels, and a room that answers (2026-09-19)

- **The landing page was 389 pixels wide inside a 375 pixel window.** Not a card: the fixed star layer, which is one viewport width, and a viewport width includes the scrollbar gutter. The document now clips its horizontal axis.
- **A project's frame is never an empty black band** while its picture travels from IPFS. The project's own bloom sits on a soft ground until the image paints over it.
- **A Vibe tells you it holds words you have not read.** A mark on the room, and a line above the rooms. It is the other half of the loop: until now a room could only be spoken into, never returned to.
- The overflow audit is committed at `scripts/audit/overflow.js`, so the reading is repeatable rather than remembered.

## v20 · The refining pass (2026-09-19)

- **A digit reads as a digit.** The display face ships oldstyle figures, so `1` drew as a small capital I and `0` as an O. The garden said "I plant · O ready to give" and the journal said "I day · I entry". Lining, tabular figures everywhere.
- **Counts carry separators**: 16,846 donors, not 16846.
- **A chip is never cut mid-word.** The sideways rows fade over the last 26 pixels instead of a wide wash, and the variant that dropped the fade entirely, which hard-clipped "Newest" to "Newe", no longer exists.
- **The phase legend is one row.** It used to wrap two, two and one, leaving an orphan alone on its own line.
- **The project card puts the money on its own line**, so the chips stop wrapping to two rows.
- **The voice function has an allowance**: forty recordings per device per day, six hundred across everyone, reserved before the call to ElevenLabs. It had no ceiling of any kind before today.
- Headlines balance, so no line ends with one word alone. A day that has not happened yet is quiet rather than unreadable. An example room is shown before you are in one.

## v19 · Guides, Vibes, and a card that shows the picture (2026-09-19)

- **The project card is a media banner.** A 104-pixel tile with `cover` was cropping logos into nonsense and floating when a title wrapped. Now the image sits full width at its own aspect with `contain`, on a blurred wash of itself, under a scrim.
- **Gratus Guides**: the mission, the vision, the loop, the phases and the promises.
- **Gratus Vibes**: the small rooms. A name, a mark, a code, and a feed of short gratitudes.

## v18 · The Passage, the answer, and two rooms rebuilt (2026-09-19)

- **The Gratus Passage**: a link that shows what grew, with not one word of the journal in it. The first thing Gratus makes that lives outside the app.
- **A project's own Gratus page** at `/p/<slug>`, shareable by a steward.
- **The answer**: a seed carries a thread, not a receipt. Either side can keep speaking.
- **Your words, your choice**: seeds are private to the project by default; only their author can publish them. This also closed a real gap, where anyone who knew a slug could read every seed written to it.
- **The journal writes where you stand**: a composer sheet, the month summed up, hold a day to open it, and starred entries.
- **The garden gets views and order**: field or list, three orderings, and a Today card.

## v17 · Deeper, and it fits the phone (2026-09-19)

- **Nothing runs off the page.** A grid or flex child that would not shrink was pushing the app wider than the phone; the calendar grid, the goals stream and the emoji palette each did it differently. Every page now measures exactly 375 at 375.
- **The journal is a month you can see.** A real calendar, walk back through the months, tap a day to open it, and filter by emoji, tag or folder.
- **The garden is a field.** A horizon, every plant sized by phase with a ring filling toward the next one, a diamond on the ones growing for a project, four lanes and the phase legend.
- **A project, in depth.** Raised, donors, updates, where it works, its organisation, the chains it accepts, all its contact links, its recent updates, the gifts that just arrived, how it answers, and what else is like it.
- **The directory.** Giveth's own categories, and Show more through the whole catalogue.
- **Grow a Gratus Gift for a Giveth project.** Dedicate an emoji, grow it with your days, give it when it is ready.

## v16 · All six loops (2026-09-19)

- **I see you**: a project's first-ever seed blooms into 🫶 and the ceremony says so.
- **Responsiveness**: seeds received, share watered and days to answer, on the project sheet and in the project's own console. It orders nobody against anybody.
- **Harmonic alchemy**: twelve marks in `config/alchemy.json`, each needing both a gift and inner work, each showing its own progress.
- **The circular flow**: a steward can pass it on to a project they are grateful for; the donor continues the flow, or sees others like the one they gave to.
- **Sunlight**: a public Giveth address read for GIVpower boosting, gifts and likes, feeding the alchemy.
- **Giveth confirms it**: a transaction hash checked against that project's recent gifts.
- Rate limits on planting; the big milestones now arrive through the Gate's light instead of a toast.

## v15 · Giveth, and the Emotional TRACE (2026-09-19)

- **The Emotional TRACE**: Begin (plant a Gratus Seed with a donation), Become (the project reads it in its own console), Bridge (they water it), Bloom (it opens in the donor's garden with their reply inside). `api/trace.js` and the trace constellation.
- **Give with Giveth**: a live room reading Giveth's public API, with four lanes including one for projects nobody has given to yet, and an onboarding sheet for what they built.
- The landing page rebuilt in the new look: one statement per act, his card art, gold pills, the same scene and ritual as the app.
- Docs: [GIVETH.md](GIVETH.md) and [EMOTIONAL-TRACE.md](EMOTIONAL-TRACE.md), with the pitch, the building blocks, the data model and the six loops.

## v14 · His new look: the home text for text, the bar as drawn, the tab intros (2026-09-19)

- The home rebuilt from his mockup, text for text: the brand row (menu, logo, Gratus.CC, his two lines), Today's Gratitude with Write Today, the three doors (Gratitude Journal, Grow Your Gratus Garden!, Give Gratus Gifts with Send a Gift), Gratus Gives Together with Set Your Gratus Goals and the goals stream. The card art is cropped from his mockup.
- The bar as drawn: Give · Gratus · Grow, the logo in a gold ring rising from the bar, gold labels, a gold line beneath.
- Entering Give plays his plant video until the light fills the screen, holds the white, and the page fades in; entering Grow plays his ring of light the same way. Tap to enter early.
- Every primary action is a pale gold pill with dark words, readable on any scene. Glass carries a gold-mint hairline.
- Eight new paintings lead the scenes (the star over the lake, the island sprout, the heart sphere, the orbs, the galaxy, the ring of light, the golden river); the garden moved to its own room.

## v13 · The logo is the core; voice; the journal's rooms; the desktop painting; MIT (2026-09-19)

- The bar's centre is his logo itself, sitting in the bar, with the swaying arcs, a rising aura ring, the embers and the spill of light around it, nothing plated and nothing cut.
- Voice entries: a real recording kept on the device, its words through ElevenLabs speech to text (`api/voice.js`); hear it back in the composer and in the entry.
- The journal has four rooms: Entries, Threads, Folders, Milestones. Continue a thread from any entry; file entries into folders; eighteen milestones light on your own road.
- On a desktop the scene is a painting at its own size on a wall of its own blurred light; the boomerang loops re-encoded at the source width.
- MIT license for everything; the colophon signs as @BuiltByAugust with the link.

## v12.1 · Restore, and the empty garden reads (2026-09-19)

- Restore from a file beside Export everything in the profile sheet; the file is checked before anything is replaced.
- The empty garden's words stand on a dark pool inside the scene.
- The docs corrected: photo and voice entries already exist.

## v12 · The core in the bar, every word on a plate, open source (2026-09-19)

- The bar's logo sits half in the bar in a 68px squircle, with two swaying arcs of light, five rising embers, and a glow that spills onto the bar.
- Every content column stands on dark glass; heroes carry a stronger scrim band where the words sit; the landing's sections sit on plates.
- The open-source gate (`scripts/gates/open-source.mjs`) with fifteen taught rules and a decoy test; `scripts/publish-open.sh` mirrors a clean export to the public repository and gates the clone; `ship.sh` runs both.
- README rewritten; pitch, architecture, features, guides and this file added; the roadmap opened in `Gratus-Next-Moves.MD`.
- Scripts no longer carry personal paths or a personal email.

## v11 · Readable (2026-09-19)

- All ink white and solid; mint and gold brighter. Base type up one size; nothing under 14px.
- A kicker that ends a sentence reads as a sentence (tagged at render).
- Fields and segments on dark glass; buttons on dark glass; shadows for words on scenes; the landing nav pinned to the top.
- A computed-style audit over every page returned zero small, dim or alpha text.

## v10 · The scene is the screen (2026-09-19)

- One fixed scene layer behind every page, still or video, filling phone and desktop with no ground showing; 1.4s crossfade on page change.
- The bar's centre became a squircle holding the logo.
- The opening ritual on every open: the doorway plays until the light consumes the screen, the white holds, the app fades in.
- The landing rebuilt on the same scene and ritual.

## v9 · The Gate (2026-09-19)

- Every video a boomerang loop that never cuts; the doorway holds the splash and leads the home; its light opens every ceremony.
- His logo in the bar; his song on open with a mute.
- Gratus Goals with a shared stream through one Blob function.
- The Growth Book became the journal: question, thirty-day band, search, entries by day.

## v8 · His scenes (2026-09-19)

- All 28 of his graphics and the first videos as rotating, feathered scenes; his logo as the mark; the risen star bar; the video splash.

## v7 · His mockups (2026-09-19)

- The app rebuilt to his six mockups: tabs Grow, Gratus, Give; the emoji garden; the Growth Book with phases, arcs and recipes; the complete eight-page gift journey inside the link; a working mobile PWA, front end first.

## v6 · A relay draft (2026-09-18)

- A different direction drafted and set aside when his brief and mockups arrived. Kept as a tag.

## v5 · Keep subtracting (2026-09)

- Three doors Ground, Grow, Give on the Quiet Light system; the sixty recipes; the twelve laws one line per screen; the arrival ceremony; installable.

## v4 · Quiet Light (2026-09)

- Dark ground, one hue, one light; the statement-per-screen structure; emoji recipes became Gratus Models.
