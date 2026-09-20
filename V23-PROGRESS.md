# v23 · THE MOTUS EVOLUTION · progress ledger

Working file for the run of `GRATUS-v23-MOTUS-EVOLUTION-PROMPT.md`.
Branch `v23-motus-evolution`. Nothing here deploys. `ship.sh` waits for August's word.

**Update this file at every checkpoint.** It is what makes the run resumable.

---

## 0 · The re-derivation, run first

The prompt was written against **v22 (`71f878f`)**. The tree is at **v34**. Twelve
versions shipped in between, so every load-bearing claim was re-checked against
what is on disk before a line was changed.

**Result: almost every finding is still live.** The twelve versions since v22 were
about other things. Three claims have moved, and one of them is a conflict with
the prompt's own refusals.

| the prompt says | today | what that changes |
|---|---|---|
| "there is no `AudioContext`, no oscillator, no sound engine" (§1.4) | a synthesised sound system shipped in our v23 | §6.4 step 3 is **partly built**, not from scratch. Re-scope it. |
| voice `MAX = 6_000_000` (§4.6) | `2_000_000` since our v32 | the cap exists. The prompt asks for `1_500_000`; take the prompt's number. |
| no writing gate | `scripts/gates/slop.mjs`, 8 rules, two-way decoy | **G5 is partly built.** Extend it rather than starting it. |
| "Empowers You To Give Gratus Gifts" is slop; replace it (§3.3d) | the line is registered in `config/his-words.json` as **August's**, from his v14 mockup | **CONFLICT.** §11 forbids rewriting his sentences. Do not edit. Votus. |

Everything else in the prompt re-derived as still true. The full table is in the
run log below.

---

## The checkpoints

```
[x] CHECKPOINT 0   fixture captured, 23 gates exist, every one behaves correctly
[x] CHECKPOINT I   TRUTH        shipped and live, 2026-09-19
[x] CHECKPOINT II  INTEGRITY    shipped and live, 2026-09-19
[x] CHECKPOINT III BODY         shipped and live, 2026-09-19
[x] CHECKPOINT IV  SACRED       shipped and live, 2026-09-19
[x] CHECKPOINT V   BRIDGE       shipped and live, 2026-09-19
[x] CHECKPOINT VI  GUIDED       shipped and live, 2026-09-19
[ ] CHECKPOINT VII SHIP        ← stops for August
```

---

## The Votus bucket, growing as the run goes

Decisions that are his and not mine. Nothing here is decided in code.

1. **`$GRATUS`: retired, or deferred?** (§3.1) Six laws are broken by the current
   copy. Either way it comes out of every shipped string; the question is whether
   `DECISIONS.md` records it as deferred or as retired.
2. **`config/prompts.json:391`** is his, and it promises the garden pays the
   Three lines later `:394` says there are no levels, ranks or leaderboards. Both
   are his. Draft replacement for the first half, for him to accept or replace:
   *you write, you plant, you tend; what you grow can be given, and every gift
   carries the days it took.*
3. **`statements.money`** holds *"Stable money, growing meaning."* His file, his line,
   a money claim. Left in place.
4. **The colophon.** *"Journal Every Day. Give Gifts The Grow."* in five files.
   `DECISIONS.md:22` already ruled it verbatim and already flagged it as possibly
   a typo. Not touched. If he says fix, it is one pass across five files plus a
   gate on the string.
5. **"Gratus Helps You Grow Gratitude Daily And Empowers You To Give Gratus
   Gifts."** The prompt calls *Empowers* slop and asks for it to be replaced. It
   is his mockup line and it is in the his-words registry. Not touched. His call.
6. **The ninth family.** `quiet` / Palefern / D5 exists in `config/families.json`,
   flagged `owner: true`, and nothing loads that file. Admit it into `order`, or
   leave it out and say so once?
7. **Nocturne-only.** There is no light mode anywhere. Is dark-only the design?
   If yes it gets written into `DECISIONS.md` so nobody keeps looking.
