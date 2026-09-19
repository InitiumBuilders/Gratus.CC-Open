# Evolutions

Every version of Gratus.CC, what changed and why. The full working record is in [DECISIONS.md](../DECISIONS.md), [BUILD-NOTES.md](../BUILD-NOTES.md) and [LESSONS.md](../LESSONS.md).

## v30 · The slop gate (2026-09-19)

- **A fifth gate, and the first one that judges writing.** It refuses the mechanical habits of machine prose across the repository: a dash standing in for a decision about how two clauses relate, a contrast with nothing on the other side of it, a word that sounds expert and carries nothing, a run-up that announces a point instead of making it.
- **It knows whose words it is reading.** `config/his-words.json` holds August's lines, every value under `locked` in `config/copy.json` is his as well, and any line containing one is skipped whole. The decoy run proves both directions before every ship: each rule still catches a planted violation, and his lines still come through untouched.
- **One hundred and twenty-eight hits on the first run, and zero now.** Four of them were not writing at all. They were a dash standing where the interface had never decided what to show, and removing them meant choosing the word: `not yet` for an answer that has not come, `$0` for a project that has raised nothing.
- **[docs/REFINEMENT.md](REFINEMENT.md)** carries the ladder, the strategy prompt, what a gate cannot catch, and the next moves in order.
- The first thing the gate did after being wired into the ship was fail the build on the heading style these notes had used for thirty versions, and on a sentence quoting one of the words it hunts. Both were fair.

## v29 · An audit that cries wolf (2026-09-19)

- The overflow audit stopped reporting elements inside a parent that clips, because nothing in one can widen the document.

## v28 · The standing, before anything is standing (2026-09-19)

- **Grow says what a first word does.** The standing showed nothing at all when the garden was empty, which hid it from the one person most likely to need it: someone opening the tab for the first time, with no reason to know that a word is a day of care on something rather than a note in a list.
- The record of v27 was corrected. Setting the scroll position from a debugger in that browser pane dispatches no scroll event and drives no observation, so the observer it blamed was very likely fine. The replacement stands because its behaviour can be driven and read from outside.

## v27 · An effect you can prove is running (2026-09-19)

- **Depth changed hands.** It watched a one pixel mark at the hero's end with an IntersectionObserver, and that observer was never once seen to deliver. It now reads the scroll position and compares it with a boolean, doing nothing at all when the boolean has not changed, which is almost every event. The effect is the same and it can be watched from outside.

## v26 · Depth (2026-09-19)

- **The scene steps back when you start reading.** Past the hero the background fades toward the ground colour and drifts very slightly wider, the way a background falls out of focus when you look at something nearer. It is opacity and transform on the scene layer, never a blur, because a blur across a full screen fixed layer is paid for on every frame it is composited and this one is there for the whole session.
- **A room's three actions fit.** The two that share sit side by side and leaving sits apart and quiet, because it is a different kind of act.

## v25 · Five is a list of five (2026-09-19)

- **A crossing is no longer followed by "Kept."** When a plant crossed a phase and its emoji happened not to change, the run of conditions fell through to the last one and told the person their word had merely been kept, a second after telling them it had crossed into Deepened. The plain card is now only for a word with no plant behind it.
- **The five notes are written down the page, one row each.** As chips they wrapped two, two and one, leaving Ready to Give alone on its own line.

## v24 · The sound made learnable, and a room with a face (2026-09-19)

- **The Gratus Sound has a page.** Guides now says what the five notes mean and lets you hear the chord as far as any phase, so the grammar can be learned rather than only felt.
- **A crossing no longer repeats itself.** The held card said the phase and then an ordinary card said it again, which made the moment ordinary. The crossing now replaces that card instead of preceding it. The first phase of a new plant says it begins, because nothing has been crossed yet.
- **A room has a face.** A Vibe shows the emojis people used in it, most said first. It is a tally of what was said, never a ranking of who said it.
- **A room can be shown without being opened.** A Vibe's Passage carries its shape: how many said something, how many voices, and what it grew. It carries no code, so it cannot let anyone in, and not one word of what was said. Letting someone in stays a separate thing you do on purpose.

## v23 · The Gratus Sound, the crossing, and the frame (2026-09-19)

- **A picture is shown at its own shape.** Sixty real Giveth images were measured first: none portrait, a tenth square, nearly half between 1.35 and 2.6, a third near 3, a few as wide as 7 to 1. No single band could serve them, which is why cropping cut the subject out and fitting left a black moat. The band now takes each picture's own shape, clamped to what a card can hold, and fills it. Between 1.2 and 3.2 that is an exact fit: nothing cropped, nothing empty.
- **The Gratus Sound.** Five phases, five notes of one chord. Planted is the root, Nurtured the fifth, Deepened the octave, Bloomed the third above it, Ready to Give the fifth above it. Crossing into a phase sounds its note and everything underneath, so the chord is built by the growing. Giving plays the chord and lets it fall back to the root alone: what remains after you give. None of it is a recording; it is synthesised, so it costs nothing to carry and can never fail to load.
- **The crossing.** A plant changing phase is the app's held moment: the screen stops, the name of the phase stands alone, and its note sounds. It happens only when the day's word actually moved something.
- **The standing**, at the top of Grow: which plant is nearest its next crossing, its ring, and what one word today would do to it.

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
