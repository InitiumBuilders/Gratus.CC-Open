# Gratus · Next Moves

The roadmap, the open questions, and the answers already given. Updated with every ship. Newest thinking at the top of each list.

## The one loop

Write → plant → return → phase → recipe → give → the gift grows again.

Everything on this list either makes that loop clearer, safer or faster to feel, or it is a room off the loop and waits its turn.

## The next big moves

- **A Vibe should let you know it is alive.** Not a notification and not a presence word: a mark on the room's chip when there are words you have not read. This is the missing half of the return loop.
- **A Vibe's own Passage.** What the room grew together, as a link.


Gratus is a complete machine with almost nothing flowing through it. The constraint is not features: nothing leaves the app, so nothing brings anyone in, and nothing is waiting when you return. v18 attacks the first half.

- ~~**The Gratus Passage**~~ and ~~**a project's own page**~~ shipped in v18. What is still missing is the **reason to return**.
- ~~**Gratus Circles**~~ — set aside by his decision. Something like it may return later as **Gratus Guides** in a different shape; the name is now taken by the mission and vision room.
- ~~**Gratus Vibes**~~ shipped in v19: the small rooms, a code, a feed. This is the social half. What it still lacks is a reason to look in: nothing tells you the room has new words in it.
- **The Season** — a bounded thirty days with a theme, one shared garden, and an ending where everything grown is given.
- **Voice-first Gratus** — it reads the question aloud, you speak, it plants. Half of it already exists.
- **The first ten people.** No feature substitutes for this, and it is the honest top of the list.

## The Giveth arc

The full brief is in [docs/GIVETH.md](docs/GIVETH.md); the architecture and the six loops are in [docs/EMOTIONAL-TRACE.md](docs/EMOTIONAL-TRACE.md). Shipped in v15: loop one, the Emotional TRACE, and the "Nobody yet" lane of loop two.

- **G1. Owner verification.** A Gratus claim is first-come and light. Tie it to a verified Giveth project owner, or to a DeVouch attestation, so watering cannot be impersonated. The one thing we cannot do alone, and the first thing to ask Giveth for.
- ~~**G2. Confirm the gift.**~~ Done in v16. It is a lookup, not a proof of ownership: a hash is public. Ownership needs a signature, which this app does not ask for.
- ~~**G3. Rate limits.**~~ Done. Planting in v16 (240 per project per day, five-minute dedupe); the voice function in v20 (forty per device per day, six hundred in total, reserved before the call). What remains is a smaller size cap than six megabytes.
- **G4. Per-seed documents.** One document per project is last-writer-wins, and Vercel Blob takes a few seconds to become consistent, which widens that window. Split it into one document per seed when the stream grows.
- ~~**G5. The "I See You" mark.**~~ Done in v16: 🫶, with its own ceremony.
- **G6. Tell the project it was watered.** A steward has no way to know a bloom landed. A gentle receipt, without presence words.
- ~~**G7. Loops three to six.**~~ All shipped in v16. Loops 5 and 6 ship as a prompt and a read, which is the only form this app will carry them in.
- **G9. Offer the responsiveness reading to Giveth and DeVouch.** It exists now and nobody outside Gratus can see it.
- ~~**G11. A project's own Gratus page.**~~ Shipped in v18 at `/p/<slug>`.
- **G13. Tell the steward when a seed is published**, so they know they have something to post.
- **G12. Recurring and QF-aware giving.** Giveth has recurring donations and quadratic rounds; a seed could know it rode a matched gift.
- **G10. A steward has no way to know their water landed.** A receipt, without presence words.
- **G8. Send the pitch.** The pitch in GIVETH.md is written. It has not been sent to anyone at Giveth.

## Now (the next ship or two)

1. ~~**Protect the journal.**~~ Done in v12.1: export and restore live in the profile sheet. Next: a reminder to export after every tenth entry, until sync exists.
2. ~~**The first move must land.**~~ Done in v14: the home opens on Today's Gratitude and Write Today, his mockup text for text. Keep walking the empty state every ship.
3. ~~**Composer, second pass.**~~ Done in v13: a voice entry keeps its recording and gets its words through ElevenLabs. Next: the photo inside the garden orb; a limit on the voice function before wide traffic.
4. ~~**License.**~~ Done in v13: MIT for everything, code, art, video, song and words.
5. ~~**Desktop loops.**~~ Done in v13: the scene is a painting at its own size on a blurred wall of its own light; loops re-encoded at the source width. Next: a wider two-column reading of the Growth Book on desktop.

## Next

6. **Return design.** The home shows the day count of the plant closest to its next phase and what tomorrow's entry does for it. The question changes daily and never repeats within thirty days.
7. **Gift flow, end to end on two phones.** Give from one device, open on another, keep, and see it in the second garden with its history. Fix every rough edge found.
8. **Goals stream, second size.** Delete your own goal, a report control, per-goal blobs instead of one document once traffic asks for it.
9. **Accessibility pass.** Focus order through the sheets and rooms, labels on every icon button, the ritual skippable by keyboard, reduced motion checked on every ceremony.
10. **Share cards.** An image for a gift link so it lands well in a message: the emoji, the phase, the giver's name, on one of his scenes.

