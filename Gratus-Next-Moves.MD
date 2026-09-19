# Gratus · Next Moves

The roadmap, the open questions, and the answers already given. Updated with every ship. Newest thinking at the top of each list.

## The one loop

Write → plant → return → phase → recipe → give → the gift grows again.

Everything on this list either makes that loop clearer, safer or faster to feel, or it is a room off the loop and waits its turn.

## The Giveth arc

The full brief is in [docs/GIVETH.md](docs/GIVETH.md); the architecture and the six loops are in [docs/EMOTIONAL-TRACE.md](docs/EMOTIONAL-TRACE.md). Shipped in v15: loop one, the Emotional TRACE, and the "Nobody yet" lane of loop two.

- **G1. Owner verification.** A Gratus claim is first-come and light. Tie it to a verified Giveth project owner, or to a DeVouch attestation, so watering cannot be impersonated. The one thing we cannot do alone, and the first thing to ask Giveth for.
- **G2. Confirm the gift.** Read the transaction back from Giveth's API by hash and mark the seed confirmed, so the seed and the capital are actually linked.
- **G3. Rate limits.** Planting, watering and the voice function all need a per-device allowance before this is shared widely.
- **G4. Per-seed documents.** One document per project is last-writer-wins; split it when the stream grows.
- **G5. The "I See You" mark.** When a seed is the first a project ever receives, bloom it into a rare hand-sign mark.
- **G6. Tell the project it was watered.** A steward has no way to know a bloom landed. A gentle receipt, without presence words.
- **G7. Loops three to six**, in the order set out in EMOTIONAL-TRACE.md: reputation signal, emoji alchemy, circular flow, GIVgarden cross-pollination.
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
22. **A seed should be withdrawable.** Once planted it cannot be taken back, from either side.

16. **The voice function needs a limit.** It is public and spends his ElevenLabs credit. Add a per-device daily allowance and a size cap smaller than six megabytes before the app is shared widely.
17. **Recordings in the export.** The JSON export leaves recordings behind. Add a second export that packs them, or include them as data URLs when small.
18. **Milestones as ceremonies.** A lit milestone is a toast today. Give the big ones (seven days in a row, Bloomed, first gift) the Gate's light.

## Done this arc

- v7 to v13 in one day: his mockups, his scenes, the Gate, the scene layer, readable type, the core in the bar, open source with a gated mirror, the docs, voice, the journal's rooms, the desktop painting, MIT.
