# The Emotional TRACE

**Begin → Become → Bridge → Bloom**

> Giveth's TRACE follows the money. This one follows the human energy behind it.

Shipped in v15. Live in the app at **Give → Give with Giveth**.

## Why this loop, and not another

Read through Donella Meadows: Giveth has solved the *financial* information flows beautifully. Zero fees, on-chain tracking, GIVbacks, quadratic rounds. What the system is missing is not information about money; it is **a feedback loop carrying meaning back to the giver and morale forward to the maker**.

A donation today is mathematically perfect and emotionally silent. That silence is the leverage point. It is also cheap to fix: the loop needs no new capital, no new chain and no permission. It only needs somewhere for a sentence to travel, and somewhere for the answer to land.

The paradigm shift the loop makes possible: from **transactional altruism**, which depletes the giver, to **regenerative altruism**, where giving loops back and feeds the giver's own ecosystem. That is why this one comes first. Everything else on the list is downstream of it.

## The four movements

### Begin · the Gratus Seed
Inside Give, a person chooses a Giveth project and writes a few words about why they are giving. They give on giveth.io, in their own wallet. Back in Gratus they plant the seed: the words, their name if they want one, the project, and optionally the transaction hash. The confirmation reads **"Capital sent. Seed planted."** A dormant 🌱 appears in their garden.

### Become · the soil
The project's stewards open the Project Console. Beside the capital arriving through Giveth, they see a feed of seeds: who gave, when, whether it is on chain, and why. **The capital funds the project. The seeds fund the morale.**

### Bridge · the water
A steward taps **Water this seed** and writes one line back. *"This means the world to us, we just bought the servers."* Twenty seconds.

### Bloom
The reply reaches the donor's app. The dormant 🌱 opens into an emoji chosen by that project's own Giveth category, the reply is kept inside it forever, and the moment plays through the Gate's light like every other ceremony in Gratus. A permanent, visual proof of connection.

## The shape in this codebase

Gratus is a static, local-first progressive web app: vanilla ES modules, no build step, no framework and no database. The architecture below is the same one described in Next.js and Prisma terms; only the materials differ. The Prisma schema is kept at the end of this file as the reference model for when accounts and the cloud profile arrive.

### Data

Two records, one document per project in Vercel Blob at `gratus/trace/<slug>.json`:

```js
{
  claim: { hash, at } | null,        // sha-256 of the project key. The key itself is never stored.
  seeds: [{
    id, project, title,              // the Giveth slug and title
    message, name, emoji, bloom,     // the seed, its author, and what it becomes
    tx, at, status,                  // 'dormant' | 'bloomed'
    water: { reply, from, at } | null
  }]
}
```

On the donor's device, `S.seeds[]` in `localStorage` holds their own copy plus the project slug and image. The device is the source of truth for *their* garden; the blob is the source of truth for *the project's* feed.

### The function · `api/trace.js`

| Call | What it does |
|---|---|
| `GET ?project=<slug>` | The project's feed, newest first, up to 80. |
| `GET ?project=<slug>&ids=a,b` | Just those seeds. The donor's bloom check. |
| `POST {act:'plant', project, title, message, name, tx, bloom}` | Begin. Returns the seed. |
| `POST {act:'claim', project}` | Issues a project key **once**; stores only its hash. Refuses if already claimed. |
| `POST {act:'water', project, seed, reply, from, key}` | Bridge. Verifies the key against the stored hash, sets `status: 'bloomed'`. |

Writes are last-writer-wins on one document per project, which is the right size while the stream is small. Per-seed documents are the next size up and are on the roadmap.

### The window onto Giveth · `api/giveth.js`

Read-only, no key, five-minute edge cache, against `https://mainnet.serve.giveth.io/graphql`. Lanes: GIVbacks, Boosted, Nobody yet, All. Full mapping in [GIVETH.md](GIVETH.md).

### The components

| In the prompt | In this app |
|---|---|
| `<GratusDonationModal/>` | `seedSheet(project)` — the seed field, the name, the optional tx, "Give on Giveth ↗" and "Capital sent · plant the seed". |
| `<ProjectSeedFeed/>` | `viewConsole()` at `/app/console` — slug, key, claim, and the feed of seeds. |
| `<WaterSeedButton/>` | `waterSheet(seedId)` — the seed, a reply field, "Send it · their seed blooms". |
| `<GratusGarden/>` | `traceBlock()` in the garden room — dormant seeds as 🌱, bloomed as the project's emoji, each opening `mySeedSheet()` with both messages. |
| State management | `S.seeds` in `localStorage`; `checkBloom()` polls the trace for dormant seeds 1.5s after boot and plays a ceremony for anything newly watered. |

