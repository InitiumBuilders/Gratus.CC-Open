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
[ ] CHECKPOINT III BODY
[ ] CHECKPOINT IV  SACRED
[ ] CHECKPOINT V   BRIDGE
[ ] CHECKPOINT VI  GUIDED
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
The harness is `scratchpad/mutate.py`; it restores the file byte for byte and
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

**What I retired.** `scripts/gates/trace-auth.mjs` asserted five things about a handler
that no longer exists, including that a claim answers 403, which is now the wrong answer.
G-II asserts all five and thirty-six more against what is there now. The old file is in
`attic/`.

**What I got wrong on the way.** The first browser walk passed while every app view held
fifty-six characters of text: the doorway ceremony was still on screen and fifty-six
cleared the floor I had set. A floor low enough for the splash to pass is not a floor.
It goes through the same door the other gates use now and asks for real text, and the
walk is a gate of its own, G27.

---

## Run log

Newest last. One line per meaningful step, with the command that proved it.

- `node scripts/gates/migration.mjs --decoy` → G14 PASS, 32 assertions, decoy bites
- `python3 mutate.py` → M9 KILLED, 1/1
- `node scripts/gates/v23.mjs --fast` → 4 green, 14 red, 5 skipped
- `node scripts/gates/weight.mjs` → landing video 19.94 MB against a 4.50 MB ceiling; app paint 1.15 MB against 1.00 MB; `logo.png` 581 KB is the largest paint item on both surfaces
- `node scripts/gates/a11y.mjs` → the top-bar buttons are 40×40 on every screen; `longPress` passes `on` and `ui.js` reads `onLong`, so the documented hold gesture has never once fired
- `node --import ./scripts/gates/lib/loader.mjs scripts/gates/trace-auth.mjs` → an unproven claim answers 200, and a forged million-dollar confirm answers 200 and is written to the document
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
