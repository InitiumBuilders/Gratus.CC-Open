# Contributing to Gratus.CC

Gratus means honor. That applies to the code too.

## The short version

1. Fork it, branch from `master`, and open a pull request.
2. Run the gates before you push: `bash scripts/ship.sh` runs them, or `node scripts/gates/v23.mjs --fast` runs everything that does not need a browser.
3. A green gate proves nothing on its own. If you fix something, add the check that would have caught it, then break your own fix on purpose and watch the check go red. `scripts/gates/` is full of examples.

## What this repository is

A gratitude journal that grows an emoji garden, and a way to give a gift made of days.
It is local-first: what somebody writes stays on their device unless a gift, a seed, a goal
or a room carries it somewhere by design. Nothing else leaves.

There is no build step. Static files, ES modules, and a handful of serverless functions.
Open `index.html` and it runs.

## Things that are not up for debate

- **Journal text stays on the device.** If a change moves somebody's private writing to a
  server, it is the wrong change, however convenient.
- **No streaks, no scores, no ranks, no points.** `config/copy.json` holds the list of
  words this product does not say, and a gate reads that list. Nothing decays here and
  nobody is ranked against anybody.
- **August's words are his.** Anything marked `owner` in a config file, and every line in
  `config/his-words.json`, is left exactly as written. The writing gates know the
  difference and so should you.
- **No secrets in the tree.** The publish gate checks, and it checks against decoys.

## The gates

Every claim this project makes about itself has a gate behind it, and every gate has a
mutant that must turn it red. If you are adding behaviour, add the mutant too. A test that
cannot fail is a sentence, not a test.

## Style

Match what is already there. Small modules, plain names, comments that say why rather than
what. If a comment explains what the line does, the line needs rewriting instead.
