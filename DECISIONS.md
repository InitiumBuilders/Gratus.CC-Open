# DECISIONS.md — every open question had a default; here is what was chosen and why

Rule 2 of the build prompt: *decide, don't ask.* Each entry names the default the spec offered, what shipped, and the reason. The owner may reverse any of them.

| # | Question | Spec default | Shipped | Why |
|---|---|---|---|---|
| 1 | Stack | Next.js 15 + TS + Tailwind v4 + Motion + Zustand + Supabase/Drizzle | **Vanilla ES-module PWA, no build step; Vercel functions + Vercel Blob for the cross-person layer** | The spec's own laws decide it: *must run with zero external keys*, *every phase shippable alone*, *the journal must open in under 300 ms from a cold tab*. A static shell with a pure engine honors all three tonight; a Next/Supabase build needs provisioning the owner has to do by hand. The engine is still pure, tested, config-driven, and framework-free, so a later port keeps every rule. |
| 2 | Engine language | TypeScript | **JavaScript ES modules with the same module boundaries** (`engine/garden.js`, `guide.js`, `rewards.js`, `presence.js`, `groups.js`, `glyph.js`, `money.js`, `moon.js`) | No build step. The types live as JSDoc-style shapes in `config/*.json` and the data model in the spec. |
| 3 | Tests | Vitest + Playwright | **`node --test` (24 tests, every §17.3 rule) + the contrast and banned-pattern gates in `scripts/gates/`** | Zero dependencies to run the gates. Playwright screenshots at 390/768/1280 remain a manual pass for now (LESSONS.md). |
| 4 | Fonts | self-hosted | **Google Fonts (Sora, Geist, IBM Plex Mono) with `display=swap`** | Fastest path to the exact faces; self-hosting is a one-hour follow-up. Every face has a real fallback stack. |
| 5 | Emoji artwork | Noto / Twemoji SVG | **Native platform emoji inside the Lens** | Zero assets, consistent within a device, honest about what the seed is. `/licenses` says so; Twemoji can replace it later without touching the engine. |
| 6 | Journal storage | Postgres, encrypted per user | **On-device (`localStorage`), never sent** | Entry text is private forever; the simplest way to make that true is to never transmit it. The server receives only emoji, form, family, days, and money events. Encryption at rest becomes real when cross-device sync arrives. |
| 7 | Accounts | magic link + passkeys | **A handle (`Name.Dash`) + a bearer token + a 12-character recovery code** | No email, no password, no photo. Recovery works from another device with the code. Passkeys later. |
| 8 | Money ledger | server | **Server-authoritative when a handle exists; the coin shows 0 until then** | The client never credits itself; presence gifts are rolled on the server; the Pool pays by UTC day from the server. Nothing can be farmed by editing a phone. |
| 9 | The Pool without a server | — | **Not simulated for real users; the `?dev=1` panel simulates it, labeled *simulated* in the ledger** | Rule: never fake money. |
| 10 | Gifts by link | — | **A link-only gift (no handle on either side) carries meaning: emoji, note, days, path. Money rides only between handles.** | The gift is the invite (§8.6) and must work with zero accounts. Money needs a ledger on both sides. |
| 11 | Causes | verified nonprofits listed | **The list ships empty; the first entry will be a real organization the owner has checked** | Fabricating a charity to fill a demo would be a lie on a page about giving. Designed placeholders explain what will appear. |
| 12 | Purchases, Dash rail, wrapped Dash, card | behind flags, MockRail | **All flags off; the Store shows each shelf with a waitlist; redeem "opens with the stablecoin"** | §9.6: counsel before any purchase flag. |
| 13 | Gratus Grace with AI | opt-in route to Claude | **Flag off; the rules engine runs everything; the Settings copy says it plainly** | Zero keys. The system prompt from §5.6 is kept verbatim in the spec for when the route opens. |
| 14 | QR | BarcodeDetector + jsQR | **BarcodeDetector where present; jsQR and qrcode-generator loaded on demand from cdnjs** | Kept out of the shell so the journal stays under 300 ms. |
| 15 | Codename | "Groundlight" never in UI | **Never in UI; the banned gate greps for it** | — |
| 16 | The colophon | owner completes it | **His exact words, verbatim, including "Give Gifts The Grow."** | The law: never reword his words. Flagged in the report in case it is a typo he wants to fix. |
| 17 | Ecosystem line in the footer | [owner decides] | **"Part of the Motus ecosystem · MotusMoves.US"** | One line, one link, easy to change. |
| 18 | Deploy target | gratus.cc | **gratus-in-motus.vercel.app** (his instruction); `gratus.cc` links in copy point at the site root | Domain attachment is a dashboard step for the owner. |
| 19 | The Ancient (144 days) | ✦ open | **The plant becomes a place: an arch of light the Pollen can pass through; one star inside per thirteen days** | *Some things grow until they hold others.* |
| 20 | The fifth practice | ✦ open | **Return — what I come to again** (thread, ago, tomorrow, question, bestself, younger, unfinished, week) | Wired as the fifth practice in the journal (v2). |
| 21 | Ground color | Night Soil #090B24 (indigo) | **Near-black #04040B** | The owner's mockups (2026-09-04) are black with neon; the logo's world is black. Newer instruction wins. |
| 22 | Gradient text | banned (§2.5) | **Allowed for one headline per screen via `.grad-text`, hero size only** | The mockups' voice ("Give with heart"). Legibility holds at ≥ 28 px on black; body text stays white. The gate no longer greps for it. |
| 23 | Streaks / levels / XP in the mockups | banned (§1.3, §1.4) | **Not built.** The same visual shapes carry days, forms, and thresholds. | His constitution outranks a mockup's placeholder copy. Ask if he wants this reversed. |
| 24 | Tabs | Garden · Give · [Seed] · Ground · You | **Ground · Give · [Garden coin] · Grow** | His instruction. Ground = the journal's home + presence; Grow = the profile opening on Grow Together and the program. The journal is reached from Ground and a write FAB everywhere else. |
| 25 | Garden layout | the golden-angle spiral | **An isometric field of planters (FarmVille grid, rack rows)**; fill order keeps the first seed at the front | His reference image. The spiral survives in the Glyph and the night sky. |
| 26 | Plant species names | — | **One per family** (Lumora, Crystal Reed, Heartfruit, Starbloom, Rainbell, Nightmoth, Emberthorn, Moonmoss, Palefern) | The mockup's "Lumora Bud / Starbloom / Heartfruit / Crystal Reed" made the alien world legible; a person can name what they grew. |
| 27 | Photos in entries | — | **On-device in IndexedDB, downscaled to 1000 px, never sent** | A journal with no photos is not a journal people keep. |