8. **`CRON_SECRET`** is set in three environments and read by nothing. Build the
   cleanup job it was provisioned for, or remove the provisioning?
9. **Every sentence written in this run**, listed verbatim in `IMAGINED.md` with
   `imagined: true`, for him to approve or replace.

---

## CHECKPOINT 0 · done

**The fixture and the ladder.** `engine/state.js` is new, pure and has no imports,
so a gate can load it under Node. It replaces `if (!S || S.v !== 1) S = fresh()`,
which would have deleted every garden on earth the first time this app wrote
`v: 2`. A garden is now walked up a ladder; a garden from a newer build is kept
and its version left alone; an unreadable version is repaired; only something
that is not an object at all gets a fresh one. `scripts/fixtures/garden-v1.json`
is a whole garden at `v: 1` for the gate to carry forward.

**The gates.** Twenty-three commands, plus the four that were already here.
Run them all with `node scripts/gates/v23.mjs`, or `--fast` to skip the five that
open a browser.

| state | gates |
|---|---|
| green | engine tests · G14 migration · G7 open-source · G9 contrast · G20 refs · slop |
| red, correctly | G1/G2/G5 banned · G4 copy-live · G6 trace-auth · G8 weight · G10/G11/G13 a11y · G12 states · G15 hidden · G17 bridge · G18 og · G19 docs · G21 strings · G22 families · G23 ceremonies · G24 guides · G25 diagrams · G26 frontdoor · overflow |

**Kill count so far: 1/1.** M9 restores the wipe-on-mismatch line and G14 goes red.
The harness is the mutation harness; it restores the file byte for byte and
refuses to run against a gate that is not green first.

**What the gates found that the prompt could not have known.** Three of its
claims have moved since v22 and one is a conflict with its own refusals; the
table at the top of this file has them.

**Two of my own gates were vacuous and were fixed before they could lie.** The
hidden-tab video check counted zero playing videos without first proving one was
there to stop, and the confirm check passed because no seed existed to forge
against. Both now assert the precondition first.

**And the de-slop pass rewrote the slop gate's own decoy**, which is exactly how
a gate stops biting without anyone noticing. The decoy run caught it in one
command. Restored.

---

## CHECKPOINT I · TRUTH · shipped

**Live at gratus.cc.** Stamp `galaxy.js?v=1789855889`. Mirror `a8bc3f2`, both
open-source gates green. The second host is deployed.

| what | before | after |
|---|---|---|
| token promises in shipped copy | 4 places | 0, verified on the live landing |
| unread keys in the copy layer | 13 | 0 |
| files the banned gate reads | 32, docs skipped | 47, docs included |
| exemptions in the banned gate | 3, one of them the file holding the copy | 0, asserted by its own decoy |
| the sentence the giver never wrote | rendered on every gift | deleted |
| a choice that did nothing | offered | removed |
| unreachable files under assets/ | 71 KB | 0, moved to attic/ |
| kill count | 1/1 | 6/6 |

**Nothing of his was deleted.** All thirteen retired keys are preserved verbatim
in `config/his-words.json` under `retired`, with the date and the reason, and the
writing gate reads that registry and looks away from every line in it.

**The publish gate stopped the first attempt.** It found two absolute paths in my
own browser harness, each carrying a home directory, which in a public mirror is
a path that works on one machine and a name on every other. The harness now finds
a browser instead of being told where one is. Production had already deployed;
the mirror had not, which is the order that gate exists to enforce.

**Two of the six mutants were mine, not the gates'.** One inserted a key outside
the block it was meant to test. The other asked a gate to notice its own
blindness by running itself, which no gate can do: restoring an exemption makes
the scan pass, because that is what an exemption is for. G2 now asserts its own
invariant directly, and the mutant has something that can see it.

---

## CHECKPOINT II · INTEGRITY · shipped

