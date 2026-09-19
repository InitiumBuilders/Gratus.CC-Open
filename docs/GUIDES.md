# Guides

Two guides: one for people who use Gratus, one for people who build on it.

## Using Gratus

### Your first day

1. Open [gratus.cc](https://www.gratus.cc) and tap **Plant My Gratus**. The doorway plays, the light fills the screen, and the garden opens behind it. Tap anywhere to enter early.
2. On **Grow**, answer today's question in the entry box. Pick the emoji you are planting and any tags that fit. Tap **Plant My Gratus**.
3. Watch the planting ceremony. Your emoji is now Planted in your garden on the **Gratus** tab.

### Growing

A plant grows on the days you write about it. Write about the same emoji tomorrow and it moves toward Nurtured (day 2), then Deepened (day 5), Bloomed (day 9) and Ready to Give (day 13). The Growth Book on the Gratus tab shows every phase, what it means, and how many days until the next one.

Two emojis that appear together on three or more days make a recipe. Sixty recipes are waiting in the Growth Book under Recipes; the ones you have made are lit. You can add your own emojis and recipes there, and they stay on your device.

### Your journal

The Growth Book's Journal tab holds every entry by day, the last thirty days as a band, and a search box. Your entries never leave your phone unless you put them in a gift.

### Gratus Goals

On Grow, under the entry, write what you are growing toward and post it. Your goals appear in the stream with everyone else's. Post as many as you like. Without a connection your goals wait on the device and post when you are back.

### Giving

On **Give**, choose **Give a Gratus Gift**, pick a grown plant and write a message. The link you get holds the whole journey. Send it any way you like. Whoever opens it first walks the journey and chooses how to keep it.

Opening a gift someone sent you: the link opens the journey directly. At the end, tap **Keep it** and it is planted in your garden with its history.

### The song

His song, A Sacred Place, plays when the app opens. The speaker button in the top bar mutes it, and the app remembers your choice.

### Install it

- **Android, Chrome:** menu, then **Add to Home screen** or **Install app**.
- **iPhone, Safari:** Share, then **Add to Home Screen**.

Gratus then opens full screen and works offline.

### Privacy

The journal lives in your browser's storage on your device. Clearing site data removes it. A gift link contains the plant and the message you chose to put in it, and nothing else. Posted goals are public. Read the [privacy page](https://www.gratus.cc/privacy).

## Building on Gratus

### Run it

```bash
npx -y http-server . -p 4747 -c-1
```

Open `http://localhost:4747/app.html?dev=1&nosplash=1`. `dev=1` skips the service worker and shows the dev panel; `nosplash=1` skips the ritual; `tab=grow|give|book|galaxy|vault|earth|world|projects` lands on a page. The landing page is `index.html`.

### Change the words

Questions and the twelve laws are in `config/prompts.json`. Locked copy such as the colophon is in `config/copy.json`. Lines marked as his stay as written.

### Add a scene

Drop a JPEG in `assets/art/gfx/` named `gNN.jpg` and add its name to the page lists in `SCENES` in `assets/js/galaxy.js`. For a video, add `name.mp4` and `name-poster.jpg`, with a name starting in `v` or `d`; the layer plays it muted and looped. Loops are made with ffmpeg: slow the clip, then concatenate it with its reverse so it never cuts.

### Add a phase, an evolution or a recipe

- Phases: `config/growth-book.json` (name, day, meaning).
- Evolution arcs: `config/evolutions.json` on the schedule 0, 3, 8, 21, 55.
- Recipes: `config/recipes.json` (two emojis, a result, a category, a line). A recipe is made when the two emojis share at least three entry days.

Run the tests after any change to the configs.

### Type and colour

`assets/css/tokens.css` holds every token. Inks are white; mint is for growing and labels; gold for giving. Add new text with the existing roles (`.lead`, `.body`, `.cap`, `.kicker`, `.label`, `.statement`). A kicker whose text ends with a full stop reads as a sentence automatically. Never set text in alpha and never under 14px; the contrast gate and the readability audit will catch it.

### Gates

```bash
node --test scripts/tests/*.test.mjs
node scripts/gates/contrast.mjs
node scripts/gates/banned.mjs
node scripts/gates/open-source.mjs . --decoy
```

All four run inside `scripts/ship.sh`. A red gate stops the ship.

### Ship

`bash scripts/ship.sh "what changed"` from a login shell with the Vercel CLI on the path. It stamps, commits, deploys, refutes the live stamp, and mirrors a clean export to the public repository. Set `GRATUS_PUBLIC_REPO` to point the mirror somewhere else.

### The goals stream

`api/goals.js` needs `BLOB_READ_WRITE_TOKEN` in the Vercel environment. Set it with `vercel env add`; never write it into a file in the tree. The open-source gate blocks any token shape it knows.

### Adding a rule to the open-source gate

Add a `[name, regex, decoy]` row to `RULES` in `scripts/gates/open-source.mjs`. The decoy is a line that must trip the rule; `--decoy` refuses to pass until it does. A rule without a decoy is a rule nobody has proven.