## v3 — after the owner's "D-" (2026-09-04)
28. **The emoji is the organism.** No plants, trees or drawn flora anywhere. The thing that grows in the garden is the emoji itself: it gains an aura and rings by days tended (the Fibonacci forms stay), TRANSITIONS along a chain at 3 · 8 · 21 · 55 tended days (`config/evolutions.json`, 40 chains, 155 stages, each with a name and a line), and can be COMBINED with another emoji it shares three tended days with (`config/forge.json`, 96 recipes). Owner's words: "get rid of all the plants… an emoji forge or emoji collider… emojis grow or transition into other emojis with names and descriptions."
29. **One mode.** Dawn is gone from the app. The default `auto` mode showed a half-broken paper theme all day, with dark-on-dark text in stat cells and cards; that was the "text literally not visible." The public landing keeps its own film. The app is the black stage of the mockups, always.
30. **The mockups are the contract, not the inspiration.** Tokens were read off the six images: true black, one-pixel gradient rims (magenta → violet → cyan) with a soft violet bloom, white headings, lavender-white second voice (never grey), gradient pills (blue → violet → magenta → orange), neon line icons, stat cells with icon · big number · small word, and the logo coin raised in the middle of the tab bar. `.grad-text` is used for one word per screen, as the mockups do ("Give with **heart**").
31. **The Trove holds the person's own words.** Every emoji reached (planted, evolved, combined, gifted) keeps its standard name AND the person's own name and context. Grace drafts the context from the entries (days, weather, first words) and the person overwrites it. Owner's words: "keep the standard emoji names but then add a user's version or their own name for an emoji and the description/context."
32. **Grace has two layers, both on request.** Local reflection is always available and never leaves the device. Grace's mind (an AI behind `/api/grace`) is off by default; when the person turns it on in Settings, one entry can be handed over from the editor, once, on purpose, and it is never stored. Env: `GRACE_AI_URL` (an OpenAI-compatible chat completions URL), `GRACE_AI_KEY`, `GRACE_AI_MODEL`. Without them the route answers `offline` and the UI says so.
33. **Forging is an act, not a side effect.** Shared days make a pair *ready*; the person taps Combine in the Forge and chooses to plant the result or keep it in the trove. Discovery without agency is a notification; discovery with agency is a game.
34. **Streaks, levels and XP remain unbuilt** (the mockups show them; the owner's spec forbids them). Grow shows the form, the days, this week, and totals instead. Ask before building.

## v4 — QUIET LIGHT (2026-09-07), after "simplify it very deeply"
35. **Three doors.** Ground (the journal), Grow (the emojis and the models), Give (honor). Every other surface was folded into these or removed: the isometric field, the planters, the stat rows, the Forge and Trove tabs, the floating write button, the top bar, the coin, the bell, the Pollen swarm. Owner's words: "No cluster, no clobber, no chaos."
36. **Quiet Light is the register.** Ground `#030014`, one hue `#6D48FF` at four alphas, ink solid and hued (never grey, never alpha), hairline borders, inner light instead of shadows, display type at weight 500, body 16/24 that never shrinks, motion of 200 to 300 ms only, one figure per screen (the horizon on Ground, the field on Grow, the dome on Give), one gold per page marking the act (Keep, Give). The measured system in the davara-distinct-v4 skill is the source.
37. **Gratus Models replace the Forge.** A formula of two or three emojis, kept on the same day three days over, names a pattern: sixty models in six families (Growth · Building · Startup · Profit · Coordination · Care), each with a statement and a loop. Owner's words: "Motus models, but for Gratus and with emojis." Making a model is the journaling itself; the ceremony follows the third day. A model can be set in motion, one at a time, and shows on Ground with the days kept.
38. **Honor is given, never earned.** The Give door leads with "Gratus means honor." (the owner's words). Gratus arrives only as the daily Pool's equal share or as a gift from a person. No bounties, no rewards for tasks.
39. **Motion is a gift, never a gate.** Entrance choreography runs only under `html.anim` while the page is visible, and `html.landed` lands every element after 1.1 s regardless. A hidden tab, a slow phone or reduced motion always sees every word.
40. **The arrival is a ceremony.** Mark, "Gratus means honor.", "Journal Every Day.", then the door (a handle, optional). Under four seconds, tap to skip, reduced motion goes straight to the door.
41. **Installable.** Manifest at `#030014`, three shortcuts, an install moment after the third day kept, and an Install row in Settings (with the Safari path on iOS).
42. **The public landing still speaks of plants** in places; it renders emojis through the small flora shim. Rewriting it in Quiet Light is the next surface, not this one.
43. **The line is the seed bag.** The row of seed orbs and the row of eight feelings left Ground. Every emoji written in the line is planted or tended when the line is kept; a phone keyboard already has every emoji. Five small hints insert into the line at the caret, and "how it felt" is one tap into a sheet.
44. **Every model gives back an emoji.** A formula now reads ☕ + 📖 → 🧠. The result is hidden until the model is made, then planted in the field with origin `model`. Models grow the field that grows models; the recipe game closes on itself.
45. **The twelve laws are his statements, verbatim.** "Gratus means honor." first, then eleven lines from `prompts.json`, one per viewport, reached from Give and from the colophon's "twelve laws". Nothing in that surface was written by the builder.
46. **A made model can be shared as a card.** Formula → result, the name, the statement, `gratus.cc`. The card is how a law leaves the app.
47. **Settings hold eight rows.** Garden hour, Sound, Haptics and Motion left the surface (the system preference governs motion; sound and haptics keep their saved values). The Store is a link under Gifts.

## v6 — THE RESTART (2026-09-19)
48. **A Gratus is a gift made of days.** The product is one object. One emoji; every day the holder keeps a line for it is a day; it can be given, and when it is given it leaves. The old world (three doors, models, money, handles, groups, the Pool) is tagged `v5-quiet-light` and removed from the tree.
49. **The gift must keep moving, literally.** Giving moves the Gratus off the giver's device. The giver keeps their lines, the count of days they gave, and a row under Given that says where it went. Nothing can be given twice; the first person to open the link receives it (compare-and-swap on the store).
50. **What travels is the shell, never the inside.** The store holds the emoji, the birth, and every hand (name, days, dates, the one line that hand chose to send). Lines written on the device never leave it. Grace's mind stays dormant.
51. **The ring of days is the figure.** One dot per day on the sunflower spiral (golden angle), the first hand nearest the centre, earlier hands violet, the holder's days white, today gold. Time given is legible without a number, and the number is there too.
52. **No accounts.** A name is typed at the moment it matters (giving, receiving) and travels with the hand. No handle, no token, no friends list.
53. **A Gratus can be left.** Given on a date, it stays sealed on the store until that day; the link reads "opens on".
54. **The link is the front door.** `/gratus/<id>` is served with the gift in its title, so a preview says who gave what before the app loads. The arrival plays the hands, the line, and his law, then asks one name.
55. **One screen.** Ring, facts, the question, the line, Keep; then Hands, Give, Given, Lines, the colophon and the twelve laws. No tabs.
56. **Money left the surface.** Honor is days, and days can only be given. The owner's money lines stay in his statements; nothing on the surface pays or counts Gratus.

## v7 — THE GRATUS GALAXY (2026-09-19)
57. **Built to his mockups.** Three tabs, Grow · Gratus · Give, with the star at the centre. A serif for the words, his galaxy art behind glass, mint light for growing and gold for giving. The Quiet Light surface (v4–v6) and the relay draft (v6) are tagged in git (`v5-quiet-light`, `v6-relay-draft`).
58. **Front end first.** Everything lives on the device. There is no API in the tree; the backend comes later, and the privacy page says so.
59. **A gift travels inside its link.** The whole journey (emoji, days, phases with dates and one line each, tags, the message, the name) is encoded in `/gift#<code>`. It works with no server, and the receiver's eight pages open on any phone.
60. **The Growth Book is the manual.** Five phases by days of care (Planted 0 · Nurtured 2 · Deepened 5 · Bloomed 9 · Ready to Give 13), forty evolution arcs on their own clock (0, 3, 8, 21, 55), sixty recipes in six families, and the person's own emojis and recipes.
61. **Projects and partners are shown as imagined**, labelled so, until a backend connects them. Giving links open the partner's own site.

## v8 — HIS SCENES (2026-09-19)
62. **His graphics are the product's light.** Twenty-eight of his generated scenes and three videos live in `assets/art/gfx/` (optimised to 1600px and 720p). Every screen draws one scene, feathered on every edge with a two-layer mask, and a different scene each time the app opens (`S.opens` picks). The mockup crops from v7 stay as project art.
63. **His logo is the mark.** `GRATUS.CC LOGO.png` is the app icon, the top-bar mark, the splash, the galaxy core and the landing hero. The old mark is gone.
64. **The star is risen.** The centre tab sits above the bar in its own orb with a gold arc, as in his mockup; the leaf glows mint when Grow is live, the gift glows gold when Give is.
65. **A splash, once per session.** His transition video with the mark and the name, two and a half seconds, tap to pass. Never on a gift link.

## v9 — THE GATE (2026-09-19)
66. **Every video breathes both ways.** Each clip is slowed 1.6× (the long zoom 1.2×), then played forward and back and joined, so a loop never cuts: 48 and 60 second cycles from 15 and 25 second clips.
67. **The Gate is the threshold.** His doorway holds the splash, leads the home scenes as the long zoom-out, and its final seconds, the light consuming the screen, open every ceremony: planting, a new phase, a recipe, harvest.
68. **His logo is the centre of the bar,** inside the risen orb with a swaying arc of light. His song, A Sacred Place, plays on every open, one tap to mute, and the preference is kept.
69. **Gratus Goals.** On Grow, a person posts what they are growing toward, as many as they like; goals go to one shared stream (`api/goals.js`, Vercel Blob) and appear on everyone's Grow. Without the store the stream shows as imagined and goals stay on the device until it connects.
70. **The Growth Book is the journal.** Journal first: today's question, the last thirty days lit, search, every entry by day. Then the phases, the emojis, the recipes.

## v10 — THE SCENE IS THE SCREEN (2026-09-19)
71. **The scene is the screen.** One fixed layer behind every page holds the background, an image or a boomerang video, filling the whole viewport on a phone and on a desktop, crossfading over 1.4 seconds when the page changes. Heroes carry no art of their own any more, and every scene list leads with a video.
72. **The centre of the bar is a squircle.** 82 pixels, the logo's own shape, risen 30 pixels above the bar, with the swaying arc of light around it.
73. **The opening ritual, every open.** The doorway plays from its eleventh second until the light consumes the screen, then a white and gold field holds for 2.6 seconds with the mark and the name, and the app fades in. A tap enters early. Reduced motion shows the mark for 1.2 seconds instead. The same ritual on the landing page and on a gift link.
74. **The landing page stands on the same scene.** The long zoom of the Gate runs behind glass sections; the sections rise out of blur as they enter.

## v11 — READABLE (2026-09-19)
75. **Every ink is white and solid.** The three inks collapse to white; nothing on the page is dimmed, tinted grey or set in alpha. Mint and gold stay for labels and links, one shade brighter than before.
76. **Type one size up, everywhere.** Body 18 on 28, captions 17, leads 20, headings 36 and 26, buttons 17 at weight 600, fields 18. Labels in small caps are 14 at weight 700. Nothing under 14.
77. **A kicker that ends a sentence is a sentence.** At render, any kicker whose text ends in a full stop, or asks for a tap, drops the small caps and reads at 17 in sentence case. Labels keep the small caps.
78. **Words that sit straight on a scene carry a shadow, and fields carry their own dark glass,** so the journal search, the day headers and the hero words read over the brightest doorway.

## v12 — THE CORE IN THE BAR · EVERY WORD ON A PLATE · OPEN SOURCE (2026-09-19)
79. **The core sits in the bar.** A 68px squircle, its centre on the bar's top edge, with two arcs of light swaying against each other, five embers rising, and a glow that spills onto the bar. The empty space around the logo is gone.
80. **Bright scene above, dark plate below.** Every content column stands on deep glass; heroes carry a stronger scrim band where the words cross the scene; the landing's sections and footer sit on plates. White never sits on bright.
81. **The public mirror is gated twice.** `scripts/gates/open-source.mjs` holds fifteen taught rules, each with a decoy that must fire before a ship; `scripts/publish-open.sh` exports the tree without git state, env files, Vercel state or personal paths, gates the export, pushes on top of the public history, clones the result and gates the clone. `ship.sh` runs it after the live stamp is confirmed.
82. **Scripts carry no person.** No home paths and no personal email in code; the commit identity lives in the private repository's local git config.
83. **The docs are part of the app.** README, pitch, architecture, features, guides, evolutions, and `Gratus-Next-Moves.MD` with the roadmap and the open questions.

## v12.1 — RESTORE (2026-09-19)
84. **The journal can come back.** Restore from a file sits beside Export everything. The file is checked (version, entries, plants) and the person confirms before anything on the device is replaced; the state object is replaced in place so nothing holds a stale reference.
85. **The empty garden reads.** His three lines stand on a dark pool inside the scene, with the scene still around them.

## v13 — THE LOGO IS THE CORE · VOICE · THE JOURNAL'S ROOMS · THE DESKTOP PAINTING · MIT (2026-09-19)
86. **The logo is the core.** No plate behind it. A 60px squircle image sitting in the bar, its centre on the bar's centre, with the two swaying arcs seven pixels out, an aura ring that rises and fades every 4.6 seconds, five embers, and a spill of light on the bar. Nothing is clipped because nothing wraps it.
87. **A voice entry is a recording and its words.** The recording is kept on the device in IndexedDB under the entry's id; its words come through `api/voice.js` and ElevenLabs speech to text, with the key only in the Vercel environment. If the words cannot come, the recording is still kept. The open-source gate knows the key's shape.
88. **The journal has four rooms.** Entries, Threads (one emoji through your days), Folders (named, filed from any entry), Milestones (eighteen marks on your own road; a toast when one lights). The house words hold: days in a row, never a streak; marks, never a score.
89. **On a desktop the scene is a painting.** The art is 941 pixels wide; stretching it to a wide screen made it soft. Now it stands at its own size, feathered at the edges, on a blurred wall of its own light, and the loops are re-encoded at the source width.
90. **MIT for everything,** code, art, video, song and words, by his ruling. The colophon signs as @BuiltByAugust, linked.
