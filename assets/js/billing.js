// The week, and what happens after it.
//
// Receiving a gift is free and always will be: a gift link is somebody else's hand held
// out and a paywall does not belong in a stranger's hands. Everything else runs on a free
// week, then twenty-four dollars a month.
import { token } from './account.js?v=20';

export const FREE_DAYS = 7;
const FIRST = 'gratus.firstOpen';

// Somebody who has never made an account still gets the week, counted from the first time
// they opened the app on this device.
export function firstOpen() {
  try {
    let t = localStorage.getItem(FIRST);
    if (!t) { t = String(Date.now()); localStorage.setItem(FIRST, t); }
    return Number(t);
  } catch (e) { return Date.now(); }
}
export function localState() {
  const ends = firstOpen() + FREE_DAYS * 86400000;
  const left = Math.ceil((ends - Date.now()) / 86400000);
  return left > 0 ? { state: 'trial', days: left, until: new Date(ends).toISOString() }
                  : { state: 'ended', until: new Date(ends).toISOString() };
}

async function ask(body) {
  const r = await fetch('/api/billing', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Object.assign(new Error(d.error || 'billing did not answer'), { data: d });
  return d;
}
// Can the rail take money right now? Anything short of a plain yes is a no: an unreachable
// server, a missing key, a malformed answer. Failing open for the person and closed for
// the charge is the only direction this can safely fail.
export async function rail() {
  try {
    const r = await fetch('/api/billing', { cache: 'no-store' });
    const d = await r.json();
    return d && d.connected === true;
  } catch (e) { return false; }
}

// The account is the truth when there is one, because a device clock is somebody else's
// to set. Without an account the local count stands, and the rail is asked separately.
export async function status() {
  if (!token()) return Object.assign(localState(), { connected: await rail(), account: false });
  try { return Object.assign(await ask({ act: 'status', token: token() }), { account: true }); }
  catch (e) { return Object.assign(localState(), { connected: false, account: false, why: e.message }); }
}
export const checkout = () => ask({ act: 'checkout', token: token(), origin: location.origin });
export const portal = () => ask({ act: 'portal', token: token(), origin: location.origin });
