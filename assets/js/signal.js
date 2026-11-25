// The signal block in a Vibe room: the room's signals, a tap on one, and the sheet that asks a new one.
//
// A signal is a quick read of a room. It binds no one, and nobody sees who chose what (api/signal.js). This
// device answers with a token it computes itself, HMAC-SHA256(a secret kept on this device, the signal id), so
// the server sees a different token for every signal, and no token or tap the store keeps ties one answer from
// this device to another. A read does send all of this device's tokens for a room in one request, with its
// address; the server uses them for that read and keeps none of it. The day's call markers are the store's one
// link between taps, and the privacy page says what they could show.
// The secret is 32 random bytes in localStorage under gratus-signal-secret and never leaves the device.
//
// While a signal is open the block shows no number about it, not even one a row carries: after a tap it shows
// this device's own choice, that it can change it, and that counts show when the signal closes. Once the signal
// has closed it shows the counts the server sent and how many devices answered. The block never works a count
// out on its own, never names anyone, never lists who has or has not answered, and never reminds anyone to answer.
//
// galaxy.js loads this with import() when a room opens: mountSignals(host, { code }) fills the slot, and
// ask(code) opens the sheet. setSheet(fn) passes the app's own sheet so the phone's back step closes it.
import { esc, $, $$, sheet as rawSheet, toast } from './ui.js?v=14';
import { plainDate } from './clerk.js?v=1';
import { asDrawn, HIDDEN } from '../../engine/text.js';

const API = '/api/signal';
/** where this device keeps its secret: 32 random bytes in unpadded base64url */
export const SECRET_KEY = 'gratus-signal-secret';
// the signals this device has answered, by room: { [code]: [signal id] }. Only this device reads it. It holds
// no choice, only which signals to send a token for, so a read asks about no signal this device never answered.
const TAPPED_KEY = 'gratus-signal-tapped';
// how long a room's signals fetched a moment ago are shown again without asking the server
const FRESH_MS = 15000;

/** the design's words (DESIGN-1-5.md, section 4) */
export const SHEET_LINE = 'A quick read of the room. It binds no one, and nobody sees who chose what.';
export const TAP_LINE = 'You answered. You can change it until it closes.';
export const CLOSED_LINE = 'This signal has closed.';
export const MANY_LINE = 'One person can answer from more than one device.';
/** said when an answer was sent and no reply came back, so it may or may not have arrived */
export const MAYBE_LINE = 'The answer may not have arrived. Checking the room again.';
/** said after a tap while the signal is open, when the server has not sent its own words for it; the same
    words as api/signal.js WORDS.held */
export const HELD_LINE = 'Counts show when the signal closes.';
/** said in place of TAP_LINE when this browser could not keep the secret, so the answer is lost with the page */
export const UNKEPT_LINE = 'You answered. This browser cannot keep the key to your answer, so you cannot see or change it after this page closes.';
/** said when a send failed and no server answered, in place of the browser's own words such as "Failed to fetch" */
export const NOT_SENT = 'It could not be sent. Check the connection and try again.';
/** said when a question may have reached the room before its reply was lost */
export const MAYBE_ASKED = 'The reply was lost, so it may or may not have been asked. Check the room before you ask again.';

/** Whether a signal the room lists is the one the sheet asked: still open, the same question, the same choices. */
export function askedAlready(s, q, choices) {
  const cs = (choices || []).map((c) => String(c ?? '').trim());
  return !!s && s.closed !== true && s.q === String(q ?? '').trim() && Array.isArray(s.choices) && s.choices.join('\n') === cs.join('\n');
}

/** The words for a failed send: a server's refusal as it came (an error made with said set), and plain words for
    anything else. */
export function failWords(e, fallback = NOT_SENT) {
  return e && e.said === true && typeof e.message === 'string' && e.message.trim() ? e.message : fallback;
}
const refusal = (msg) => Object.assign(new Error(msg), { said: true });

