// GRATUS × GIVETH · a read-only window onto Giveth's public impact-graph.
// Giveth runs the capital rail: zero-fee donations, verified projects, GIVbacks, GIVpower.
// Gratus adds the emotional rail on top of it. This function only reads; it never holds a key,
// never sees a wallet, and never touches a donation. The donation itself happens on giveth.io.
//
// Their API: https://mainnet.serve.giveth.io/graphql  ·  their code: https://github.com/Giveth/impact-graph (MIT)

const GIVETH = 'https://mainnet.serve.giveth.io/graphql';
const LIST = `query($limit:Int,$skip:Int,$searchTerm:String,$filters:[FilterField!],$sortingBy:SortingField){
  allProjects(limit:$limit, skip:$skip, searchTerm:$searchTerm, filters:$filters, sortingBy:$sortingBy){
    totalCount
    projects{ id title slug verified isGivbackEligible descriptionSummary image totalDonations countUniqueDonors
      categories{ name mainCategory{ title } } }
  }
}`;
const ONE = `query($slug:String!){
  projectBySlug(slug:$slug){ id title slug verified isGivbackEligible descriptionSummary image totalDonations
    countUniqueDonors totalReactions categories{ name mainCategory{ title } } adminUser{ name }
    addresses{ networkId chainType isRecipient } }
}`;

// a project's bloom: the emoji a watered seed becomes, from the project's own main category
const BLOOM = {
  environment: '🌳', 'environment-and-energy': '🌳', nature: '🌿', economics: '🌾', 'non-profit': '🤝',
  community: '🤝', education: '📚', health: '🩺', 'health-and-wellness': '🩺', art: '🎨', 'art-and-culture': '🎨',
  technology: '⚡', finance: '🔆', equality: '🕊️', 'other': '✨', 'food': '🌻', 'water': '💧', 'housing': '🏡',
  'inclusion': '🕊️', 'research': '🔬', 'ngo': '🤝', 'animals': '🦋', 'nonprofit': '🤝',
};
const bloomFor = (p) => {
  const cats = (p && p.categories) || [];
  for (const c of cats) { const k = ((c.mainCategory && c.mainCategory.title) || c.name || '').toLowerCase().replace(/\s+/g, '-'); if (BLOOM[k]) return BLOOM[k]; }
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
});

async function ask(query, variables) {
  const r = await fetch(GIVETH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!r.ok) throw new Error('giveth ' + r.status);
  const j = await r.json();
  if (j.errors) throw new Error(j.errors[0] && j.errors[0].message);
  return j.data;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  const q = String(req.query.q || 'projects');
  try {
    if (q === 'project') {
      const slug = String(req.query.slug || '').slice(0, 120);
      if (!slug) { res.status(400).json({ error: 'a slug' }); return; }
      const d = await ask(ONE, { slug });
      if (!d.projectBySlug) { res.status(404).json({ error: 'no such project' }); return; }
      res.status(200).json({ project: trim(d.projectBySlug) });
      return;
    }
    // lanes: verified (GIVbacks eligible first), unseen (newest, nobody has given yet), all
    const lane = String(req.query.lane || 'verified');
    const search = String(req.query.search || '').slice(0, 80) || undefined;
    const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 12));
    const vars = { limit, skip: 0, searchTerm: search };
    if (lane === 'unseen') { vars.sortingBy = 'Newest'; vars.limit = Math.min(50, limit * 4); }
    else if (lane === 'boosted') { vars.sortingBy = 'GIVPower'; vars.filters = ['Verified']; }
    else if (lane === 'all') { vars.sortingBy = search ? 'BestMatch' : 'MostLiked'; }
    else { vars.sortingBy = 'GIVPower'; vars.filters = ['IsGivbackEligible']; }
    const d = await ask(LIST, vars);
    let projects = (d.allProjects.projects || []).map(trim);
    // the margins: the ones nobody has given to yet
    if (lane === 'unseen') projects = projects.filter((p) => p.donors === 0).slice(0, limit);
    res.status(200).json({ lane, total: d.allProjects.totalCount, projects });
  } catch (e) {
    res.status(502).json({ error: 'Giveth is not answering right now', detail: String(e.message || e).slice(0, 120) });
  }
}
