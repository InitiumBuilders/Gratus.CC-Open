---
title: What leaves your device
audience: anyone
time: 3 min
updated: 2026-11-25
verified-against: next/paxt, 2026-11-25
---

**Your journal stays on your device.** Entries, photos, recordings, and the time each entry
was written live in your browser's own storage.

These travel, each only because you chose it:

- **A gift.** Everything is inside the link: the emoji, its days, your message, and one
  line from your journal for each phase it passed. You decide who gets it.
- **A seed.** Words written to a project you gave to. Public only if you publish them.
- **A goal.** One line on a public stream. The app says so before you post.
- **A word in a room.** Read by whoever holds the room's code.
- **A PAXT you open or join.** The text and every signed line, with the name you chose (or
  none), readable by anyone with its link. The key that signs stays on your device.
- **An answer to a signal.** One choice per device, kept under a token your device makes for
  that signal alone. The app shows counts and never who chose what, though in a small group
  the final counts can show how someone chose.
- **An account**, if you make one. A copy of your garden, encrypted on your device before
  it is sent. Nobody else can read it, and a lost password cannot be reset.

**What the server keeps.** Seeds, room posts, goals, account records, PAXT records, signal
answers and counters. Counters are keyed by a salted hash of an address, never an address.
Each answer and each PAXT line also leaves a marker under that hash for the day's limits.
Someone holding both the store and our secret could match a marker's time to what was sent
and work out which network sent it. Markers from earlier days are deleted with the first
call of each new day.

**Voice** sends one recording at the moment you make it, to be turned into text. It is not
kept there.

**Clearing your browser's storage erases the garden.** Export from the You sheet for a copy
you keep.
