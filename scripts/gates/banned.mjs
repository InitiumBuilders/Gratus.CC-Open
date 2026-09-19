// Gate 2 + 9 + 10 + 13 + 14 — banned patterns and forbidden words across source, config, and HTML.
//   presence gate: streak / missed / days since / we miss you / come back
//   money-words gate: yield / interest / APY / earn on / return on  (allowed only in /money, /futures, and the wallet disclosure, to say what the app does NOT do)
//   equality gate: level / tier / rank / leaderboard / badge count
//   naming gate: the codename never in UI
//   design bans: linear single-property fades on essentials are a review item; here we grep the greppable ones
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const SKIP = new Set(['node_modules', '.git', '.vercel', 'scripts', 'docs']);
const EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest']);
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out); else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}
const files = walk(root, []);
const rel = (p) => path.relative(root, p).replace(/\\/g, '/');

const PRESENCE = [/\bstreaks?\b/i, /\bmissed\b/i, /\bdays since\b/i, /\bwe miss you\b/i, /\bcome back\b/i];
const MONEY = [/\byield/i, /\binterest\b/i, /\bAPY\b/, /\bearn on\b/i, /\breturn on\b/i];
const EQUALITY = [/\bleaderboards?\b/i, /\bbadge count/i, /\btiers?\b/i, /\branks?\b/i, /\bXP\b/];
const CODENAME = [/Groundlight/];
// gradient text is allowed only through the one .grad-text class (the mockups' hero voice); auto-fit card grids and constant-speed rotation stay banned
const DESIGN = [/repeat\(auto-fit/, /rotate\(360deg\)/];

const moneyAllowed = (f) => /(^|\/)(money|futures)\.html$/.test(f) || /config\/copy\.json$/.test(f) || /scripts\//.test(f);
// the locked wallet disclosure may appear anywhere: it says what the app does NOT do
const DISCLOSURE = /Nothing here pays interest/;
const NEGATED = /\b(no|never|not|nothing|without)\b[^.]{0,40}\b(tiers?|ranks?|leaderboards?|interest|yield|APY)/i;
let hits = 0;
for (const file of files) {
  const f = rel(file); const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split('\n');
  const check = (rules, tag, allow) => {
    if (allow) return;
    lines.forEach((ln, i) => { if (DISCLOSURE.test(ln) || NEGATED.test(ln)) return; for (const re of rules) if (re.test(ln)) { hits++; console.log(tag.padEnd(9), f + ':' + (i + 1), ln.trim().slice(0, 110)); } });
  };
  // the gates themselves list the words; ignore this file and copy.json's forbidden list
  if (f.endsWith('banned.mjs')) continue;
  check(PRESENCE, 'presence', /config\/copy\.json$/.test(f));
  check(MONEY, 'money', moneyAllowed(f));
  check(EQUALITY, 'equality', /config\/copy\.json$/.test(f));
  check(CODENAME, 'codename', /\.md$/.test(f));
  if (/\.(css|html)$/.test(f)) check(DESIGN, 'design', false);
}
console.log('banned-pattern gate:', files.length, 'files ·', hits, 'hits');
if (hits) { console.log('BANNED GATE: FAIL'); process.exit(1); }
console.log('BANNED GATE: PASS');
