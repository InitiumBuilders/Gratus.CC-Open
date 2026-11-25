// The daily sweep of call markers, shared by api/paxt.js, api/signal.js and api/vibes.js. Not an endpoint: Vercel
// serves no file in api/ whose name starts with _.
//
// A call marker is needed only on its own day. Kept longer, one network's markers would tie what it sent on
// different days together. Each file keeps its markers under <root><day>/..., and the first calls a warm function
// takes on a new day delete every earlier day's folder.
//
// The day folders are listed folded, so today's markers, which can be many thousands, are never listed one by
// one. An earlier day is deleted a page at a time. One call does at most BUDGET lists, so no single request waits
// on a long sweep; when the budget runs out, the next call on the same function goes on where this one stopped,
// and the sweep counts as done for the day only once every earlier folder is empty. A store that cannot be read
// or written is tried again by the next call.
import { list, del } from '@vercel/blob';

const BUDGET = 8;
const DONE = new Map();      // root -> the day its sweep finished
const RUNNING = new Set();   // roots being swept by a call on this function now

/** Delete every marker under root filed under a day before `day` (YYYY-MM-DD). Never throws. */
export async function sweepDays(root, day, token) {
  if (DONE.get(root) === day || RUNNING.has(root)) return;
  RUNNING.add(root);
  try {
    let lists = 0;
    const old = [];
    let cursor;
    do {
      const r = await list({ prefix: root, mode: 'folded', token, cursor, limit: 1000 });
      lists++;
      for (const f of r.folders || []) if (f.slice(root.length, root.length + 10) < day) old.push(f);
      cursor = r.hasMore ? r.cursor : undefined;
    } while (cursor && lists < BUDGET);
    if (cursor) return;
    for (const folder of old) {
      for (;;) {
        if (lists >= BUDGET) return;
        const r = await list({ prefix: folder, token, limit: 1000 });
        lists++;
        if (!r.blobs.length) break;
        await del(r.blobs.map((b) => b.url), { token });
        if (!r.hasMore) break;
      }
    }
    DONE.set(root, day);
  } catch (e) {
    /* the next call tries again */
  } finally {
    RUNNING.delete(root);
  }
}