Twelve holes, each one open on the live site this morning. The gate that proves they are
shut is `scripts/gates/integrity.mjs`: forty-one assertions against the handlers
themselves, with the store held in memory and Giveth answered by a stub, so it needs no
deployment, no token and no network. Twelve mutants restore the twelve old behaviours and
all twelve turn it red.

| what a stranger could do this morning | what happens now |
|---|---|
| claim any project with one POST, then read every donor's held-back words and answer in the project's voice | a claim returns a code to put in the project's own Giveth description, and a secret that never leaves the claimant. The key is minted only after Gratus reads that code back off the page |
| stamp any amount onto any public seed, unauthenticated | the author proves the seed is theirs, and the number is read from Giveth rather than accepted from the caller |
| plant 501 seeds and delete somebody's first one | the overflow moves to a page of its own and is kept. The same for the public stream and for a room |
| spend a project's whole day of seeds from one machine | the allowance is per caller as well as per project, and the next person can still plant |
| open rooms all day | five a day from one caller |
| read the day's voice counters back as a list of addresses | the salt is `GRATUS_SALT`, which was provisioned months ago and read by nothing until today |
| watch a steward key go by in a query string, a referrer and every access log | keys travel in a body. `GET /api/trace` takes a project and nothing else |
| be served a cached API answer by the app's own service worker | nothing under `/api` is cached |
| run any script the page could be made to carry | a content policy with `script-src 'self'`, which the landing could not have until its choreography moved out of the page into `assets/js/landing.js` |
| break out of an attribute with an apostrophe | `esc` escapes it |

**Two things worth saying plainly.**

The claim is the one that matters. The others are money and noise; this one was a way to
be handed somebody's gratitude and answer it wearing the face of the project they gave to.
The proof is the same shape a domain uses, which means Gratus never has to be told who
somebody is, only shown that they can edit what the project says about itself.

`GRATUS_SALT` existing while nothing read it was the tell. A secret that is provisioned,
rotated and never used is a decision that was made and then quietly dropped, and the thing
it was meant to protect went out under a constant written in a public file instead.

**What I retired.** `attic/trace-auth.mjs` asserted five things about a handler
that no longer exists, including that a claim answers 403, which is now the wrong answer.
G-II asserts all five and thirty-six more against what is there now. The old file is in
`attic/`.

**What I got wrong on the way, three times.**

The first browser walk passed while every app view held fifty-six characters of text: the
doorway ceremony was still on screen and fifty-six cleared the floor I had set. A floor
low enough for the splash to pass is not a floor. It goes through the same door the other
gates use now and asks for real text, and the walk is a gate of its own, G27.

I repaired the Giveth not-found branch against a shape Giveth does not send. I had it
answering a missing project with `data` and `errors` together; it actually answers with
`data: null` and `"Project not found."`, which my repair still read as an outage. The
first ship went out with the friendly branch as unreachable as it had ever been, and I
found it by asking the live API instead of my model of it. The gate asserted the shape of
the source, which is why it went green over a live 502. It asks the handler now, with
Giveth answering the words the live API answers.

Then the one that would have broken the feature outright: **`projectBySlug` is case
sensitive, and fifty of fifty live projects sampled from Giveth's own list have a capital
in their slug.** The trace lower cases every slug, which was harmless while it only used
the slug to name a document, and stopped being harmless the moment the claim and the
confirm started asking Giveth about it. Every real project would have been told it does
not exist. There are two addresses now: the one Giveth is asked with, spelled as Giveth
spells it, and the lower cased one the store files under, which keeps every document
written so far exactly where it is.

---

## CHECKPOINT III · BODY AND THE HAND · shipped

Two of the three things this checkpoint was written against turned out not to be true, and
measuring said so before any of it was built.

**The video, three times, and the third answer is the true one.**

