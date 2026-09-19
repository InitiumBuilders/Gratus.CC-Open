# Gratus.CC

**Grow Gratus Give**

> Gratus means honor.

Gratus.CC is a gratitude journal that grows a garden. You write what you are grateful for, plant an emoji for it, and the emoji grows a phase for every day you return to it. Two emojis that share enough days make a recipe. A grown emoji can be given: a Gratus Gift carries its whole journey inside the link, and whoever opens it can keep it growing in their own garden.

There are no accounts and nothing to buy. Your journal stays on your device. The only thing that leaves it is what you choose to give, the Gratus Goals you choose to post, and the Gratus Seeds you plant with a donation.

Gratus also carries **the Emotional TRACE**, built on [Giveth](https://giveth.io): give to a real project, plant a seed in your own words, and when the people who run it write back, the seed blooms in your garden. See [docs/GIVETH.md](docs/GIVETH.md).

Live at [www.gratus.cc](https://www.gratus.cc) and [grow-gratus-cc.vercel.app](https://grow-gratus-cc.vercel.app). It installs as an app on Android and iPhone.

## The three doors

| Tab | What happens there |
|---|---|
| **Grow** | Today's question; your entry in words, a photo or your voice (kept on the device, and turned into words through ElevenLabs); the emoji you are planting; tags; your Gratus Goals with the shared stream. |
| **Gratus** | Your garden, the Growth Book (entries, threads, folders, milestones; phases, emojis, recipes), and the Gratus Galaxy. |
| **Give** | Give with Giveth and plant a Gratus Seed, give a Gratus Gift, support a project, or send a wish to tomorrow. The gifts you gave and received. |

The whole app opens through one ritual: the doorway video plays until its light fills the screen, the light holds, and the app fades in behind it. Every page stands on one of his scenes, a still or a looping video, chosen by how many times you have opened the app.

## How a Gratus grows

| Phase | Day |
|---|---|
| Planted | 0 |
| Nurtured | 2 |
| Deepened | 5 |
| Bloomed | 9 |
| Ready to Give | 13 |

A plant only grows on days you write about it. Sixty recipes live in `config/recipes.json`; a recipe is made when its two emojis share at least three entry days. You can add your own emojis and recipes in the Growth Book, and they stay on your device.

## Run it

No build step. Any static server at the repo root works:

```bash
npx -y http-server . -p 4747 -c-1
```

Then open `http://localhost:4747/app.html?dev=1`. The static server has no rewrites, so use `app.html` directly; on Vercel the routes are `/app`, `/app/grow`, `/app/give`, `/app/book`, `/app/galaxy` and `/gift`. Add `&nosplash=1` to skip the opening ritual while you work, and `&tab=grow` (or `give`, `book`, `galaxy`, `vault`, `earth`, `world`, `projects`) to land on a page. `dev=1` also skips the service worker so you always see fresh files.

The shared Gratus Goals stream is one Vercel function, `api/goals.js`, backed by a Vercel Blob store. Without a `BLOB_READ_WRITE_TOKEN` in the environment the app shows the seed goals, marks them "as imagined", and keeps your goals on the device until it can post them. Nothing else needs a server.

## Layout

```
app.html            the app shell: scene layer, view, the bar, splash, rooms, sheets
index.html          the landing page, on the same scene and the same ritual
assets/js/galaxy.js the app (vanilla ES module, no framework)
assets/js/ui.js     sheets, holds, toasts, dates
assets/css/         tokens.css (colour, type, controls) and galaxy.css (the app)
engine/             gratus.js (laws, questions, first emoji), emoji.js, rng.js
config/             growth-book, recipes, families, evolutions, emoji names, prompts, copy
assets/art/gfx/     his 30 scenes, the boomerang loops, the doorway and its light, the logo
assets/audio/       his song, A Sacred Place
api/goals.js        the shared goals stream
api/giveth.js       a read-only window onto Giveth's public API
api/trace.js        the Emotional TRACE: seeds, claims, water
api/voice.js        speech to text through ElevenLabs; the key lives only in the environment
assets/js/keep.js   recordings, kept on the device in IndexedDB
scripts/            ship, gates, tests, the open-source publisher
docs/               pitch, architecture, features, guides, evolutions, image prompts
```

## Gates and tests

```bash
node --test scripts/tests/*.test.mjs        # the engine: phases, recipes, gifts, migration
node scripts/gates/contrast.mjs             # every ink on every surface, computed from tokens.css
node scripts/gates/banned.mjs               # words and patterns this house never ships
node scripts/gates/slop.mjs                 # machine writing in my prose, never in his
node scripts/gates/slop.mjs --decoy          # proves it still bites, and that his words are safe
node scripts/gates/open-source.mjs . --decoy  # the publish gate proves every rule still fires
```

`scripts/ship.sh "message"` runs all of them, stamps the entry script so no browser keeps an old app, commits, deploys to production, refutes the live stamp against the one it just wrote, and then mirrors a clean export of the tree to this public repository. The mirror is gated twice: once on the export, once on a fresh clone of what was pushed. Secrets, environment files, Vercel state and personal paths never enter the export.

## Docs

- [Pitch](docs/PITCH.md): what Gratus is for and why it is built this way
- [Gratus × Giveth](docs/GIVETH.md): what Giveth built, what we use, the pitch to them, and how to start on either side
- [The Emotional TRACE](docs/EMOTIONAL-TRACE.md): Begin, Become, Bridge, Bloom, with the data model and the six loops
- [Architecture](docs/ARCHITECTURE.md): the scene layer, the ritual, state, growth, gifts, the goals stream, shipping
- [Features](docs/FEATURES.md): everything in the app, and what is still imagined
- [Guides](docs/GUIDES.md): for people who use it and people who build on it
- [Evolutions](docs/EVOLUTIONS.md): every version, what changed and why
- [Next Moves](Gratus-Next-Moves.MD): the roadmap and the open questions
- [Decisions](DECISIONS.md), [Build notes](BUILD-NOTES.md), [Lessons](LESSONS.md): the working record
- [Image prompts](docs/IMAGE-PROMPTS.md): the prompts behind the scenes still to be made

## Open source

August's own lines are listed in `config/his-words.json`, and the writing gate reads that file and looks away from every one of them. See [docs/REFINEMENT.md](docs/REFINEMENT.md) for how the polish is done and the prompt to run it again anywhere.

This repository is the public mirror of the app that runs at gratus.cc. Every push passes `scripts/gates/open-source.mjs`. If you find anything in here that should not be, open an issue and it will be removed the same day.

MIT, for everything in the repository: the code, the art, the video, the song and the words. See [LICENSE](LICENSE). Built by [@BuiltByAugust](https://x.com/BuiltByAugust).

## Colophon

Gratus.CC

a Davara Distinct Bio-symbolic illuminate glow build · twelve laws, one new world

9/2/2026 · [@BuiltByAugust](https://x.com/BuiltByAugust)

Journal Every Day. Give Gifts The Grow.

Gratus In Motus. Gratitude In Motion. Give Gifts That Grow. Gratus Gives.