export const CAP_Q = 120;
export const CAP_CHOICE = 40;
export const DAYS = [1, 3, 7];
const SID = /^[A-Za-z0-9_-]{16}$/;
// the server's text rule (api/signal.js textOf), run on the text as drawn: < and >, control and format
// characters, the line and paragraph separators, and the hidden characters the name rule refuses
const UNSAFE = /[<>\p{Cc}\p{Cf}\u{2028}\u{2029}]/u;
const hides = (t) => { const d = asDrawn(t); return UNSAFE.test(d) || HIDDEN.test(d); };

let sheetFn = rawSheet;
/** The sheet to open with. The app's own sheet ties a sheet to the phone's back step. */
export function setSheet(fn) { if (typeof fn === 'function') sheetFn = fn; }

/* ------------------------------------------------------------------ pure helpers (Node can run these) */

/** bytes as unpadded base64url */
export function toB64url(bytes) {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** unpadded base64url back to bytes, or null when it is not that */
export function fromB64url(text) {
  if (typeof text !== 'string' || !/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const bin = atob(text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (text.length % 4)) % 4));
    const out = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return toB64url(out) === text ? out : null;
  } catch (e) { return null; }
}

// a secret made when localStorage cannot keep one: it lasts until the page closes
let fallbackSecret = null;
// whether the last secret handed out is one localStorage keeps
let secretKeptNow = true;
/** Whether the secret deviceSecret last handed out is kept by this browser. False when storage refused it, so an
    answer made with it cannot be seen or changed once the page closes. */
export function secretKept() { return secretKeptNow; }
/** This device's secret, made the first time it is asked for. storage is localStorage; random(n) returns n
    random bytes. A stored value that is not 32 bytes is replaced. */
export function deviceSecret(storage = globalThis.localStorage, random = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  try {
    const kept = fromB64url(storage.getItem(SECRET_KEY));
    if (kept && kept.length === 32) { secretKeptNow = true; return kept; }
    const made = random(32);
    storage.setItem(SECRET_KEY, toB64url(made));
    secretKeptNow = true;
    return made;
  } catch (e) {
    fallbackSecret ||= random(32);
    secretKeptNow = false;
    return fallbackSecret;
  }
}

/** The token this device sends for one signal: HMAC-SHA256(secret, signal id) in unpadded base64url, 43
    characters, made with WebCrypto. The secret never leaves this function. */
export async function tokenFor(secret, sid, subtle = globalThis.crypto.subtle) {
  const key = await subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return toB64url(new Uint8Array(await subtle.sign('HMAC', key, new TextEncoder().encode(String(sid)))));
}

/** Why the sheet's fields cannot be sent, or null. The server holds the same limits and has the last word. */
export function askProblem({ q, choices, days }) {
  const t = String(q ?? '').trim();
  if (!t) return 'Write a question.';
  if ([...t].length > CAP_Q) return 'Keep the question to ' + CAP_Q + ' characters.';
  if (hides(t)) return 'The question has a character that cannot be kept: < or >, or a hidden mark.';
  const cs = (choices || []).map((c) => String(c ?? '').trim()).filter(Boolean);
  if (cs.length < 2) return 'Give at least two choices.';
  if (cs.length > 4) return 'Give at most four choices.';
  if (cs.some((c) => [...c].length > CAP_CHOICE)) return 'Keep each choice to ' + CAP_CHOICE + ' characters.';
  if (cs.some(hides)) return 'A choice has a character that cannot be kept: < or >, or a hidden mark.';
  if (new Set(cs.map((c) => c.normalize('NFKC').toLowerCase().replace(/\s+/g, ' '))).size !== cs.length) return 'Two choices are the same.';
  if (!DAYS.includes(Number(days))) return 'Choose when it closes.';
  return null;
}

const devices = (n) => n + (n === 1 ? ' device answered.' : ' devices answered.');
const isCount = (x) => Number.isInteger(x) && x >= 0;

/** One signal's HTML. s is a row as the server sends it; held is the line to show after a tap while it is open;
    kept is false when this browser could not keep the secret the answer was made with. */