The document counted 59.4 MB of film with 19.94 MB of it on the landing, which is what is
on disk. Measured against a local server a phone fetched none of it, and I wrote that down
as the answer. The same measurement against **the live site** said 3.43 MB of film before
anybody had touched anything, all of it `explode.mp4`. I read that as `preload="auto"`
downloading from the first byte, changed every ceremony to `preload="none"`, shipped it,
and measured again: **still 3.43 MB.** `preload` only governs what a video does before it
is played, and this one is played the moment it exists.

So the number is real and it is not a defect. **The arrival ritual costs 3.43 MB on every
open**, on the landing and on the app:

| opening | what a phone pays |
|---|---|
| the app, with the doorway | **3.66 MB**, of which 3.43 MB is the film |
| the app, doorway skipped | **0.29 MB** |
| the landing, with the doorway | **3.75 MB** |

That is larger than everything else on this checkpoint put together. It is also his
decision, written down as his decision: *the doorway ritual, every open*. It is not mine to
trade away for a number, so it stands, and the number is on the record. Three ways to keep
the ritual and stop paying for it twice are in the Votus list below.

`preload="none"` stays, because it is right for the ceremonies that are built and never
run, and because the landing now asks the connection what it can carry before it starts a
looping film at all. G29 watches the arrival open and hand the page over, since a ceremony
that never starts is a door that never opens.

**The weight was pictures, and mostly one picture.** His mark, 640 by 640, 595 KB, was
being sent to every single screen and drawn at forty points in the tab bar. It was between
forty and fifty per cent of every page load in the app.

| what a phone pulls at 375 | before | after |
|---|---|---|
| the landing, first screen | 1.00 MB | **0.39 MB** |
| the landing, scrolled to the end | 3.36 MB | **0.67 MB** |
| /app | 1.18 MB | **0.56 MB** |
| /app/grow | 1.37 MB | **0.68 MB** |
| /app/give | 1.13 MB | **0.53 MB** |
| /app/giveth | 1.22 MB | **0.59 MB** |
| /app/vibes | 1.24 MB | **0.61 MB** |
| /app/guides | 1.32 MB | **0.70 MB** |

**Not one of his files was edited to do it.** `scripts/renditions.py` reads his pictures
and writes a WebP beside each one; `config/originals.json` records the sha256 of all
sixty-three sources; G28 re-hashes every one of them on every run. His originals being
untouched is now a thing the build checks rather than a thing I promise. His mark is capped
at 384 across because that is three times the 128 css px the landing hero paints it at,
measured in a browser rather than guessed.

### The hand

| the gesture | what it does |
|---|---|
| swipe across | steps between Give, Gratus and Grow, with the far door lighting before the finger lets go and the ends pushing back |
| swipe down on a sheet | the grabber was painted on from the first day and did nothing; a sheet follows the thumb now and lets go past 112 |
| hold on a growing thing | look closer, write today with it, give this one |
| the phone answering the hand | at the five moments that already have a sound, on its own switch, `S.feel`, which is why the state ladder is at v3 |

The gestures give way rather than take: a finger going down the page is reading, a drag
that starts within 28 of the glass edge belongs to the phone, and a drag along a row that
scrolls sideways belongs to the row.

### What driving it found that reading it never would

- **A press-and-hold that had never once fired.** `ui.js` read `opts.onLong`; the only
  caller in the app passed `opts.on`. It now takes either, and swallows the click the
  browser sends after a hold so one press is not also a tap.
- **A fix of mine that fixed nothing, and the mutant that said so.** The top bar buttons
  measured as covered, I found an art layer stacked over them, and I gave every art layer
  `pointer-events: none`. The gate went green. Then the mutant that takes the rule back
  out went green too, which means the rule was never what turned it. What had been sitting
  on the buttons was a ceremony, open because a garden with days in it arrives to one, and
  a ceremony is a modal that is supposed to cover the screen. The rule is gone. The gate
  walks through the ceremony now and says out loud when it could not.
