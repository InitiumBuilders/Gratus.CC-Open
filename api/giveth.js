// GRATUS × GIVETH · a read-only window onto Giveth's public impact-graph.
// Giveth runs the capital rail: zero-fee donations, verified projects, GIVbacks, GIVpower.
// Gratus adds the emotional rail on top of it. This function only reads; it never holds a key,
// never asks for a wallet, and never touches a donation. The donation itself happens on giveth.io.
//
// Their API: https://mainnet.serve.giveth.io/graphql  ·  their code: https://github.com/Giveth/impact-graph (MIT)
//
//   q=projects   the four lanes
//   q=project    one project by slug
//   q=confirm    was this transaction really a gift to this project (loop: the seed and the capital, linked)
//   q=similar    what else is like this project (loop 5: the circular flow)
//   q=sunlight   how much a public address takes part in Giveth (loop 3: GIVgarden cross-pollination)
//   q=updates    what the project has told the world, newest first
//   q=donors     the most recent gifts that arrived
//   q=cats       Giveth's own main categories, for the directory

const GIVETH = 'https://mainnet.serve.giveth.io/graphql';
const LIST = `query($limit:Int,$skip:Int,$searchTerm:String,$filters:[FilterField!],$sortingBy:SortingField,$mainCategory:String){
  allProjects(limit:$limit, skip:$skip, searchTerm:$searchTerm, filters:$filters, sortingBy:$sortingBy, mainCategory:$mainCategory){
    totalCount
    projects{ id title slug verified isGivbackEligible descriptionSummary image totalDonations countUniqueDonors
      categories{ name mainCategory{ title } } }
  }
}`;
const ONE = `query($slug:String!){
  projectBySlug(slug:$slug){ id title slug verified isGivbackEligible description descriptionSummary image
    totalDonations countUniqueDonors totalReactions totalProjectUpdates website youtube impactLocation
    updatedAt creationDate isQfActive organization{ name label } socialMedia{ type link }
    categories{ name mainCategory{ title } } adminUser{ name }
    addresses{ address networkId chainType isRecipient } }
}`;
const UPDATES = `query($projectId:Int!,$take:Int){
  getProjectUpdates(projectId:$projectId, take:$take, skip:0){
    id title contentSummary createdAt totalReactions isMain }
}`;
const DONORS = `query($projectId:Int!,$take:Int){
  donationsByProjectId(projectId:$projectId, take:$take, orderBy:{field:CreationDate, direction:DESC}){
    totalCount donations{ valueUsd amount currency createdAt anonymous user{ name } } }
}`;
const CATS = `{ mainCategories{ title slug banner } }`;
const CHAIN = { 1: 'Ethereum', 100: 'Gnosis', 137: 'Polygon', 10: 'Optimism', 8453: 'Base', 42220: 'Celo', 42161: 'Arbitrum', 1101: 'ZKEVM', 61: 'Classic', 101: 'Solana', 1500: 'Stellar' };
// their similarProjectsBySlug refuses a variable-typed slug, so it is inlined through a strict sanitiser
const safeSlug = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9:-]/g, '').slice(0, 120);
const SIMILAR = (slug, take) => `{
  similarProjectsBySlug(slug:"${slug}", take:${take}){
    projects{ id title slug verified isGivbackEligible descriptionSummary image totalDonations countUniqueDonors
      categories{ name mainCategory{ title } } }
  }
}`;
const DONATIONS = `query($projectId:Int!,$take:Int){
  donationsByProjectId(projectId:$projectId, take:$take, orderBy:{field:CreationDate, direction:DESC}){
    donations{ transactionId valueUsd amount currency createdAt anonymous }
  }
}`;
const USER = `query($address:String!){
  userByAddress(address:$address){ id name totalDonated donationsCount likedProjectsCount boostedProjectsCount projectsCount }
}`;

