// The clerk: it reads a PAXT out loud and says plainly where it stands.
//
// It holds no key and has no model or network in wave 1. It never signs, never counts (it reads what
// engine/paxt.js count() returned), never sends and never decides. Every function here is pure, so the page and
// the tests get the same words from the same inputs.
//
// The words follow the copy rules: plain, sentence case, short, no dashes as punctuation. The clerk speaks only
// of who has joined. It never names or numbers anyone who has not. Any key can join through the link and one
// person can hold many keys, so every number it says is a number of keys.

// the same URL pact.js and keys.js use, so the browser loads the engine once
import { canon } from '../../engine/paxt.js?v=1';
import { asDrawn, HIDDEN } from '../../engine/text.js';

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** a whole number as people say it: one to twelve as words, anything larger as digits */
export function spell(n) {
  return Number.isInteger(n) && n >= 0 && n <= 12 ? WORDS[n] : String(n);
}

const upper = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** A moment (ms or Date) as plain English in UTC, the zone the header is written in: "1 December", with the year
    only when it is not the year of `now`, and the time only when it is not the start of the day. */
export function plainDate(when, now) {
  const d = new Date(when instanceof Date ? when.getTime() : when);
  if (Number.isNaN(d.getTime())) return '';
  let s = d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
  const year = new Date(now instanceof Date ? now.getTime() : now).getUTCFullYear();
  if (d.getUTCFullYear() !== year) s += ' ' + d.getUTCFullYear();
  const hh = d.getUTCHours(), mm = d.getUTCMinutes();
  if (hh || mm) s += ' at ' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ' UTC';
  return s;
}

/* ------------------------------------------------------------------ the text */

// The body starts after the line of three dashes, exactly as parseDoc finds it, so the clerk reads the same text
// the hash was taken over. Returns the body's lines with their line numbers in the canonical document.
function bodyLines(doc) {
  const lines = canon(doc).replace(/\n$/, '').split('\n');
  const cut = lines.indexOf('---');
  if (cut < 0) return [];
  return lines.slice(cut + 1).map((text, i) => ({ text, line: cut + 2 + i }));
}

// A list item or an intent line starts a thought of its own, even with no blank line before it.
const STARTS_ITS_OWN = /^\s*(?:[-*+]\s|\d{1,3}[.)]\s|intent:)/i;

