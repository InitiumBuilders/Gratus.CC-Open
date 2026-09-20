// GRATUS BILLING · a free week, then twenty-four dollars a month.
//
// WHAT IS FREE, ALWAYS
//   Receiving a gift. A gift link is somebody else's hand held out, and a paywall in a
//   stranger's hands is the one place this product must never put one. /gift opens for
//   anybody, for ever, with no account and no card.
//
// WHAT THE WEEK COVERS
//   Everything else: writing, the garden, the glyph, rooms, seeds, giving. Seven days from
//   the first time somebody opens the app. No card is asked for to start it.
//
// HOW THE MONEY MOVES
//   Stripe Checkout, in Stripe's own hosted page. No card number ever touches this server
//   or this repository. A webhook, signature-checked, writes the state back onto the
//   account record. If the keys are absent this file says so plainly rather than pretending
//   to charge anybody.
import { put, list } from '@vercel/blob';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const SK = process.env.STRIPE_SECRET_KEY || '';
const PRICE = process.env.STRIPE_PRICE_ID || '';
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');
const PEPPER = process.env.GRATUS_SALT || sha('gratus/acct/' + String(TOKEN)).slice(0, 32);
const ACCT = (id) => 'gratus/acct/' + id + '.json';
const TRIAL_DAYS = 7;
export const PRICE_TEXT = '$24 a month';

async function readJson(key) {
  try {
    const { blobs } = await list({ prefix: key, token: TOKEN });
    const b = blobs.find((x) => x.pathname === key);
    if (!b) return null;
    const r = await fetch(b.url + '?t=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}
const writeJson = (key, doc) => put(key, JSON.stringify(doc), {
  access: 'public', token: TOKEN, contentType: 'application/json',
  addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 0,
});

function readToken(t) {
  const parts = String(t || '').split('.');
  if (parts.length !== 3) return null;
  const [id, exp, mac] = parts;
  const want = createHmac('sha256', PEPPER).update(id + '.' + exp).digest('hex').slice(0, 32);
  if (mac.length !== want.length || !timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return null;
  if (Number(exp) < Date.now()) return null;
  return id;
}

// Stripe's REST API, spoken directly. No dependency, no SDK, nothing extra in the tree.
async function stripe(path, form) {
  const body = new URLSearchParams(form).toString();
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + SK, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const d = await r.json();
  if (!r.ok) throw new Error((d.error && d.error.message) || ('stripe ' + r.status));
  return d;
}

export function stateOf(rec) {
  const now = Date.now();
  const bill = (rec && rec.billing) || {};
  if (bill.status === 'active' || bill.status === 'trialing') {
    if (!bill.until || Number(bill.until) > now) return { state: 'active', until: bill.until || null, price: PRICE_TEXT };
  }
  const made = rec && rec.made ? Date.parse(rec.made) : now;
  const trialEnds = made + TRIAL_DAYS * 86400000;
  if (now < trialEnds) return { state: 'trial', until: new Date(trialEnds).toISOString(), days: Math.ceil((trialEnds - now) / 86400000), price: PRICE_TEXT };
  return { state: 'ended', until: new Date(trialEnds).toISOString(), price: PRICE_TEXT };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!TOKEN) { res.status(503).json({ error: 'billing is not connected yet' }); return; }
  try {
    if (req.method !== 'POST') { res.status(405).json({ error: 'POST' }); return; }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const act = String(body.act || '');
    const id = readToken(body.token);
    if (!id) { res.status(401).json({ error: 'sign in first' }); return; }
    const rec = await readJson(ACCT(id));
    if (!rec) { res.status(401).json({ error: 'sign in first' }); return; }

    if (act === 'status') {
      res.status(200).json(Object.assign(stateOf(rec), { connected: !!(SK && PRICE) }));
      return;
    }

    if (act === 'checkout') {
      if (!SK || !PRICE) {
        res.status(503).json({ error: 'Card payments are not switched on yet. Nothing has been charged.', connected: false });
        return;
      }
      const origin = String(body.origin || 'https://www.gratus.cc').replace(/[^a-zA-Z0-9:/._-]/g, '').slice(0, 120);
      const st = stateOf(rec);
      const form = {
        mode: 'subscription',
        'line_items[0][price]': PRICE,
        'line_items[0][quantity]': '1',
        success_url: origin + '/app?paid=1',
        cancel_url: origin + '/app',
        client_reference_id: id,
        'metadata[account]': id,
        allow_promotion_codes: 'true',
      };
      // Somebody still inside their week keeps the rest of it rather than losing days for
      // putting a card in early.
      if (st.state === 'trial' && st.days > 0) form['subscription_data[trial_period_days]'] = String(Math.min(30, st.days));
      if (rec.billing && rec.billing.customer) form.customer = rec.billing.customer;
      const session = await stripe('checkout/sessions', form);
      rec.billing = Object.assign({}, rec.billing, { lastSession: session.id, at: new Date().toISOString() });
      await writeJson(ACCT(id), rec);
      res.status(200).json({ url: session.url });
      return;
    }

    if (act === 'portal') {
      if (!SK) { res.status(503).json({ error: 'Card payments are not switched on yet.' }); return; }
      const cust = rec.billing && rec.billing.customer;
      if (!cust) { res.status(404).json({ error: 'there is no subscription on this account yet' }); return; }
      const origin = String(body.origin || 'https://www.gratus.cc').replace(/[^a-zA-Z0-9:/._-]/g, '').slice(0, 120);
      const p = await stripe('billing_portal/sessions', { customer: cust, return_url: origin + '/app' });
      res.status(200).json({ url: p.url });
      return;
    }

    res.status(400).json({ error: 'status, checkout or portal' });
  } catch (e) {
    res.status(500).json({ error: 'billing could not be reached', detail: String(e.message || e).slice(0, 120) });
  }
}