// a project's bloom: the emoji a watered seed becomes, from the project's own main category
const BLOOM = {
  environment: '🌳', 'environment-and-energy': '🌳', nature: '🌿', economics: '🌾', 'non-profit': '🤝',
  community: '🤝', education: '📚', health: '🩺', 'health-and-wellness': '🩺', art: '🎨', 'art-and-culture': '🎨',
  technology: '⚡', finance: '🔆', equality: '🕊️', other: '✨', food: '🌻', water: '💧', housing: '🏡',
  inclusion: '🕊️', research: '🔬', ngo: '🤝', animals: '🦋', nonprofit: '🤝', 'economics-and-infrastructure': '🌾',
};
const bloomFor = (p) => {
  const cats = (p && p.categories) || [];
  for (const c of cats) { const k = ((c.mainCategory && c.mainCategory.title) || c.name || '').toLowerCase().replace(/[\s&]+/g, '-'); if (BLOOM[k]) return BLOOM[k]; }
  for (const c of cats) { const k = (c.name || '').toLowerCase(); if (BLOOM[k]) return BLOOM[k]; }
  return '🌻';
};
const trim = (p) => ({
  id: p.id, title: p.title, slug: p.slug, verified: !!p.verified, givbacks: !!p.isGivbackEligible,
  summary: String(p.descriptionSummary || '').replace(/\s+/g, ' ').slice(0, 260),
  image: p.image || null, raised: Math.round(Number(p.totalDonations || 0)), donors: Number(p.countUniqueDonors || 0),
  categories: ((p.categories || []).map((c) => (c.mainCategory && c.mainCategory.title) || c.name).filter(Boolean)).slice(0, 3),
  bloom: bloomFor(p), url: 'https://giveth.io/project/' + p.slug, donateUrl: 'https://giveth.io/donate/' + p.slug,
  steward: (p.adminUser && p.adminUser.name) || null,
  reactions: Number(p.totalReactions || 0), updates: Number(p.totalProjectUpdates || 0),
  where: p.impactLocation || null, org: (p.organization && p.organization.name) || null,
  qf: !!p.isQfActive, updatedAt: p.updatedAt || null,
  links: (p.socialMedia || []).map((s) => ({ type: String(s.type || '').toLowerCase(), link: s.link })).filter((s) => s.link)
    .concat(p.website ? [{ type: 'website', link: p.website }] : []).slice(0, 8),
  chains: Array.from(new Set((p.addresses || []).filter((a) => a.isRecipient).map((a) => CHAIN[a.networkId] || (a.chainType === 'SOLANA' ? 'Solana' : a.chainType === 'STELLAR' ? 'Stellar' : null)).filter(Boolean))),
});

async function ask(query, variables) {
  const r = await fetch(GIVETH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!r.ok) throw new Error('giveth ' + r.status);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0] && j.errors[0].message);
  return j.data;
}