// A sentence ends at . ! or ? (with any closing quote or bracket after it) when the next word starts with a
// capital, a digit or an opening quote. A lower-case word after the stop ("e.g. the") is the same sentence.
const SENTENCE_END = /([.!?]["'”’)\]]*)\s+(?=["'“‘(\[]?[A-Z0-9])/g;

/** The document's body as numbered sentences: [{ n, text, line }], n from 1, line the line of the canonical
    document the sentence starts on. A sentence wrapped across lines is read as one. */
export function reading(doc) {
  // gather paragraphs: runs of non-blank lines, each piece remembering where it started
  const paras = [];
  let cur = null;
  for (const { text, line } of bodyLines(doc)) {
    const t = text.trim();
    if (!t) { cur = null; continue; }
    if (!cur || STARTS_ITS_OWN.test(t)) { cur = { parts: [] }; paras.push(cur); }
    cur.parts.push({ text: t, line });
  }
  const out = [];
  for (const p of paras) {
    // join the paragraph with single spaces, keeping a map from each character back to its line
    let joined = '';
    const starts = [];
    for (const part of p.parts) {
      if (joined) joined += ' ';
      starts.push({ at: joined.length, line: part.line });
      joined += part.text;
    }
    const lineAt = (i) => { let l = starts[0].line; for (const s of starts) if (s.at <= i) l = s.line; return l; };
    let from = 0;
    const take = (to) => {
      const raw = joined.slice(from, to);
      const lead = raw.length - raw.trimStart().length;
      const text = raw.trim();
      if (text) out.push({ n: out.length + 1, text, line: lineAt(from + lead) });
    };
    SENTENCE_END.lastIndex = 0;
    let m;
    while ((m = SENTENCE_END.exec(joined))) {
      const end = m.index + m[1].length;
      take(end);
      from = end;
    }
    take(joined.length);
  }
  return out;
}

/** The body's intent line (the first line that starts with "Intent:"), or null when it states none. */
export function intent(body) {
  if (typeof body !== 'string') return null;
  for (const l of body.replace(/\r\n?/g, '\n').split('\n')) {
    const t = l.trim();
    if (/^intent:/i.test(t)) return t;
  }
  return null;
}

/* ------------------------------------------------------------------ where it stands */

/** One plain sentence about where the PAXT stands.
      terms  from parseDoc (threshold, opens, closes in ms)
      count  what count() returned (joined, inForce); null reads as nobody yet
      now    the moment to speak for, in ms or a Date (passed in so this stays pure) */
export function narrate(terms, count, now) {
  const t = now instanceof Date ? now.getTime() : Number(now);
  if (!Number.isFinite(t)) throw new TypeError('narrate needs now.');
  const need = Number(terms && terms.threshold) || 0;
  const joined = Math.max(0, Number(count ? (count.joined ?? (count.by && count.by.join)) : 0) || 0);
  const inForce = count && typeof count.inForce === 'boolean' ? count.inForce : need > 0 && joined >= need;
  const closed = t >= terms.closes;
  const closes = plainDate(terms.closes, t);
  const keys = (n) => spell(n) + (n === 1 ? ' key' : ' keys');

  if (inForce) return 'It is in force: ' + keys(joined) + (joined === 1 ? ' has' : ' have') + ' joined.';
  if (closed) {
    return joined
      ? 'It closed with ' + spell(joined) + ' of the ' + keys(need) + ' it needed.'
      : 'It closed before any key joined. It needed ' + keys(need) + '.';
  }
  if (t < terms.opens) return 'It opens on ' + plainDate(terms.opens, t) + ' and needs ' + keys(need) + ' to join. It closes on ' + closes + '.';
  if (!joined) return 'It needs ' + keys(need) + ' to join. It closes on ' + closes + '.';
  return upper(spell(joined)) + ' of the ' + keys(need) + ' it needs ' + (joined === 1 ? 'has' : 'have') + ' joined. It closes on ' + closes + '.';
}

/* ------------------------------------------------------------------ what changed */

// Past this many cells the exact line match would be slow on a phone, so the clerk falls back to comparing the
// lines as two bags. Documents are capped at 20,000 bytes, so this only matters for very long ones.
const MAX_CELLS = 4_000_000;

/** The lines added and removed between two versions of a document, compared in canonical form:
    { added: [...lines], removed: [...lines] }, each in document order. */
export function whatChanged(oldDoc, newDoc) {
  const a = canon(oldDoc).replace(/\n$/, '').split('\n');
  const b = canon(newDoc).replace(/\n$/, '').split('\n');
  // the lines both share at the start and the end are unchanged; only the middle needs a match
  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;
  let ea = a.length, eb = b.length;
  while (ea > lo && eb > lo && a[ea - 1] === b[eb - 1]) { ea--; eb--; }
  const A = a.slice(lo, ea), B = b.slice(lo, eb);
  if (!A.length || !B.length) return { added: B, removed: A };

  if (A.length * B.length > MAX_CELLS) {
    const left = new Map();
    for (const l of B) left.set(l, (left.get(l) || 0) + 1);
    const removed = [];
    for (const l of A) { const k = left.get(l) || 0; if (k) left.set(l, k - 1); else removed.push(l); }
    const right = new Map();
    for (const l of A) right.set(l, (right.get(l) || 0) + 1);
    const added = [];
    for (const l of B) { const k = right.get(l) || 0; if (k) right.set(l, k - 1); else added.push(l); }
    return { added, removed };
  }

  // longest common run of lines, table filled from the end so the walk below goes forward
  const w = B.length + 1;
  const L = new Uint32Array((A.length + 1) * w);
  for (let i = A.length - 1; i >= 0; i--) {
    for (let j = B.length - 1; j >= 0; j--) {
      L[i * w + j] = A[i] === B[j] ? L[(i + 1) * w + j + 1] + 1 : Math.max(L[(i + 1) * w + j], L[i * w + j + 1]);
    }
  }
  const added = [], removed = [];
  let i = 0, j = 0;
  while (i < A.length && j < B.length) {
    if (A[i] === B[j]) { i++; j++; }
    else if (L[(i + 1) * w + j] >= L[i * w + j + 1]) removed.push(A[i++]);
    else added.push(B[j++]);
  }
  while (i < A.length) removed.push(A[i++]);
  while (j < B.length) added.push(B[j++]);
  return { added, removed };
}

/* ------------------------------------------------------------------ what to read before joining */

// The clerk points at a few things worth reading closely before anyone signs. It matches plain patterns, with no
// model, and says what each thing is without guessing why it was written. A false mark teaches people to skip
// the true ones, so every pattern is narrow: the word "money" alone is never marked (the intent line every new
// PAXT starts with says it "moves no money"), and "can't leave the gate open" is not a way out being closed.

export const MAX_MARKS = 3;
const DAY_MS = 86400000;
const AP = "['’]";

// an amount: a currency sign before a number, a code or a currency word beside one
const MONEY = [
  /[$€£¥₹₿]\s?\d/,
  // starts only where a number starts, so a long run of digits is read once and not once from every digit
  /(?<![\d,.])\d[\d,.]*\s?(?:USD|EUR|GBP|JPY|CHF|CAD|AUD|BTC|ETH|USDC|USDT|DAI|DASH)\b/,
  /\b(?:USD|EUR|GBP|JPY|CHF|CAD|AUD|BTC|ETH|USDC|USDT|DAI|DASH)\s?\d/,
  /\b\d[\d,.]*\s?(?:dollars?|euros?|cents|bucks|sats|satoshis?|bitcoins?|rupees|pesos|yen)\b/i,
  /\d\s?Dash\b/,
  // a currency named on its own
  /\b(?:USD|EUR|GBP|USDC|USDT|DASH)\b/,
  /\$[A-Z]{2,6}\b/,
  /\b(?:dollars|euros|bitcoin|ethereum|tether|stablecoins?|dogecoin|litecoin|monero)\b/i,
];

// a wallet address: Ethereum style, bech32, Dash, and a legacy Bitcoin address that mixes digits and both cases
const B58 = '[1-9A-HJ-NP-Za-km-z]';
const WALLET = [
  /\b0x[0-9a-fA-F]{40}\b/,
  /\b(?:bc1|tb1|ltc1)[02-9ac-hj-np-z]{11,71}\b/,
  new RegExp('\\bX' + B58 + '{33}\\b'),
];
const LEGACY = new RegExp('\\b[13]' + B58 + '{25,34}\\b', 'g');

// Each pattern below is a regular expression, or a function of the sentence for the ones that need two things
// in it at once. Everyday words with a second meaning (backup keys to a house, a family's secret words, a
// mnemonic for bin day) count only beside a wallet word.
const WALLETISH = /\b(?:wallets?|crypto|seed|bitcoin|ethereum|metamask)\b/i;
const SECRET = [
  /\b(?:seed|recovery)\s+(?:phrases?|words?)\b/i,
  /\bmnemonic\s+(?:phrases?|seeds?|words)\b/i,
  /\bprivate\s+keys?\b/i,
  /\bverify\s+(?:your|the|their)\s+wallets?\b/i,
  /\bwallet\s+verification\b/i,
  /\bconnect\s+your\s+wallet\b/i,
  /\b(?:12|24|twelve|twenty[- ]four)[- ]word\s+(?:seed|recovery)\b/i,
  (s) => /\b(?:12|24|twelve|twenty[- ]four)[- ]word\b/i.test(s) && WALLETISH.test(s),
  (s) => /\b(?:secret|backup)\s+(?:phrases?|words?|keys?)\b/i.test(s) && WALLETISH.test(s),
];

// Words that rush count only when they press the reader to join, sign or answer: "there is no hurry", "urgent
// care" and "don't wait up" are everyday words. "No hurry" and its kin are taken out before anything is read.
const CALM = /\b(?:no|in no|not in a|not in any|no need to)\s+(?:hurry|rush)\b/gi;
const JOINING = /\b(?:join|joining|sign|signing|sign up|reply|respond|confirm)\b/i;
const READER = /\b(?:you|your|join|joining|sign|signing)\b/i;
const RUSH = [
  // a deadline in hours, said to the reader or to someone joining ("Reply within 24 hours or your place goes")
  (s) => /\bwithin\s+(?:\d+|an?|one|two|three|four|six|twelve|few|the next|twenty[- ]four|forty[- ]eight)\s+(?:\w+\s+)?(?:hours?|hrs?|minutes?|mins?)\b/i.test(s)
    && (READER.test(s) || /^\s*(?:reply|respond|answer|confirm|join|sign)\b/i.test(s)),
  /\bact\s+(?:now|fast|quickly)\b/i,
  /\burgent(?:ly)?\s*[:!,-]?\s*(?:join|sign|reply|respond|confirm|act)\b/i,
  (s) => /\burgent\b/i.test(s) && /\b(?:you|we)\s+(?:must|need to|have to)\s+(?:join|sign)\b/i.test(s),
  /^\s*hurry\b/i,
  (s) => /\bhurry\b/i.test(s) && JOINING.test(s),
  /\blast chance to (?:join|sign)\b/i,
  /\blimited[- ]time\s+(?:offer|only)\b/i,
  /\bfor a limited time only\b/i,
  /^\s*today only\b/i,
  (s) => /\btoday only\b/i.test(s) && JOINING.test(s),
  (s) => /\bexpires?\s+(?:today|tonight|in\s+\d+\s+(?:hours?|minutes?|days?))\b/i.test(s) && /\b(?:join|sign|place|spot|seat|offer)\b/i.test(s),
  new RegExp('\\b(?:don' + AP + '?t|do not)\\s+wait\\s*,?\\s+(?:to\\s+(?:join|sign)\\b|or\\b)', 'i'),
  (s) => /\b(?:as soon as possible|asap)\b/i.test(s) && JOINING.test(s),
  new RegExp('\\b(?:join|sign)\\b[^.!?]*\\bbefore it' + AP + '?s too late\\b', 'i'),
];

// The thing that cannot be left must be the agreement itself: "nobody can leave the table" and "the cat can't
// leave" are house rules.
const CANT = '(?:cannot|can' + AP + '?t|can not|may not|must not|will not be able to|won' + AP + 't be able to)';
const AGREEMENT = '(?:this|the|our)\\s+(?:paxt|agreement|promise|pact|group|deal|circle)';
const WHO = '(?:you|we|anyone who joins|anyone|members?|partners?)';
const NO_EXIT = [
  new RegExp('\\b' + CANT + '\\s+(?:ever\\s+)?(?:leave|exit|quit|withdraw from|back out of)\\s+' + AGREEMENT + '\\b', 'i'),
  new RegExp('\\b' + WHO + '\\s+' + CANT + '\\s+(?:ever\\s+)?leave(?:\\s+(?:again|later|afterwards))?\\s*(?:[.!;]|$)', 'i'),
  new RegExp('\\b(?:can|may)\\s+never\\s+(?:leave|exit|quit|withdraw from|back out of)\\s+' + AGREEMENT + '\\b', 'i'),
  new RegExp('\\b' + WHO + '\\s+(?:can|may)\\s+never\\s+(?:leave|exit|quit|withdraw|back out)\\b', 'i'),
  /\b(?:can|may)\s+never\s+(?:be undone|be left|be reversed)\b/i,
  new RegExp('\\b(?:cannot|can' + AP + '?t|can not)\\s+be\\s+(?:undone|reversed|withdrawn|revoked|cancell?ed|left|taken back)\\b', 'i'),
  /\birreversibl[ey]\b/i,
  /\birrevocabl[ey]\b/i,
  /\bno\s+(?:way out|way to leave)\b/i,
  (s) => /\bno\s+(?:going back|way back|turning back)\b/i.test(s) && /\b(?:join|joins|joined|sign|signs|signed|paxt|agreement|promise|pact)\b/i.test(s),
  new RegExp('\\b(?:no one|nobody|none of us)\\s+(?:can|may)\\s+(?:ever\\s+)?leave(?:\\s+' + AGREEMENT + ')?(?:\\s+(?:once|after|again|later)\\b|\\s*(?:[.!;]|$))', 'i'),
  /\b(?:forever|permanently)\s+binding\b/i,
  /\bbinding\s+forever\b/i,
];

const TLD = 'com|net|org|io|xyz|app|co|me|ly|gg|link|site|online|info|biz|top|club|live|cc|dev|ai|sh|fun|shop|store|page|tk|ru|cn|ws|vip|win|click';
const URLISH = /\b(?:https?:\/\/|www\.)[^\s<>"'()]+/gi;
const BARE = new RegExp('(^|[^@\\w.-])((?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+(?:' + TLD + '))(?![\\w-])', 'gi');
const HOME = 'gratus.cc';

// the site a link points at, lower case, without a scheme, a name and password, a port or trailing punctuation
function hostOf(link) {
  let h = link.replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').split(/[/?#\\]/)[0];
  h = h.slice(h.lastIndexOf('@') + 1).replace(/:\d*$/, '').replace(/[.,;:!?)\]"'’”]+$/, '');
  return h.toLowerCase();
}
const ours = (h) => h === HOME || h.endsWith('.' + HOME);

/** the first site other than gratus.cc that a sentence links to, or null */
export function otherSite(text) {
  const s = String(text || '');
  for (const m of s.matchAll(URLISH)) { const h = hostOf(m[0]); if (h && !ours(h)) return h; }
  // a bare name: read on to the next space, so evil.com.au is read whole and gratus.cc.evil.com is not ours
  for (const m of s.matchAll(BARE)) {
    const word = s.slice(m.index + m[1].length).split(/\s/)[0];
    // "mine.Me and you": a sentence typed without a space after its full stop, not a site. A bare name whose
    // ending starts with a capital is read as a site only with a path or a second dot.
    const labels = m[2].split('.');
    const tld = labels[labels.length - 1];
    if (/^[A-Z]/.test(tld) && labels.length === 2 && word.charAt(m[2].length) !== '/') continue;
    const h = hostOf(word);
    if (h && !ours(h)) return h;
  }
  return null;
}

function walletIn(s) {
  if (WALLET.some((re) => re.test(s) || re.test(s.toLowerCase()))) return true;
  for (const m of s.matchAll(LEGACY)) if (/\d/.test(m[0].slice(1)) && /[A-Z]/.test(m[0]) && /[a-z]/.test(m[0])) return true;
  return false;
}

const any = (list) => (s) => list.some((t) => (typeof t === 'function' ? t(s) : t.test(s)));
const rushed = (s) => any(RUSH)(s.replace(CALM, ''));

// The marks read a sentence as it is drawn, with the characters nobody sees taken out, so one zero-width space
// inside "seed phrase" or a wallet address cannot hide it. A sentence holding such characters gets a mark of its
// own. parseGarden already refuses them in a garden document; this is the second layer, for any text read here.
const UNSEEN_ALL = new RegExp(HIDDEN.source, 'gu');
const plainOf = (s) => asDrawn(s).replace(UNSEEN_ALL, '');
const hiddenIn = (s) => HIDDEN.test(asDrawn(s));

// in the order they are kept when more than three are found: what could cost someone most comes first
const KINDS_OF_MARK = [
  { kind: 'hidden', test: hiddenIn, raw: true, say: () => 'It holds characters you cannot see, or ones that turn text around, so it may not say what it seems to.' },
  { kind: 'secret', test: any(SECRET), say: () => 'It mentions a seed phrase, recovery words, a private key or verifying a wallet. Joining a PAXT never needs any of them.' },
  { kind: 'wallet', test: walletIn, say: () => 'It holds a wallet address. Joining a PAXT sends nothing to any address.' },
  { kind: 'link', test: (s) => !!otherSite(s), say: (s) => 'It links to a site other than ' + HOME + ': ' + otherSite(s) + '.' },
  { kind: 'money', test: any(MONEY), say: () => 'It names an amount of money or a currency. Joining moves no money.' },
  { kind: 'no-exit', test: any(NO_EXIT), say: () => 'It says this can never be undone or left. Any key that joined can still sign a leave line until it closes.' },
  { kind: 'rush', test: rushed, say: () => 'These words ask the reader to hurry.' },
];
const ORDER = ['hidden', 'secret', 'wallet', 'link', 'money', 'no-exit', 'rush', 'short'];

/** What to read closely before joining: at most three marks, [{ kind, n, line, quote, say }].
      doc    the document; each mark quotes its sentence from reading(doc), n is that sentence's number
      terms  from parseDoc, when known. It adds the one mark that reads the header: a closing time less than a
             day after the opening. That mark quotes the closes line and has n null.
    Each kind is marked once, at its first sentence. When more than three kinds are found, the first three in
    ORDER are kept, then shown in the order they appear in the text. */
export function marks(doc, terms) {
  const found = new Map();
  for (const s of reading(doc)) {
    const plain = plainOf(s.text);
    for (const k of KINDS_OF_MARK) {
      const t = k.raw ? s.text : plain;
      if (found.has(k.kind) || !k.test(t)) continue;
      found.set(k.kind, { kind: k.kind, n: s.n, line: s.line, quote: s.text, say: k.say(t) });
    }
  }
  if (terms && Number.isFinite(terms.opens) && Number.isFinite(terms.closes) && terms.closes - terms.opens < DAY_MS) {
    const lines = canon(doc).split('\n');
    const at = lines.findIndex((l) => l.startsWith('closes: '));
    found.set('short', { kind: 'short', n: null, line: at + 1, quote: at >= 0 ? lines[at] : 'closes', say: 'It closes less than a day after it opens.' });
  }
  return ORDER.filter((k) => found.has(k)).slice(0, MAX_MARKS).map((k) => found.get(k))
    .sort((a, b) => (a.line - b.line) || ((a.n ?? 0) - (b.n ?? 0)));
}