## Later

11. **Accounts and the cloud Gratus profile.** His answer: local for now; in a few updates, optional accounts with a cloud profile and sync. Design the profile first (name, mark, garden summary, what is public), then the sync (entries, plants, folders, recordings).
12. **One real project behind Give**, with one partner, with the flow that exists.
13. **Gratus Earth, Vault and World** as real data, in that order, one at a time.
14. **A reminder that does not nag**, if the answer below allows one.
15. **The Galaxy as a live graph** of gardens that chose to be seen.

## Questions for August

These change the shape of the work. Each one is a fork.

1. ~~**License.**~~ Answered: MIT, everything. Shipped in v13.
2. ~~**Identity.**~~ Answered: all local for now; accounts, a cloud Gratus profile and sync in a few updates. On the list as move 11.
3. **What giving means.** When you give a Gratus, does it leave your garden (the gift keeps moving) or does it stay with you and also grow with them? Today it stays. Your law says the gift must keep moving; I want the ruling, because it defines the whole Give tab.
4. **The stream's rules.** Goals are public and anonymous. What is not allowed, who removes it, and do you want a report control before more people arrive?
5. **How days count.** A plant grows only on days you write about that emoji. Should any journal day feed every plant instead? And should a missed day do anything at all, or is a Gratus never punished for silence?
6. **Reminders.** The house rule bans presence words like "come back". Is a single daily nudge at a time the person chooses welcome, or does Gratus never call anyone?
7. **Which room becomes real first.** Support a Project, Gratus Earth or the Vault? And with whom?
8. ~~**Desktop.**~~ Answered: first-class. The painting layout shipped in v13; the wider Growth Book is next.
9. ~~**Voice recordings.**~~ Answered: live. Recordings kept on the device and transcribed through ElevenLabs, shipped in v13. Open: should a recording ride inside a gift?
10. ~~**The name on the colophon.**~~ Answered: @BuiltByAugust, linked to x.com/BuiltByAugust. Shipped in v13.

## Questions I asked myself, and my answers

- **What is the one thing this app is?** A garden grown from gratitude that can be given. If a feature does not feed that sentence, it waits.
- **What must never happen?** Journal text leaving the device without an explicit give. A secret in the public mirror. A word nobody can read. Each has a gate now: the state design, `open-source.mjs`, and the readability audit plus the contrast gate.
- **Is the journal safe today?** Safer. It lives in one browser's storage, and since v12.1 it can be exported to a file and restored on any device. Sync, if it comes, comes after the identity question.
- **What does "backend later" mean in practice?** One function, one JSON document, last-writer-wins, named in a comment. It is the right size until the stream shows real traffic; then per-goal writes.
- **What breaks first at scale?** The goals document and the desktop video quality. Both are on this list.
- **How do we keep the scenes and still read every word?** Bright scene above, dark plate below, scrim bands where words cross the scene, dark glass under every control. Never white on bright. Verified by screenshot at 375 on every page, every ship.
- **How do we keep the public mirror clean forever?** Every rule in the gate has a decoy that must fire before a ship; the export is gated; the clone is gated. A new kind of secret means a new rule and a new decoy, the same day.

## New since his answers

19. **The intros and patience.** Give and Grow now open through a video every time, by his ask. Watch how it feels after a week of daily use; if it wears, play the intro once per open and keep the tap to enter.
20. ~~**The landing page in the new look.**~~ Done in v15: acts with one statement each, his card art, gold pills, the Emotional TRACE named.
21. **The console needs the app's own look.** It is functional and plain next to the rest.
23. ~~**Mobile overflow.**~~ Fixed in v17 and measured on every page. The rule to keep: any grid or flex child that holds text needs `min-width: 0`, or it refuses to shrink and widens the whole document.
24. **A written overflow gate.** The audit that found these was run by hand. Make it a script so a future ship cannot reintroduce them.
22. **A seed should be withdrawable.** Once planted it cannot be taken back, from either side.

16. ~~**The voice function needs a limit.**~~ Shipped in v20: forty recordings per device per day, six hundred across everyone, reserved before the call to ElevenLabs. Still open: a size cap smaller than six megabytes, and the key itself should be rotated, because it was once pasted into a chat window.
17. **Recordings in the export.** The JSON export leaves recordings behind. Add a second export that packs them, or include them as data URLs when small.
18. **Milestones as ceremonies.** A lit milestone is a toast today. Give the big ones (seven days in a row, Bloomed, first gift) the Gate's light.

## Done this arc

- v7 to v13 in one day: his mockups, his scenes, the Gate, the scene layer, readable type, the core in the bar, open source with a gated mirror, the docs, voice, the journal's rooms, the desktop painting, MIT.
