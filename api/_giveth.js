// THE GIVETH READ, SHARED.
//
// api/giveth.js answers the browser with this. api/trace.js uses it to check a claim and
// a gift for itself, so that the numbers and the permissions in the trace come from
// Giveth rather than from whoever sent the request. The file name begins with _ so that
// Vercel does not route it as a function of its own.
//
// Their API: https://mainnet.serve.giveth.io/graphql · their code: https://github.com/Giveth/impact-graph (MIT)
const GIVETH = 'https://mainnet.serve.giveth.io/graphql';

export const ONE = `query($slug:String!){
  projectBySlug(slug:$slug){ id title slug verified isGivbackEligible description descriptionSummary image
    totalDonations countUniqueDonors totalReactions totalProjectUpdates website youtube impactLocation
    updatedAt creationDate isQfActive organization{ name label } socialMedia{ type link }
    categories{ name mainCategory{ title } } adminUser{ name }
    addresses{ address networkId chainType isRecipient } }
}`;

export const DONATIONS = `query($projectId:Int!,$take:Int){
  donationsByProjectId(projectId:$projectId, take:$take, orderBy:{field:CreationDate, direction:DESC}){
    donations{ transactionId valueUsd amount currency createdAt anonymous }
  }
}`;

// A GraphQL answer can carry errors AND the data that was asked for. This used to throw
// on the errors alone and drop the answer with them, which is why the friendly "no such
// project" reply further down had never once run: an unknown slug comes back as
// { data: { projectBySlug: null }, errors: [...] }, and the throw beat the 404 to it.
// Now the errors only decide anything when there is no data to read.
export async function ask(query, variables) {
  const r = await fetch(GIVETH, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  if (!r.ok) throw new Error('giveth ' + r.status);
  const j = await r.json();
  const data = j && j.data;
  if (!data || typeof data !== 'object' || !Object.keys(data).length) {
    throw new Error((j && j.errors && j.errors[0] && j.errors[0].message) || 'giveth returned nothing');
  }
  return data;
}

// The project's own page, as Giveth holds it. Used to check that whoever is claiming a
// project can edit what the project says about itself.
export async function pageOf(slug) {
  const d = await ask(ONE, { slug });
  const p = d.projectBySlug;
  if (!p) return null;
  return { id: Number(p.id), title: p.title || '', description: p.description || '', summary: p.descriptionSummary || '', slug: p.slug || slug };
}

// Was this transaction really a gift to this project? The answer comes from Giveth's own
// record of it, never from the person telling us about it.
export async function giftOf(slug, tx) {
  const p = await pageOf(slug);
  if (!p) return { found: false, confirmed: false, note: 'no such project' };
  const d = await ask(DONATIONS, { projectId: p.id, take: 300 });
  const rows = (d.donationsByProjectId && d.donationsByProjectId.donations) || [];
  const hit = rows.find((x) => String(x.transactionId || '').toLowerCase() === String(tx || '').toLowerCase());
  if (!hit) return { found: true, confirmed: false, note: 'Not among this project’s last 300 gifts on Giveth. A gift can take a few minutes to appear, and older ones fall outside this window.' };
  return { found: true, confirmed: true, gift: { amount: hit.amount, currency: hit.currency, usd: hit.valueUsd, at: hit.createdAt } };
}