export function signalHtml(s, { busy = '', held = HELD_LINE, now = Date.now(), kept = true } = {}) {
  if (!s || typeof s !== 'object' || !SID.test(String(s.id)) || !Array.isArray(s.choices)) return '';
  const closed = s.closed === true;
  const mine = Number.isInteger(s.mine) && s.mine >= 0 && s.mine < s.choices.length ? s.mine : null;
  // counts are read only from a closed row, so an open signal never shows a number
  const counts = closed && Array.isArray(s.counts) && s.counts.length === s.choices.length && s.counts.every(isCount) ? s.counts : null;
  const when = Date.parse(s.closes);
  // a soft well inside the room's Signals card (pact.css)
  let out = '<div class="signal" data-sg="' + esc(s.id) + '">' +
    '<b class="signal-q">' + esc(s.q) + '</b>';
  if (!closed) {
    out += '<div class="chips signal-choices">' + s.choices.map((c, i) =>
      '<button class="chip' + (mine === i ? ' on' : '') + '" data-sg-sid="' + esc(s.id) + '" data-sg-c="' + i + '" aria-pressed="' + (mine === i) + '"' +
      (busy === s.id ? ' disabled' : '') + '>' + esc(c) + '</button>').join('') + '</div>';
  }
  if (closed) {
    if (counts) {
      out += '<ul class="signal-counts" role="list">' + s.choices.map((c, i) =>
        '<li' + (mine === i ? ' class="mine"' : '') + '><span>' + esc(c) + '</span><b>' + counts[i] + '</b></li>').join('') + '</ul>' +
        '<p class="cap">' + esc(devices(isCount(s.answered) ? s.answered : counts.reduce((a, b) => a + b, 0)) + ' ' + MANY_LINE) + '</p>';
    }
    out += '<p class="cap">' + esc(CLOSED_LINE) + '</p>';
  } else {
    if (mine !== null) out += '<p class="cap">' + esc(kept === false ? UNKEPT_LINE : TAP_LINE) + '</p><p class="cap">' + esc(held) + '</p>';
    if (Number.isFinite(when)) out += '<p class="cap">Closes on ' + esc(plainDate(when, now)) + '.</p>';
  }
  return out + '</div>';
}

/** The block's HTML. st = { signals, note, held, busy, failed, loading }. note is the server's room line, said
    once; held is the server's line, sent with a tap, for when counts show. Every string goes through esc(). */
export function blockHtml(st, now = Date.now()) {
  const rows = (st && Array.isArray(st.signals) ? st.signals : []).map((s) => signalHtml(s, { busy: st.busy || '', held: st.held || HELD_LINE, now, kept: st.kept !== false })).filter(Boolean);
  let out = '';
  if (st && st.failed) {
    out += '<p class="cap">The signals could not be read. Check the connection and try again.</p>' +
      '<div class="actions"><button class="btn sm" data-sg-retry>Try again</button></div>';
  } else if (st && st.loading && !rows.length) {
    out += '<p class="cap">Reading the signals...</p>';
  } else if (!rows.length) {
    out += '<p class="cap">Nobody has asked this room anything yet.</p>';
  }
  if (rows.length) out += '<div class="signals">' + rows.join('') + '</div>';
  const note = st && typeof st.note === 'string' && st.note.trim() ? st.note : SHEET_LINE;
  return out + '<p class="cap signal-note">' + esc(note) + '</p>';
}

/* ------------------------------------------------------------------ this device */

function tappedAll() {
  try { const v = JSON.parse(localStorage.getItem(TAPPED_KEY) || '{}'); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; } catch (e) { return {}; }
}
function tappedIn(code) { const v = tappedAll()[code]; return Array.isArray(v) ? v.filter((x) => SID.test(String(x))) : []; }
function rememberTap(code, sid) {
  try {
    const all = tappedAll();
    const list = tappedIn(code).filter((x) => x !== sid);
    list.push(sid);
    // the server lists at most 40 signals a room, and a read takes 50 tokens at most
    all[code] = list.slice(-40);
    localStorage.setItem(TAPPED_KEY, JSON.stringify(all));
  } catch (e) {}
}

/** Forget which signals this device answered in one room, for when it leaves the room. The secret stays, so an
    answer given elsewhere is still this device's. */