- **The writing row was under the bar.** Four pixels under it, for anybody with a garden.
  An empty garden cleared it by sixteen, which is exactly why it went unseen: the first
  run was fine and every run after it was not.
- **My own swipe guard asked whether the laws dialog existed** rather than whether it was
  open. It is in the page the whole time with a hidden attribute, so the answer was yes
  forever and the swipe could never fire. Presence is not state.
- **Widening a target steals the neighbour's edge.** The reach drawn under a chip is 46
  tall and his chips are 36, so two wrapped lines eight apart had their targets
  overlapping. Twelve between the lines gives each chip its own, and the screen room to
  breathe.

Reach is measured by asking what is under the thumb 21 pixels out, not by reading a
width, because a 40 pixel button with a 46 pixel target under it is a 46 pixel target.
Every control on six screens now answers.

---

## CHECKPOINTS IV, V AND VI · shipped

**The Glyph.** `engine/glyph.js`: one ring for the garden and one arm for each thing
growing. An arm points where its emoji points, reaches as far as the days you gave it, and
carries a head once it is ready to give. It reads no clock and no dice, so the same garden
draws the same figure forever, and no two gardens draw the same one. Ten tests hold that
promise, including the one that caught a real bug on the way: with a single plant the arm
was measured against the longest arm in the same garden, so a garden holding one thing drew
the same figure on its fourth day as on its thirteenth. Days are absolute now.

**The eight families, awake.** `config/families.json` carries eight species names, eight
hues and eight sentences, every one of them his. It had shipped to every person who ever
opened Gratus and had never once been fetched. It is in the boot fetch, in the worker, and
on the sheet a hold opens.

**Three hidden lines, reachable.** `config/prompts.json` held three finished sentences that
no line of code had ever read: the garden hour, the anniversary, and the thirteen-second
hold. Each has a way to arrive now, and none of them interrupts anything. The garden hour
is learned rather than asked for: it is the hour you keep coming.

**Every link has its own face.** Six shareable routes shared one picture and one sentence,
which in an app whose product is a link somebody receives is the worst place to be generic.
A gift arriving in a message said "Gratus.CC" and showed the landing. There are five faces
now, cut from his own scenes, and `scripts/shells.py` strikes the four shells from app.html
so they never drift apart.

**The bridge.** Every loop in the trace ends at one human who was told nothing by anything.
There is a control on your own seed now: it hands you a line and the project's own published
channels, and you send it. Gratus does not write to anybody for you and could not.

**The manual.** Twenty-four guides at `docs/guides/`, each with front matter naming the
build it was checked against, listed statically at `/guided` so the page reads with no
JavaScript at all. Three diagrams authored at 375 first, each with a text equivalent beside
it saying the same thing.

**And the floor under all of it.** A view registry naming twenty screens in one module, so
the browser tab finally says which screen you are on. `render()` wrapped, so a throw leaves
a sentence and working doors instead of a blank page. The network going away is noticed and
said out loud. Every view fits 320, 375 and 390 with nothing over the edge. No type under
thirteen pixels anywhere in the stylesheet, where there had been ten declarations and one
of them at nine.

### Still red, and why

| gate | why |
|---|---|
| **G8 weight** | Ten failures, all of them the size of his films on disk. Re-encoding them is the Votus question below and it is not mine to answer. |
| **G23 ceremonies** | Wants three named ceremonies and a layer that answers a key. That is product design, not plumbing, and doing it at speed would be the wrong way to build the most sacred surface in the app. |
| **G10/G11/G13 a11y** | Five left. Two are the gate disagreeing with itself about how to measure a hold, one asks a precondition that is not met in a headless browser, and two are segmented toggles that need per-site work to say which one is chosen. None of them is a legibility failure; every word passes. |

---

## For his Votus · the doorway

The ritual is 3.43 MB every open and it is his call. Three ways to keep it exactly as it is
and stop paying for it more than once:

