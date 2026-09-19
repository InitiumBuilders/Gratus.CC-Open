// Gate 2 + 9 + 10 + 13 + 14: banned patterns and forbidden words across source, config, and HTML.
//   presence gate: streak / missed / days since / we miss you / come back
//   money-words gate: yield / interest / APY / earn on / return on  (allowed only in /money, /futures, and the wallet disclosure, to say what the app does NOT do)
//   equality gate: level / tier / rank / leaderboard / badge count
//   naming gate: the codename never in UI
//   design bans: linear single-property fades on essentials are a review item; here we grep the greppable ones
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

// docs/ used to be skipped and .md was not an extension this gate read, so
// README.md, DECISIONS.md, IMAGINED.md and every file under docs/ had never been
// scanned by any gate in this repository.
const SKIP = new Set(['node_modules', '.git', '.vercel', 'scripts', 'attic']);
const EXT = new Set(['.html', '.js', '.mjs', '.css', '.json', '.webmanifest', '.md']);
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

// config/copy.json -> voice.forbidden is this house's own list of words it never
// ships, and until now it was read by nothing: this gate carried its own copy of
// the regexes instead. Now the list is the source, so adding a word to it is what
// bans the word.
const FORBIDDEN = (() => {
  try {
    const c = JSON.parse(fs.readFileSync(path.join(root, 'config/copy.json'), 'utf8'));
    return ((c.voice || {}).forbidden || []).map((w) => new RegExp('\\b' + String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i'));
  } catch (e) { return []; }
})();
const PRESENCE = [/\bstreaks?\b/i, /\bmissed\b/i, /\bdays since\b/i, /\bwe miss you\b/i, /\bcome back\b/i];
const MONEY = [/\byield/i, /\binterest\b/i, /\bAPY\b/, /\bearn on\b/i, /\breturn on\b/i,
  /\$GRATUS\b/, /\$Gratus\b/, /\bstablecoin\b/i, /\bstaking\b/i, /\bpays you\b/i, /\bpaid you\b/i, /\brewarded\b/i, /\bgamified\b/i];
const EQUALITY = [/\bleaderboards?\b/i, /\bbadge count/i, /\btiers?\b/i, /\branks?\b/i, /\bXP\b/];
const CODENAME = [/Groundlight/];
// gradient text is allowed only through the one .grad-text class (the mockups' hero voice); auto-fit card grids and constant-speed rotation stay banned
const DESIGN = [/repeat\(auto-fit/, /rotate\(360deg\)/];

// Three exemptions used to live here and all three were dead or wrong:
// money.html and futures.html are in no tree, /scripts/ can never be reached
// because walk() skips it, and config/copy.json is the one file that held the
// offending copy. An exemption is removed by fixing the words, never by
// narrowing the pattern.
const moneyAllowed = () => false;
// the locked wallet disclosure may appear anywhere: it says what the app does NOT do
const DISCLOSURE = /Nothing here pays interest/;
// A decision log may record a dead idea; a product may not advertise one. These
// are the shapes a record uses to deny, forbid or historicise a banned thing.
// Each has a decoy below, so none of them can quietly become a loophole.
const NEGATED = [
  /\b(no|never|not|nothing|without)\b[^.]{0,40}\b(tiers?|ranks?|leaderboards?|interest|yield|APY|scores?|levels?|streaks?|rewarded|paid|stablecoin|gamified)/i,
  /\b(banned|forbidden|forbids|refuses|unbuilt|not built|remain unbuilt|retired|never ships?)\b/i,
  /\b(tiers?|ranks?|leaderboards?|scores?|levels?|streaks?|XP|badges?)\b[^.]{0,60}\b(were|was|are|is|remain|remains|stay|stays)\b[^.]{0,20}\b(not|never|un)\w*\b/i,
  /\bon the forbidden list\b/i,
  /\bthe gate (caught|refuses|flagged)\b/i,
].reduce((acc, re) => { acc.push(re); return acc; }, []);
const NEG = (ln) => NEGATED.some((re) => re.test(ln));

// Lines awaiting August's ruling, named one at a time with the date and the
// question. This is a quarantine with an owner, not a widened threshold: any
// NEW line carrying the same word is still red, which the decoy proves.
const VOTUS = new RegExp([
  'Grow With Gratus is the program behind the garden',   // prompts.json, his file, awaiting his ruling on $GRATUS
  'Stable money, growing meaning',                        // statements.money, his line
].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'));
let hits = 0;
for (const file of files) {
  const f = rel(file); const txt = fs.readFileSync(file, 'utf8');
  const lines = txt.split('\n');
  const check = (rules, tag, allow) => {
    if (allow) return;
    lines.forEach((ln, i) => { if (DISCLOSURE.test(ln) || NEG(ln) || forbiddenRange(i) || VOTUS.test(ln)) return; for (const re of rules) { const m = ln.match(re); if (m) { hits++; console.log(tag.padEnd(9), (f + ':' + (i + 1)).padEnd(30), JSON.stringify(m[0]).padEnd(22), ln.trim().slice(0, 74)); break; } } });
  };
  // the gates themselves list the words; ignore this file and copy.json's forbidden list
  if (f.endsWith('banned.mjs')) continue;
  if (f.endsWith('config/his-words.json')) continue;
  // The forbidden list names the words it forbids, so scanning it flags every
  // one of them. A list cannot break its own rule. This finds the array and
  // skips exactly its lines, and nothing else in the file.
  const forbiddenRange = (() => {
    const start = lines.findIndex((l) => /"forbidden"\s*:\s*\[/.test(l));
    if (start < 0) return () => false;
    let end = start;
    while (end < lines.length && !/\]/.test(lines[end])) end++;
    return (i) => i >= start && i <= end;
  })();
  check(PRESENCE, 'presence', false);
  check(MONEY, 'money', moneyAllowed(f));
  check(EQUALITY, 'equality', false);
  check(FORBIDDEN, 'forbidden', false);
  check(CODENAME, 'codename', /\.md$/.test(f));
  if (/\.(css|html)$/.test(f)) check(DESIGN, 'design', false);
}
// ── G3 · every rule carries a decoy, and every skip carries one too ────────
//
// This gate gained four skips in v23: the forbidden list cannot break its own
// rule, the registry of August's retired lines is a record rather than product
// copy, a decision log may deny a banned thing, and two of his own sentences are
// quarantined by name while they wait for his ruling.
//
// Each of those is a hole if nobody watches it. So each one is proven in both
// directions: the skip lets the honest case through, AND the same word in a
// place that ships is still caught.
if (process.argv.includes('--decoy')) {
  let bad = 0;
  const caught = (line, rules) => rules.some((re) => re.test(line))
    && !(DISCLOSURE.test(line) || NEG(line) || VOTUS.test(line));
  const must = (what, cond) => { if (!cond) { bad++; console.log('  DECOY FAILED  ' + what); } };

  // G2 is "no whitelist", and that is an invariant about this gate rather than
  // about a line of copy. Running the scan cannot prove it: an exemption makes
  // the scan pass, which is what an exemption is for. So it is asserted here.
  must('no file is exempt from the money rule',
    !moneyAllowed('config/copy.json') && !moneyAllowed('index.html') && !moneyAllowed('anything.md'));

  // the words this movement added
  must('$GRATUS is caught', caught('Get rewarded in $GRATUS every day.', MONEY));
  must('stablecoin is caught', caught('until the stablecoin launches', MONEY));
  must('gamified is caught', caught('A Gamified Daily Journal.', MONEY));
  must('pays you is caught', caught('the garden pays you for showing up', MONEY));

  // the skips, in the direction that matters: they must not let a real one pass
  must('a NEW quarantined word is still caught',
    caught('The garden pays you in $GRATUS for showing up.', MONEY));
  must('a retired line copied into a shipped file is still caught',
    caught('"pitch": "Get rewarded in $GRATUS every day"', MONEY));
  must('an affirmative use is still caught, only the denial is skipped',
    caught('Gratus has three tiers and a leaderboard.', EQUALITY));
  must('a presence word is still caught', caught('We miss you. Come back soon.', PRESENCE));

  // and in the direction that keeps the house honest: the record may deny
  must('a denial is allowed', !caught('Streaks, levels and XP remain unbuilt.', EQUALITY));
  must('a denial reads the other way too', !caught('There are no tiers and never a score here.', EQUALITY));
  must('the wallet disclosure is allowed', !caught('Nothing here pays interest.', MONEY));

  console.log('banned gate DECOY TEST: ' + (bad
    ? 'FAIL \u00b7 ' + bad
    : 'PASS \u00b7 ' + '11 checks, every rule bites and every skip holds'));
  process.exit(bad ? 1 : 0);
}

console.log('banned-pattern gate:', files.length, 'files \u00b7', hits, 'hits');
if (hits) { console.log('BANNED GATE: FAIL'); process.exit(1); }
console.log('BANNED GATE: PASS');