### The bloom emoji

Chosen from the project's own Giveth category, so a bloom says something true about the work: environment 🌳, nature 🌿, water 💧, food 🌻, animals 🦋, education 📚, health 🩺, art 🎨, technology ⚡, community 🤝, equality 🕊️, research 🔬, housing 🏡, finance 🔆, and 🌻 when a project has no category we know.

## What we promise the people using it

- **A seed is public to that project.** The app says so before anyone writes one. Write what you would say to their face.
- **A journal entry is a different thing** and never leaves the device.
- **No wallet is ever requested.** A transaction hash is optional and already public on chain.
- **Gratus holds no money** and takes no fee. Giving happens on giveth.io.
- **Claiming a project is light, not verification.** First-come, key-based, and honest about it in the interface. Tying it to a verified Giveth owner is the first open item.

## Known limits, named

1. **Claim impersonation.** Anyone can claim an unclaimed slug first. Mitigation today: it is stated plainly, and a claim cannot be transferred or re-issued. Fix: Giveth-side owner verification, or a DeVouch attestation.
2. **One document per project** means a burst of seeds could drop one. Fix: per-seed documents.
3. **No rate limit on planting.** Fix before this is shared widely, alongside the voice function's allowance.
4. **The donation and the seed are not cryptographically linked.** The tx hash is typed in by hand and unverified. Fix: read the donation back from Giveth's API by hash and mark the seed confirmed.
5. **A seed cannot be withdrawn** once planted. Fix: a delete, with the project's copy going too.

## The six loops

This is the full list, in the order we would build them. One is shipped.

### 1 · Emotional TRACE — shipped, v15
Begin, Become, Bridge, Bloom, as above.

### 2 · The "I See You" catalyst — lane shipped, mark next
In any decentralised network, the critical points are the under-resourced nodes at the edges. Our **Nobody yet** lane queries Giveth's newest projects and keeps only those with zero donors. The next step: when a person's seed is the first a project ever receives, that seed blooms into a rare hand-sign mark, and the app records that they brought visibility to something unseen. **The leverage is in the query, not the reward:** ranking algorithms bury new projects, and one lane reverses that for anyone who opens it.

### 3 · Human-in-the-loop reputation
The count of seeds a project receives, and the share of them it waters, is a qualitative signal that money cannot buy and volume cannot fake: it requires a person to read and write back. Offered to Giveth for GIVbacks review, and to DeVouch as an attestation. **Guard:** this must never become a rank or a leaderboard. The house gate already refuses those words. It is a responsiveness reading, shown to the project itself first.

### 4 · Harmonic emoji alchemy
Recipes that need action on both sides of the person: giving *and* the inner work. A gift to a regenerative project plus three days of entries makes 🌍✨. Gratus already has sixty recipes and an evolution engine; this adds cross-system conditions to them. Proof-of-growth, not proof-of-purchase.

### 5 · Circular Gratus flow
A toggle where a share of GIVbacks yield is routed to projects that your project publicly thanked in a Gratus note. Capital flowing along lines of gratitude instead of isolated choices. **Blocked on:** custody and automation, which Gratus does not do today. Design it as a prompt, not a transfer: Gratus suggests, the person signs.

### 6 · GIVgarden cross-pollination
Taking part in Giveth's governance acts as sunlight in the personal garden, accelerating evolution arcs. Needs a read of on-chain governance participation, which is the heaviest lift on this list and the least load-bearing. Last.

## Reference: the Prisma model

For the cloud profile, when accounts land. Semantics identical to the blob model above.

```prisma
model GratusSeed {
  id            String        @id @default(cuid())
  projectId     String        // Giveth project id
  projectSlug   String
  projectTitle  String
  walletAddress String?       // optional; Gratus never requires one
  donorName     String?
  transactionHash String?     @unique
  message       String        @db.Text
  bloomEmoji    String        @default("🌻")
  status        SeedStatus    @default(dormant)
  createdAt     DateTime      @default(now())
  water         GratusWater?
  @@index([projectSlug, status])
}

model GratusWater {
  id           String     @id @default(cuid())
  seedId       String     @unique
  seed         GratusSeed @relation(fields: [seedId], references: [id], onDelete: Cascade)
  replyMessage String     @db.Text
  fromName     String?
  createdAt    DateTime   @default(now())
}

model ProjectClaim {
  projectSlug String   @id
  keyHash     String                 // sha-256 of the key; the key is shown once
  createdAt   DateTime @default(now())
}

enum SeedStatus { dormant bloomed }
```

Creating a `GratusWater` sets its seed to `bloomed`; in this codebase that is one write inside `api/trace.js`, in Prisma it is a transaction.
