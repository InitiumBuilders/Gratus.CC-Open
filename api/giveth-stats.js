// WHAT GIVETH HAS ACTUALLY DONE.
//
// Every number this returns is read from Giveth's own API at mainnet.serve.giveth.io and
// none of it is written down here. That is the whole point: a pitch made of numbers
// somebody typed once is a pitch that is wrong by the time it is read, and this one is a
// claim about other people's work. If Giveth cannot be reached, this says so and the page
// says so, because an unreachable number is not a zero.
//
// Their API is public and open source (Giveth/impact-graph, MIT). We ask for aggregates
// only: no donor, no wallet, no name.
//
// THE READ IS SLOW, so it is never done while somebody is waiting if it can be helped. The
// answer is kept in the blob store with the moment it was taken, served immediately even
// when it is stale, and refreshed behind the reader. One caller does the refresh; the rest
// get the copy. Measured: a cold read of all seven queries takes seconds, a warm one is a
// single blob fetch.
import { put, list } from '@vercel/blob';
import { ask } from './_giveth.js';

// A cold gather is half a minute of waiting on Giveth, almost all of it one query, so this
// function is allowed to take it. Nobody waits on that: the page is served from the cache.
export const config = { maxDuration: 60 };

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const KEY = 'gratus/giveth/stats.json';
const FRESH = 30 * 60 * 1000;          // half an hour is new enough for a five-year total
const STALE = 7 * 24 * 60 * 60 * 1000; // after a week, a number is not worth showing at all
const FROM = '2016-01-01';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

async function readCache() {
  if (!TOKEN) return null;
  try {
    const { blobs } = await list({ prefix: KEY, token: TOKEN, limit: 1 });
    if (!blobs.length) return null;
    const r = await fetch(blobs[0].url, { cache: 'no-store' });
    if (!r.ok) return null;
    const d = await r.json();
    return d && d.at ? d : null;
  } catch (e) { return null; }
}

async function writeCache(doc) {
  if (!TOKEN) return;
  try {
    await put(KEY, JSON.stringify(doc), {
      access: 'public', token: TOKEN, contentType: 'application/json',
      addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
    });
  } catch (e) { /* the read still works without a cache */ }
}

// SEVEN QUESTIONS, ASKED ONE AT A TIME, AND NEVER LOSING GROUND.
//
// MEASURED against the live API, one at a time: qf 144ms, created 234ms, verified 884ms,
// listed 1.1s, months 1.1s, categories 2.2s, and donors TWENTY-FIVE SECONDS. That last one
// is why this cannot run while somebody waits, and why they are asked in a line with a
// breath between rather than fired at a public API all at once.
//
// (I first blamed a burst limit for a wall of 599s. They were my own gate's fetch stub
// refusing to let a gate reach the internet, which is a rule this repository is right to
// have. The endpoint was never broken. The sequencing stays because the 25s is real.)
//
// A question that fails keeps the answer it had last time instead of emptying the field. A
// refresh that half worked must never turn a page that was showing the truth into a page
// showing nothing: the alternative is a total that blinks out because one query timed out.
async function gather(to, prev) {
  const was = prev || {};
  // A question that fails leaves its own field empty and says why, rather than vanishing.
  // The first version swallowed every error identically, so an endpoint that answered 503
  // could not tell me whether Giveth was down or whether I had written a bad query.
  const problems = [];
  const breath = (ms) => new Promise((ok) => setTimeout(ok, ms));
  async function one(q, pick) {
    for (let go = 0; go < 2; go++) {
      try { return pick(await ask(q, {})); } catch (e) {
        const said = String(e.message || e).slice(0, 90);
        if (go) { problems.push(said); return null; }
        await breath(1200);                       // one breath, then one more try
      }
    }
    return null;
  }
  const keep = (got, had) => (got == null || (Array.isArray(got) && !got.length) ? (had == null ? got : had) : got);
  const usd = await one(`{ donationsTotalUsdPerDate(fromDate:"${FROM}",toDate:"${to}"){ total totalPerMonthAndYear{ total date } } }`,
    (d) => d.donationsTotalUsdPerDate || null);
  await breath(250);
  const donors = await one(`{ totalDonorsCountPerDate(fromDate:"${FROM}",toDate:"${to}"){ total } }`, (d) => num(d.totalDonorsCountPerDate?.total));
  await breath(250);
  const created = await one(`{ projectsPerDate(fromDate:"${FROM}",toDate:"${to}"){ total } }`, (d) => num(d.projectsPerDate?.total));
  await breath(250);
  const listed = await one(`{ allProjects(take:1){ totalCount } }`, (d) => num(d.allProjects?.totalCount));
  await breath(250);
  const verified = await one(`{ allProjects(take:1, filters:[Verified]){ totalCount } }`, (d) => num(d.allProjects?.totalCount));
  await breath(250);
  const cats = await one(`{ totalDonationsPerCategory(fromDate:"${FROM}",toDate:"${to}"){ title totalUsd } }`,
    (d) => (d.totalDonationsPerCategory || []).map((c) => ({ title: c.title, usd: num(c.totalUsd) })).filter((c) => c.usd));
  await breath(250);
  const qf = await one(`{ qfRounds{ id name allocatedFund isActive beginDate endDate } }`, (d) => d.qfRounds || []);

  const months = keep((usd?.totalPerMonthAndYear || [])
    .map((m) => ({ d: m.date, usd: num(m.total) }))
    .filter((m) => m.d && m.usd != null), was.months);
  const rounds = Array.isArray(qf) ? qf : [];
  const round = rounds.length ? {
    rounds: rounds.length,
    matching: rounds.reduce((t, r) => t + (num(r.allocatedFund) || 0), 0),
    live: rounds.filter((r) => r.isActive).map((r) => r.name).slice(0, 3),
  } : was.qf || { rounds: 0, matching: 0, live: [] };
  return {
    at: new Date().toISOString(),
    usd: keep(num(usd?.total), was.usd),
    donors: keep(donors, was.donors),
    created: keep(created, was.created),
    listed: keep(listed, was.listed),
    verified: keep(verified, was.verified),
    months,
    since: months.length ? months[0].d : was.since || null,
    categories: keep((cats || []).slice().sort((a, b) => b.usd - a.usd), was.categories),
    problems,
    qf: round,
  };
}

let inflight = null;

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=1800');
  const to = new Date().toISOString().slice(0, 10);
  try {
    const cached = await readCache();
    const age = cached ? Date.now() - Date.parse(cached.at) : Infinity;

    if (cached && age < FRESH) { res.status(200).json({ ...cached, age: Math.round(age / 1000) }); return; }

    // stale but usable: answer now, refresh behind, and let only one caller do the work
    if (cached && age < STALE) {
      if (!inflight) {
        inflight = gather(to, cached).then((d) => writeCache(d)).catch(() => {}).finally(() => { inflight = null; });
      }
      res.status(200).json({ ...cached, age: Math.round(age / 1000), refreshing: true });
      return;
    }

    const fresh = await gather(to, cached);
    if (fresh.usd == null && fresh.donors == null) {
      res.status(503).json({ error: 'Giveth is not answering right now', why: fresh.problems.slice(0, 3) });
      return;
    }
    await writeCache(fresh);
    res.status(200).json({ ...fresh, age: 0 });
  } catch (e) {
    res.status(503).json({ error: 'Giveth is not answering right now', detail: String(e.message || e).slice(0, 120) });
  }
}
