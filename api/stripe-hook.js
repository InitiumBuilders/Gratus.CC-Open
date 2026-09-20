// THE WEBHOOK · Stripe telling us what happened, and this file checking that it was Stripe.
//
// Everything that decides whether somebody has paid arrives here, so the signature is
// checked before a single byte of it is believed. An unsigned call, a call signed with the
// wrong secret, or one with a timestamp outside five minutes is refused and nothing is
// written. The raw body is read by hand because a parsed body cannot be verified: the
// signature is over the exact bytes Stripe sent.
export const config = { api: { bodyParser: false } };

import { put, list } from '@vercel/blob';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const WH = process.env.STRIPE_WEBHOOK_SECRET || '';
const ACCT = (id) => 'gratus/acct/' + id + '.json';
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

async function raw(req) {
  const parts = [];
  for await (const chunk of req) parts.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(parts);
}

function verified(bodyBuf, header) {
  if (!WH || !header) return null;
  const parts = Object.fromEntries(String(header).split(',').map((p) => p.split('=')));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return null;      // five minutes, no more
  const want = createHmac('sha256', WH).update(parts.t + '.' + bodyBuf.toString('utf8')).digest('hex');
  const got = String(parts.v1 || '');
  if (got.length !== want.length) return null;
  if (!timingSafeEqual(Buffer.from(got), Buffer.from(want))) return null;
  try { return JSON.parse(bodyBuf.toString('utf8')); } catch (e) { return null; }
}

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

const LIVE = new Set(['active', 'trialing']);

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).end('POST'); return; }
  let buf;
  try { buf = await raw(req); } catch (e) { res.status(400).end('no body'); return; }
  const ev = verified(buf, req.headers['stripe-signature']);
  if (!ev) { res.status(400).end('signature'); return; }
  if (!TOKEN) { res.status(200).end('no store'); return; }

  try {
    const o = (ev.data && ev.data.object) || {};
    const id = (o.metadata && o.metadata.account) || o.client_reference_id ||
      (o.subscription_details && o.subscription_details.metadata && o.subscription_details.metadata.account) || '';
    const byCustomer = !id && o.customer ? String(o.customer) : '';
    let rec = null, key = '';
    if (id) { key = ACCT(String(id).slice(0, 64)); rec = await readJson(key); }
    if (!rec && byCustomer) {
      // a later event carries the customer rather than our id, so it is found by the
      // customer we wrote down the first time
      const { blobs } = await list({ prefix: 'gratus/acct/', token: TOKEN });
      for (const b of blobs) {
        if (!/\/acct\/[0-9a-f]+\.json$/.test(b.pathname)) continue;
        const r = await readJson(b.pathname);
        if (r && r.billing && r.billing.customer === byCustomer) { rec = r; key = b.pathname; break; }
      }
    }
    if (!rec) { res.status(200).end('no account for that event'); return; }

    rec.billing = rec.billing || {};
    if (o.customer) rec.billing.customer = String(o.customer);
    if (ev.type === 'checkout.session.completed') {
      rec.billing.status = 'active';
      if (o.subscription) rec.billing.subscription = String(o.subscription);
    } else if (/^customer\.subscription\./.test(ev.type)) {
      rec.billing.status = LIVE.has(o.status) ? 'active' : String(o.status || 'ended');
      if (o.current_period_end) rec.billing.until = Number(o.current_period_end) * 1000;
      if (ev.type === 'customer.subscription.deleted') rec.billing.status = 'ended';
    } else if (ev.type === 'invoice.payment_failed') {
      rec.billing.status = 'past_due';
    }
    rec.billing.at = new Date().toISOString();
    await writeJson(key, rec);
    res.status(200).end('ok');
  } catch (e) {
    // Stripe retries a failure, so an error here is answered honestly rather than
    // swallowed with a 200 that would lose the event for good.
    res.status(500).end('could not record it');
  }
}