export function forgetRoom(code, storage = globalThis.localStorage) {
  try {
    const all = JSON.parse(storage.getItem(TAPPED_KEY) || '{}');
    if (!all || typeof all !== 'object' || Array.isArray(all) || !(code in all)) return;
    delete all[code];
    if (Object.keys(all).length) storage.setItem(TAPPED_KEY, JSON.stringify(all));
    else storage.removeItem(TAPPED_KEY);
  } catch (e) {}
  rooms.delete(code);
}

/** Forget everything this device keeps for signals: its secret and the list of signals it answered. After this
    the device makes a new secret, so the answers it gave before are no longer its own. */
export function forgetDevice(storage = globalThis.localStorage) {
  try { storage.removeItem(SECRET_KEY); storage.removeItem(TAPPED_KEY); } catch (e) {}
  fallbackSecret = null;
  rooms.clear();
}

/* ------------------------------------------------------------------ the block */

// what this page last read for each room: { [code]: { at, signals, note, held, busy, failed, loading } }
const rooms = new Map();
let mounted = null;   // { host, code }

const stateOf = (code) => {
  if (!rooms.has(code)) rooms.set(code, { at: 0, signals: [], note: '', held: '', busy: '', failed: false, loading: false });
  return rooms.get(code);
};

async function post(body) {
  const r = await fetch(API, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  return { r, d };
}

/** Fill host with the room's signals and connect its buttons. A room read a moment ago is shown again at once. */
export function mountSignals(host, { code } = {}) {
  if (!host || !code) return;
  mounted = { host, code };
  const st = stateOf(code);
  paint();
  // a failed read waits as long as a good one before the next repaint asks again; Try again asks at once
  if (st.loading || (st.at && Date.now() - st.at < FRESH_MS)) return;
  load(code);
}

function paint() {
  if (!mounted || !mounted.host.isConnected) return;
  const { host, code } = mounted;
  const html = blockHtml(stateOf(code));
  if (host.dataset.sgPainted === html) return;
  host.innerHTML = html;
  host.dataset.sgPainted = html;
  $$('[data-sg-sid]', host).forEach((b) => b.addEventListener('click', () => tap(code, b.dataset.sgSid, Number(b.dataset.sgC))));
  const again = $('[data-sg-retry]', host);
  if (again) again.addEventListener('click', () => { stateOf(code).failed = false; load(code); });
}

async function load(code) {
  const st = stateOf(code);
  st.loading = true; paint();
  try {
    const tokens = {};
    const ids = tappedIn(code);
    if (ids.length) {
      const secret = deviceSecret();
      st.kept = secretKept();
      for (const sid of ids) tokens[sid] = await tokenFor(secret, sid);
    }
    const { r, d } = await post({ act: 'read', code, tokens });
    if (!r.ok || !Array.isArray(d.signals)) throw new Error(d && d.error);
    st.signals = d.signals; st.note = typeof d.note === 'string' ? d.note : ''; st.failed = false; st.at = Date.now();
  } catch (e) {
    st.failed = true; st.at = Date.now();
  }
  st.loading = false;
  paint();
}

async function tap(code, sid, c) {
  const st = stateOf(code);
  if (st.busy || !SID.test(String(sid)) || !Number.isInteger(c)) return;
  st.busy = sid; paint();
  let sent = false;
  try {
    const token = await tokenFor(deviceSecret(), sid);
    st.kept = secretKept();
    // Noted before it is sent: an answer can reach the server and its reply be lost, and a later read only asks
    // about signals noted here. A read for a signal this device never answered gets nothing back for it.
    rememberTap(code, sid);
    sent = true;
    const { r, d } = await post({ act: 'tap', code, sid, token, c });
    if (r.ok && d.signal) {
      st.signals = st.signals.map((x) => (x.id === sid ? d.signal : x));
      // the server's own words for when counts show, shown as they came
      if (typeof d.note === 'string' && d.note.trim()) st.held = d.note;
    } else if (r.ok) {
      // the server took it but its reply did not read: a fresh read shows where the answer stands
      toast(MAYBE_LINE, 4200);
      st.at = 0;
    } else {
      toast(d && typeof d.error === 'string' ? d.error : 'The answer could not be sent.', 4200);
      // a signal that closed meanwhile shows as closed after a fresh read
      if (r.status === 409) st.at = 0;
    }
  } catch (e) {
    if (sent) {
      // the reply was lost, so whether the answer arrived is not known: read the room again, which shows it
      toast(MAYBE_LINE, 4200);
      st.at = 0;
    } else {
      toast('The answer could not be sent. Check the connection and try again.', 4200);
    }
  }
  st.busy = '';
  paint();
  if (!st.at) load(code);
}

/* ------------------------------------------------------------------ asking */

// A browser counts maxlength in UTF-16 units, where most emoji take two, while the limits count characters, and
// no character takes more than two units. So each field allows twice its limit in units, which always fits a
// text at the limit, and askProblem holds the real limit and says so in words.
const unitsFor = (cap) => 2 * cap;

/** The sheet that asks the room one question. */
export function askSheetHtml() {
  const choice = (i, hint) => '<input class="field" data-sg-choice="' + i + '" maxlength="' + unitsFor(CAP_CHOICE) + '" placeholder="' + esc(hint) + '" aria-label="choice ' + (i + 1) + '">';
  return '<div class="hero-sm"><h2>Ask the room</h2><span class="kicker mint">A signal</span></div>' +
    '<p class="body">' + esc(SHEET_LINE) + '</p>' +
    '<input class="field" id="sg-q" maxlength="' + unitsFor(CAP_Q) + '" placeholder="your question" aria-label="the question">' +
    choice(0, 'a choice') + choice(1, 'another choice') + choice(2, 'a third, if you want one') + choice(3, 'a fourth, if you want one') +
    '<span class="kicker">It closes after</span>' +
    '<div class="chips">' + DAYS.map((d) => '<button class="chip' + (d === 3 ? ' on' : '') + '" data-sg-days="' + d + '" aria-pressed="' + (d === 3) + '">' + d + (d === 1 ? ' day' : ' days') + '</button>').join('') + '</div>' +
    '<button class="btn mint wide" id="sg-go">Ask it</button>' +
    '<p class="cap">Everyone with the room code sees the question and the choices.</p>';
}

/** Open the sheet that asks the room one question, and show the new signal in the block. */
export function ask(code) {
  if (!code) return;
  const sh = sheetFn(askSheetHtml(), { autofocus: true });
  let days = 3;
  $$('[data-sg-days]', sh.el).forEach((b) => b.addEventListener('click', () => {
    days = Number(b.dataset.sgDays);
    $$('[data-sg-days]', sh.el).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
  }));
  const go = $('#sg-go', sh.el);
  go.addEventListener('click', async () => {
    const q = $('#sg-q', sh.el).value.trim();
    const choices = $$('[data-sg-choice]', sh.el).map((x) => x.value.trim()).filter(Boolean);
    const bad = askProblem({ q, choices, days });
    if (bad) { toast(bad); return; }
    go.disabled = true; go.textContent = 'Asking...';
    try {
      const { r, d } = await post({ act: 'open', code, q, choices, days });
      if (!r.ok || !d.signal) throw refusal(d && typeof d.error === 'string' ? d.error : 'It was not asked.');
      const st = stateOf(code);
      st.signals = [d.signal, ...st.signals.filter((x) => x.id !== d.signal.id)];
      sh.close();
      paint();
    } catch (e) {
      if (!(e && e.said)) {
        // The question may have reached the room before the reply was lost. The room is read again before
        // another ask, so one tap never asks it twice and spends two of the room's places.
        go.textContent = 'Checking the room...';
        await load(code);
        const st = stateOf(code);
        if (!st.failed && st.signals.some((s) => askedAlready(s, q, choices))) { sh.close(); paint(); toast('It was asked.'); return; }
        go.disabled = false; go.textContent = 'Ask it';
        toast(st.failed ? MAYBE_ASKED : NOT_SENT, 4200);
        return;
      }
      go.disabled = false; go.textContent = 'Ask it';
      toast(failWords(e, 'It was not asked.'), 4200);
    }
  });
}