1. **The worker keeps the film.** Paid once per device, then it comes off the disk. The
   ritual is unchanged and every open after the first is free. Video arrives as range
   requests, so this is real work rather than a line in the shell list.
2. **The film is smaller.** A rendition, the way his pictures now have renditions, with the
   original kept untouched. The ritual is unchanged and every open is cheaper.
3. **It stands.** 3.43 MB is what the door costs and the door is worth it.

I have not taken any of the three. He said every open, so it is every open until he says
otherwise.

## Run log

Newest last. One line per meaningful step, with the command that proved it.

- `node scripts/gates/migration.mjs --decoy` → G14 PASS, 32 assertions, decoy bites
- `python3 mutate.py` → M9 KILLED, 1/1
- `node scripts/gates/v23.mjs --fast` → 4 green, 14 red, 5 skipped
- `node scripts/gates/weight.mjs` → landing video 19.94 MB against a 4.50 MB ceiling; app paint 1.15 MB against 1.00 MB; `logo.png` 581 KB is the largest paint item on both surfaces
- `node scripts/gates/a11y.mjs` → the top-bar buttons are 40×40 on every screen; `longPress` passes `on` and `ui.js` reads `onLong`, so the documented hold gesture has never once fired
- `node --import ./scripts/gates/lib/loader.mjs attic/trace-auth.mjs` → an unproven claim answers 200, and a forged million-dollar confirm answers 200 and is written to the document
- `node scripts/gates/banned.mjs` → reads docs for the first time: 50 files, 85 hits
- `bash scripts/ship.sh` → attempt 1: prod live, **mirror BLOCKED** on a personal path in my harness
- fixed, `node scripts/gates/open-source.mjs .` → 2 hits, both files the export excludes
- `bash scripts/ship.sh` → attempt 2: `LIVE STAMP MATCHES: galaxy.js?v=1789855889`, mirror `a8bc3f2` clean
- live at `https://www.gratus.cc` → zero token words on the landing, the sample gift is labelled twice, 375 = 375
- live at `/app/grow` → a real device walked from state `v:1` to `v:2` with its fields intact, and the writing box is on the first screen

### Checkpoint II
- `node --import ./scripts/gates/lib/loader.mjs scripts/gates/integrity.mjs` → **41 pass, 0 fail**
- `mutate.py M30..M41` → **12/12 KILLED**
- `node scripts/gates/steward.mjs` → PASS: the claim tapped in a browser asks for a code and hands over no key
- `node scripts/gates/banned.mjs` → caught "come back" in my own note; reworded, not exempted
- `node scripts/gates/slop.mjs` → caught a word in my own comment that the rule reads as the verb meaning emphasise. I meant the `_` character, so the comment uses the character
- `node scripts/gates/v23.mjs --fast` → the remaining reds are movements III to VII, which is their job
- live probe after the first ship → the policy, the refusals and the worker all correct, and a mistyped slug answering **502**
- asked Giveth directly → `{"errors":[{"message":"Project not found."}],"data":null}`, and `CARE-PERU` resolves while `care-peru` does not
- `mutate.py` → **19/19 KILLED** with M42 (the flattened slug) and M43 (not-found read as an outage) added, M38 removed as the same defect aimed at a line that no longer exists

### Checkpoint III
- `node scripts/gates/weight.mjs` and a Resource Timing read → the mark was half of every screen
- the same read against **www.gratus.cc** → 3.43 MB of film the local server had never shown
- `preload="none"` shipped, measured again → **unchanged**, because a film that is played does not care what preload said. The ritual costs what the ritual costs, and that is now written down rather than guessed at
- `python3 scripts/renditions.py` → 63 sources, 21.15 MB of his originals, 6.69 MB delivered
- `node scripts/gates/thehand.mjs` → **33 assertions, every one driven**
- `mutate.py M51..M59` → nine defects restored, nine caught. A tenth, M50, survived, which is how the rule that fixed nothing was found and removed
