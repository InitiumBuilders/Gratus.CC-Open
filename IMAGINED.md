# IMAGINED.md: where the pen was handed over (✦ OPEN: for Fable)

Each item: what was made, why, and where it lives. **Every user-facing line invented here is flagged for the owner** and lives in `config/` so it can be reworded without touching code.

1. **The flora**: eight original morphologies across twelve forms, one grammar. See FLORA.md. *Why this way:* one set of primitives (filament, membrane, pod, lens) parameterized by family keeps the eight organisms recognizably one species of light while giving each a signature behavior a person can name in a sentence.

2. **The Ancient (144 days)**. The plant becomes a place: an arch of light the Pollen passes through, a lit clearing beneath, one star inside per thirteen days. Statement (flagged): *Some things grow until they hold others.* Threshold line (flagged): *The year turned. Now it holds others.* *Why:* the reward for a year of attention should not be a bigger tree; it should be a change of kind, from a thing you tend to a place that holds.

3. **The Gratus Glyph**: `engine/glyph.js`. A ring (time going around), then for each of the first thirteen plants an arc at that plant's spiral angle, radius stepping outward, in its family hue, weight rising with its days; hairlines join consecutive arcs; while the garden has fewer than three plants the Seed Mark sits at the center. Deterministic from `glyphSeed` + state, ≤ 40 strokes, distinct across gardens, evolving as the garden grows, never a face or a letter. Frames the QR, signs shared images.

4. **The night sky**. After the garden hour on Night mode: each plant projects one star per tended day (to 21) straight up above its column, scattered by its seed; the plant's emoji hangs faint above its stars; hairlines join the first star of each plant along the spiral order. Fades at Dawn (removed when the mode changes). Optional, quiet. *(Tap on a star is queued; today the sky is for looking.)*

5. **Grace's voice**: 108 lines across four practices × nine feelings (`config/prompts.json`), every line under twelve words, no exclamation marks, none of streak/should/always/never, never repeated to the same person; twelve threshold lines; weekly and Season sentence templates; the welcome lines; the empty states (none mention absence); the no-overlap line; the self-gift refusal. All flagged.

6. **Twelve more recipes** (`config/recipes.json`, `imagined: true`): weather · hands · sound · enough · borrowed · almost · stranger · ordinary · setdown · taught · tomorrow · protect, each with a why. **Sixty more lineages** (`config/lineage.json`, `imagined: true`) across school, travel, grief, recovery, faith, sport, parenting, city life, seasons, each reason under eight words, every one moving toward light, connection, or ground. **Eight more marks** (`config/rewards.json`, `imagined: true`) that reward practice, never volume: Two Touches · All Four · Named · Savored · Unsent · Future Self · Both Weathers · Turned Over.

7. **The family tones** (`config/families.json` + `assets/js/sound.js`). All in D major so any garden sounds like a chord: Joy F#5 · Calm A4 · Love B4 · Hope E5 · Sad D4 · Afraid G4 · Angry E4 · Tired A3 · quiet D5. Threshold chimes: root + fifth + octave, staggered 180 ms. Bloom: a three-note chord. Common Ground: two tones (A4, B4) resolving to one (D5). The bell: one struck D5 with a 4.5 s decay and two faint partials. All short, soft, never looping, off by default.

8. **Two people answering one bell**. Designed, not yet shipped (needs the group's live presence channel): both rings brighten in the group plot, the two lit roots touch for one breath, and the bell's decay is one tone longer. Quiet.

9. **A cause's canopy**. Designed for the cause page: every giver's seed is a small Lens on the cause's spiral; at 50+ seeds they are drawn as a single canopy membrane with the seeds as pods inside it. **Reaching a goal:** the canopy's rim gains the caustic for a day; no confetti, one line: *Grown.*

10. **The fifth practice**. **Return**: what I come back to (thread, ago, tomorrow). Proposed on /futures. *Why:* the garden itself is made of returning; the four practices never named it.

11. **Three hidden things in the Gratus Garden** (default on, only in the garden): tend at exactly your garden hour → *You came at the garden hour. The soil noticed.* · tend the first seed on its planting anniversary → *One year ago today, you planted this.* · hold the coin for thirteen seconds → *Thirteen seconds. Time is the only thing you can't buy.* (all flagged; `config/prompts.json → hidden`). A fourth is the Roots view itself, reached only by holding empty soil.

12. **The one thing this document didn't think of**: **The Visitor.** See POLLEN.md. A stray mote of a hue the garden does not have drifts in, circles the first seed once, and leaves. Built small (one path, one rare trigger). *Why, to the owner:* every other light in the garden was grown by its person; the Visitor is the only light that wasn't, and that is exactly why it makes the garden feel like a place: places are where other lives pass through. It rewards the person who is simply there to see it, which is the whole thesis of the Ground.

14. **Companions. Combined emoji patterns** (`config/companions.json`, `engine/patterns.js`): forty-five pairs; when two seeds are tended on the same day three times, the pair becomes a named pattern with one plain line and the result seed unlocks (☕ + 📚 → 🧠 *Quiet study*; 💔 + 🙏 → 🕊️ *Repair*). Near-companions invite: "one more and they are companions." *Why:* the garden should notice what a person keeps putting together before the person does.

15. **Species names**: every family is a species (Lumora, Crystal Reed, Heartfruit, Starbloom, Rainbell, Nightmoth, Emberthorn, Moonmoss, Palefern), so a person grows "a Crystal Reed from a ☕", and can rename it.

16. **The gardener** (`avatar.js`): a small figure seen from behind at the front of the field, a heart of light in its chest tinted by the week's weather, the Glyph on its back. You are in your garden.

17. **The Root check-in**: one tap of eight feelings on Ground colors the day even without words, and shapes what grows next.

13. **Two adaptive rules for keeping people journaling** (`engine/guide.js`): **The Short Line**: when the last three entries are getting shorter, offer the smallest asks (tiny, body); a shrinking entry is a person running out of steam, not one to push. **The Return**: the first entry after three or more days without one gets the gentlest door (enough, notice) and never a word about the gap; the welcome line never references time away.

## 18. Evolutions (v3)
Forty arcs an emoji can walk as it is tended: 🥚 → 🐣 → 🐥 → 🐓, 🌑 → … → 🌕, ☁️ → 🌧️ → 🌦️ → 🌈, 🕯️ → 🔥 → ✨ → 🌟. Each stage has a name and one sentence about gratitude at that stage. Every emoji sits on at most one chain, so the world is a map, not a maze.
## 19. The Forge
Two emojis tended on the same day three times become ready; the person combines them and chooses to plant the third or keep it. Ninety-six recipes across a whole life, with a depth of one to three.
## 20. The Trove
Everything reached, with two names: the standard one and yours. Grace drafts the context from your own entries; you overwrite her.
## 21. Grace's two layers
A local reflection that never leaves the device, and a mind you can hand one entry to, on purpose, never kept.
## 22. The result
Every model gives back an emoji, hidden until the model is made. The field grows from the models the field made.
## 23. The twelve laws
His statements, one per screen, out of blur, then a door back to today's line.

## 24. The relay
A Gratus is a gift made of days. It leaves when given. The first to open the link receives it, once.
## 25. The ring of days
One dot per day on the sunflower spiral, the first hand at the centre, today in gold. Time you can see.
## 26. Left on a date
A Gratus given on a date stays sealed until that day. It can be left to someone.
