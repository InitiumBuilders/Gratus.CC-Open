# Gratus × Giveth

> Giveth moves the capital. Gratus carries what the capital was for.

This is the working brief for our integration with [Giveth](https://giveth.io): what they built, what we use, what we offer back, and how to get started on either side. Everything here was read from their live API, their docs and their repositories in September 2026. Where a number moves, the app reads it live rather than repeating it.

- Their code: [github.com/Giveth](https://github.com/Giveth) · Their docs: [docs.giveth.io](https://docs.giveth.io) · Their app: [giveth.io](https://giveth.io)
- In Gratus: **Give → Give with Giveth**, or [gratus.cc/app/giveth](https://www.gratus.cc/app/giveth)

## 1. What Giveth is

Giveth is a community building the future of giving with blockchain. A person gives to a project directly, on chain, and **Giveth takes no fee**: the whole donation reaches the project. There is no custodian in the middle and no platform cut. Most of their stack is open source and MIT licensed, the same license this app now carries.

At the time of writing their public API reports **7,736 projects**.

## 2. The building blocks

These are the pieces worth knowing before building anything on top.

| Block | What it is | Why it matters to us |
|---|---|---|
| **Projects** | A page with a story, a set of recipient addresses across chains, categories and a donation button. | The unit everything else hangs off. A Gratus Seed is planted against a project's slug. |
| **Verified** | A project reviewed by Giveth's team. | Trust signal we show, never invent. |
| **GIVbacks Eligible** | A verified project that is also a public good. Its donors get GIV back. Approved on **action and impact**, **reputation**, and being a **public good**; the badge lapses after three months of project silence. | The default lane in our room. A lapsing badge is itself a feedback loop: it rewards projects that keep talking, which is exactly what the TRACE asks them to do. |
| **GIVbacks** | Give to a GIVbacks-eligible project and a share of GIV flows back to you. | Giving is already circular there. Our Circular Gratus Flow (below) extends it. |
| **GIVpower** | Stake GIV to boost a project: it rises in the listing and its donors receive more GIVbacks. | The `boosted` lane in our room sorts by GIVPower. |
| **GIVstream / GIVfarm** | A continuous flow of GIV to people who take part, running to 23 December 2026, and a return for locking GIV up. | Context for anyone arriving from Gratus. |
| **GIVgarden** | Where GIV holders steer the commons. | The cross-pollination idea below. |
| **Quadratic funding rounds** | Many small gifts attract more matching than a few large ones. | Makes small, sincere giving structurally powerful. That is the shape of Gratus. |
| **DeVouch** | Vouching for projects through on-chain attestations, so verification does not rest on one team. | The natural home for a Gratus reputation signal later. |
| **Chains** | Ethereum, Gnosis, Polygon, Optimism, Base, Celo, Arbitrum, ZKEVM, Solana, Stellar. | We never touch a chain; we link out. |

### Their repositories, the ones that matter

| Repo | What it does |
|---|---|
| [`impact-graph`](https://github.com/Giveth/impact-graph) | The GraphQL API behind every project page. Node, TypeScript, Apollo, PostgreSQL, TypeORM, Redis, Bull, IPFS via Pinata. MIT. **This is what Gratus reads.** |
| [`giveth-dapps-v2`](https://github.com/Giveth/giveth-dapps-v2) | The giveth.io front end and the GIVeconomy apps, in one repo. |
| [`giv-token-contracts`](https://github.com/Giveth/giv-token-contracts) | The GIV token and the GIVeconomy contracts, Solidity. |
| [`givback-calculation`](https://github.com/Giveth/givback-calculation) | How GIVbacks are worked out for donors. |
| [`qf-calculator`](https://github.com/Giveth/qf-calculator) · [`qf-dashboard`](https://github.com/Giveth/qf-dashboard) | Quadratic funding maths and the round results dashboard. |
| [`DeVouch-BE`](https://github.com/Giveth/DeVouch-BE) · [`DeVouch-FE`](https://github.com/Giveth/DeVouch-FE) | Decentralised vouching through attestations. |
| [`notification-center`](https://github.com/Giveth/notification-center) | Their notification microservice. |
| [`analytics-dashboard`](https://github.com/Giveth/analytics-dashboard) | Analytics over Giveth data. |
| [`giveth-docs`](https://github.com/Giveth/giveth-docs) | The docs site. |

## 3. What Gratus uses, exactly

One read-only function, [`api/giveth.js`](../api/giveth.js), against their production GraphQL endpoint `https://mainnet.serve.giveth.io/graphql`. No key, no account, no write, and no wallet ever passes through it. Responses are cached at the edge for five minutes.

```graphql
query($limit:Int,$skip:Int,$searchTerm:String,$filters:[FilterField!],$sortingBy:SortingField){
  allProjects(limit:$limit, skip:$skip, searchTerm:$searchTerm, filters:$filters, sortingBy:$sortingBy){
    totalCount
    projects{ id title slug verified isGivbackEligible descriptionSummary image
      totalDonations countUniqueDonors categories{ name mainCategory{ title } } }
  }
}
```

The lanes in the Gratus room map onto their API like this:

| Lane | Query |
|---|---|
| **GIVbacks** | `filters: [IsGivbackEligible]`, `sortingBy: GIVPower` |
| **Boosted** | `filters: [Verified]`, `sortingBy: GIVPower` |
| **Nobody yet** | `sortingBy: Newest`, then kept only where `countUniqueDonors === 0` |
| **All** | `sortingBy: BestMatch` when searching, `MostLiked` otherwise |

A single project comes from `projectBySlug`. The donate link is `https://giveth.io/donate/<slug>` and the project page is `https://giveth.io/project/<slug>`.

Four more reads, added in v16:

| Call | Their query | What it is for |
|---|---|---|
| `q=confirm&slug=&tx=` | `donationsByProjectId(projectId, take:300)` | Checking a transaction hash against that project's recent gifts, so a seed can say what actually arrived. |
| `q=similar&slug=` | `similarProjectsBySlug` | The circular flow: what else is near what you already gave to. |
| `q=sunlight&address=` | `userByAddress` | How much a **public** address takes part: boosted, given, liked. Read only, no authentication, no signature. |
| `q=updates&slug=` | `getProjectUpdates` | What the project has told the world, newest first. |
| `q=donors&slug=` | `donationsByProjectId` | The gifts that have just arrived, with the names people chose to show. |
| `q=cats` | `mainCategories` | Giveth's own categories, for the directory. |
| the responsiveness reading | ours, not theirs | Computed from our own trace document, never from their data. |

A project page in Gratus now shows: raised, donors, updates, verification and GIVbacks badges, whether a quadratic round is matching it right now, where it works, its organisation, the chains it accepts, every social and website link it has published, its recent updates, its recent gifts, how faithfully it answers Gratus Seeds, and what else is like it. Contact links come from `socialMedia` and `website` on the project itself; Giveth stores them as typed links (X, Discord, Telegram, Farcaster, Instagram, YouTube, LinkedIn, Facebook, website).

**The donation itself never happens in Gratus.** We open Giveth in a new tab; the person gives from their own wallet, on their own chain, to the project's own address. Gratus holds no money, takes no fee, and has no custody. The app says so on the screen.

## 4. What Gratus adds: the Emotional TRACE

Giveth's information flows are excellent on the money side: zero fees, on-chain tracking, GIVbacks, QF rounds. What no rail carries is **why** somebody gave, and whether it landed.

A donation today is mathematically perfect and emotionally silent. The Emotional TRACE closes that loop. Full architecture in [EMOTIONAL-TRACE.md](EMOTIONAL-TRACE.md); in one paragraph:

**Begin**: a donor plants a Gratus Seed with their gift: a few words about why, tied to the project and, optionally, the transaction. **Become**: the project's stewards read the seeds beside the capital, in a console built for them. **Bridge**: a steward waters a seed with a line back. **Bloom**: the seed in the donor's garden opens into that project's own emoji and keeps the reply inside it, permanently.

The capital funds the work. The seed funds the morale. The bloom funds the next gift.

## 5. The pitch to Giveth

**The problem.** Retention in Web3 philanthropy is a feedback-loop problem, not a marketing problem. A donor gives, the transaction confirms, and nothing comes back except a number. There is no signal that a human being on the other end read anything, so there is no reason for the loop to repeat. Meanwhile project stewards, especially at the edges of the network, work without ever hearing why anyone believed in them.

**The intervention.** Gratus is a small, free, open-source layer that adds one missing flow: gratitude, in a person's own words, travelling with the capital and answered by the people who received it. It costs Giveth nothing, changes nothing in their stack, and does not compete for the donation.

**What Giveth gets.**

1. **A retention loop the money rail cannot provide.** Every watered seed is a reason to give again, and it arrives from a human, not a dashboard.
2. **Morale infrastructure for project stewards.** Under-resourced teams see why people gave, not only how much.
3. **A qualitative signal on top of the quantitative ones.** How many seeds a project receives, and how faithfully it waters them, is a measure of responsiveness that GIVbacks review or DeVouch attestations could use. It is human-in-the-loop, and it is hard to fake at scale because it requires actually writing back.
4. **Visibility at the margins.** Our "Nobody yet" lane surfaces new projects with zero donors: the exact nodes a network needs to keep alive, and the ones ranking algorithms bury.
5. **No lock-in.** MIT, no fee, no custody, no account. If Giveth would rather run the loop themselves, the code is theirs to take.

**What we ask for.** Nothing structural. A conversation, a look at the code, and, if it proves useful, a link. Later, if the signal is worth it: a way to mark a Gratus steward as the verified owner of a Giveth project, so watering cannot be impersonated. That is the one thing we cannot do alone, and it is item one on our list.

**Contact.** [@BuiltByAugust](https://x.com/BuiltByAugust) · [github.com/InitiumBuilders/Gratus.CC-Open](https://github.com/InitiumBuilders/Gratus.CC-Open)

## 6. Onboarding

### If you are new to Giveth and arrived through Gratus

1. **Find a project.** Open Give → Give with Giveth. Start with the GIVbacks lane: those projects are reviewed and their donors earn GIV back. Or open the "Nobody yet" lane and find someone nobody has given to.
2. **Read it properly.** Tap a project, then "Read it on Giveth". A real project shows action, not only intent.
3. **Get a wallet.** You need a self-custody wallet with some crypto on one of the chains the project accepts. Giveth never holds it for you.
4. **Give.** On the project's Giveth page, choose the amount and the chain and confirm in your wallet. The whole amount goes to the project.
5. **Plant your seed.** Back in Gratus, write why you gave. Paste the transaction hash if you want it on the record.
6. **Watch for the bloom.** When someone from the project writes back, the seed opens in your garden and keeps their words.

### If you run a Giveth project

1. **Find your slug.** It is the last part of your project's address: `giveth.io/project/your-slug` → `your-slug`.
2. Open **Give → Give with Giveth → I run a project**, or [gratus.cc/app/console](https://www.gratus.cc/app/console).
3. **Claim it.** You get a project key, shown once. Only a hash of it is stored. Keep it somewhere safe.
4. **Read the seeds.** Every one is from a person who gave to you.
5. **Water them.** A line back takes twenty seconds and blooms in their garden. This is the whole loop; it only works if you answer.

**Honest limit:** claiming is first-come and light. It is not verification, and we say so in the app. Verification belongs to Giveth, and tying a Gratus claim to a verified Giveth project owner is the first thing on our list.

## 7. Our own rules for this integration

- Gratus never holds money, never asks for a private key or seed phrase, and never brokers a donation.
- We read their public API and cache it. We do not mirror their data or claim it as ours.
- A Gratus Seed is written to be read by that project. The app says so before anyone writes one. A journal entry is a different thing and never leaves the device.
- We show their badges as they report them, and never invent a trust signal.
- If any of this is unwelcome to Giveth, it comes out the same day.

## 8. The six loops, in priority order

The full reasoning is in [EMOTIONAL-TRACE.md](EMOTIONAL-TRACE.md). In short:

| # | Loop | State |
|---|---|---|
| 1 | **Emotional TRACE**: Begin, Become, Bridge, Bloom | Shipped, v15 |
| 2 | **The "I See You" catalyst**: the Nobody yet lane, and a 🫶 mark for a project's first-ever seed | Shipped, v16 |
| 3 | **Human-in-the-loop responsiveness**: seeds received, share watered, days to answer | Shipped, v16 |
| 4 | **Harmonic emoji alchemy**: twelve marks needing both a gift and inner work | Shipped, v16 |
| 5 | **Circular Gratus flow**: a steward passes it on; the donor continues the flow | Shipped as a prompt, v16 |
| 6 | **GIVgarden cross-pollination**: a public address read as sunlight | Shipped, v16 |

The two that touch money or keys, 5 and 6, ship in the only form this app will carry them: a prompt the person acts on, and a read-only look at a public address. No custody, no connection, no signature.

Sources: [docs.giveth.io](https://docs.giveth.io) · [docs.giveth.io/givbacks](https://docs.giveth.io/givbacks) · [docs.giveth.io/projectverification](https://docs.giveth.io/projectverification) · [github.com/Giveth/impact-graph](https://github.com/Giveth/impact-graph)