export default async function handler(req, res) {
  const q = String(req.query.q || 'projects');
  res.setHeader('Cache-Control', q === 'confirm' ? 'no-store' : 'public, s-maxage=300, stale-while-revalidate=3600');
  try {
    if (q === 'project') {
      const slug = String(req.query.slug || '').slice(0, 120);
      if (!slug) { res.status(400).json({ error: 'a slug' }); return; }
      const d = await ask(ONE, { slug });
      if (!d.projectBySlug) { res.status(404).json({ error: 'no such project' }); return; }
      res.status(200).json({ project: trim(d.projectBySlug) });
      return;
    }

    // ── the seed and the capital, linked. Was this transaction really a gift to this project? ──
    if (q === 'confirm') {
      const slug = String(req.query.slug || '').slice(0, 120);
      const tx = String(req.query.tx || '').trim().toLowerCase().slice(0, 100);
      if (!slug || !tx) { res.status(400).json({ error: 'a slug and a transaction' }); return; }
      const p = await ask(ONE, { slug });
      if (!p.projectBySlug) { res.status(404).json({ error: 'no such project' }); return; }
      const d = await ask(DONATIONS, { projectId: Number(p.projectBySlug.id), take: 300 });
      const hit = (d.donationsByProjectId.donations || []).find((x) => String(x.transactionId || '').toLowerCase() === tx);
      if (!hit) { res.status(200).json({ confirmed: false, note: 'Not among this project’s last 300 gifts on Giveth. A gift can take a few minutes to appear, and older ones fall outside this window.' }); return; }
      res.status(200).json({ confirmed: true, gift: { amount: hit.amount, currency: hit.currency, usd: hit.valueUsd, at: hit.createdAt } });
      return;
    }

    // ── what the project has told the world ──
    if (q === 'updates') {
      const slug = String(req.query.slug || '').slice(0, 120);
      if (!slug) { res.status(400).json({ error: 'a slug' }); return; }
      const p = await ask(ONE, { slug });
      if (!p.projectBySlug) { res.status(404).json({ error: 'no such project' }); return; }
      const d = await ask(UPDATES, { projectId: Number(p.projectBySlug.id), take: 8 });
      const ups = (d.getProjectUpdates || []).filter((u) => !u.isMain).map((u) => ({
        id: u.id, title: u.title, summary: String(u.contentSummary || '').replace(/\s+/g, ' ').slice(0, 300),
        at: u.createdAt, reactions: Number(u.totalReactions || 0),
      }));
      res.status(200).json({ updates: ups });
      return;
    }

    // ── the gifts that arrived ──
    if (q === 'donors') {
      const slug = String(req.query.slug || '').slice(0, 120);
      if (!slug) { res.status(400).json({ error: 'a slug' }); return; }
      const p = await ask(ONE, { slug });
      if (!p.projectBySlug) { res.status(404).json({ error: 'no such project' }); return; }
      const d = await ask(DONORS, { projectId: Number(p.projectBySlug.id), take: 8 });
      const list = d.donationsByProjectId;
      res.status(200).json({
        total: Number(list.totalCount || 0),
        gifts: (list.donations || []).map((x) => ({
          name: x.anonymous ? null : ((x.user && x.user.name) || null),
          usd: x.valueUsd ? Math.round(x.valueUsd * 100) / 100 : null,
          currency: x.currency || null, at: x.createdAt,
        })),
      });
      return;
    }

    // ── Giveth's own categories, for the directory ──
    if (q === 'cats') {
      const d = await ask(CATS);
      res.status(200).json({ categories: (d.mainCategories || []).map((c) => ({ title: c.title, slug: c.slug })).filter((c) => c.title && c.slug !== 'all') });
      return;
    }

    // ── the circular flow: what else is like this ──
    if (q === 'similar') {
      const slug = String(req.query.slug || '').slice(0, 120);
      if (!slug) { res.status(400).json({ error: 'a slug' }); return; }
      const d = await ask(SIMILAR(safeSlug(slug), 6));
      res.status(200).json({ projects: ((d.similarProjectsBySlug || {}).projects || []).map(trim) });
      return;
    }

    // ── sunlight: how much a public address takes part in Giveth. Read only. Never a signature. ──
    if (q === 'sunlight') {
      const address = String(req.query.address || '').trim().toLowerCase();
      if (!/^0x[a-f0-9]{40}$/.test(address)) { res.status(400).json({ error: 'an Ethereum address' }); return; }
      const d = await ask(USER, { address });
      const u = d.userByAddress;
      if (!u) { res.status(200).json({ found: false, note: 'Giveth has not seen this address yet.' }); return; }
      const boosted = Number(u.boostedProjectsCount || 0), given = Number(u.donationsCount || 0), liked = Number(u.likedProjectsCount || 0);
      // sunlight is a reading, not a score: how much of the commons this address tends
      const sun = Math.min(5, Math.round((boosted * 1.5 + given * 0.25 + liked * 0.1) / 3));
      res.status(200).json({ found: true, name: u.name || null, boosted, given, liked, projects: Number(u.projectsCount || 0), sun });
      return;
    }

    // lanes: verified (GIVbacks eligible first), boosted (GIVpower), unseen (nobody has given yet), all
    const lane = String(req.query.lane || 'verified');
    const search = String(req.query.search || '').slice(0, 80) || undefined;
    const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));
    const skip = Math.max(0, Math.min(400, Number(req.query.skip) || 0));
    const mainCategory = String(req.query.cat || '').slice(0, 60) || undefined;
    const vars = { limit, skip, searchTerm: search, mainCategory };
    if (lane === 'unseen') { vars.sortingBy = 'Newest'; vars.limit = Math.min(50, limit * 4); }
    else if (lane === 'boosted') { vars.sortingBy = 'GIVPower'; vars.filters = ['Verified']; }
    else if (lane === 'all') { vars.sortingBy = search ? 'BestMatch' : 'MostLiked'; }
    else { vars.sortingBy = 'GIVPower'; vars.filters = ['IsGivbackEligible']; }
    const d = await ask(LIST, vars);
    let projects = (d.allProjects.projects || []).map(trim);
    // the margins: the ones nobody has given to yet
    if (lane === 'unseen') projects = projects.filter((p) => p.donors === 0).slice(0, limit);
    res.status(200).json({ lane, skip, total: d.allProjects.totalCount, projects });
  } catch (e) {
    res.status(502).json({ error: 'Giveth is not answering right now', detail: String(e.message || e).slice(0, 120) });
  }
}
