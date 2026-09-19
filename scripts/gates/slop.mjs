// Gate 5 — THE SLOP GATE.
//
// A language model writes whatever is most likely to come next, so left alone it
// reaches for the phrasing that fits the widest range of subjects. That is the
// sound this gate refuses. It reads the repository's prose and fails the ship
// when it finds the mechanical habits: a dash standing in for a decision about
// how two clauses relate, a contrast with nothing on the other side of it, a
// word that sounds expert and carries nothing, a run-up that announces a point
// instead of making it.
//
// ── THE FIRST RULE, AND THE REASON THIS FILE EXISTS ──
// August's words are his. This gate never judges them. config/his-words.json
// holds every line of his that appears in the source, and every value inside
// config/copy.json's `locked` block is his as well. A line containing any of
// them is skipped whole. A writing gate that cannot tell whose words it is
// judging is worse than no gate at all, because it will confidently sand the
// voice off the one part of a product that has one.
//
// ── WHAT IT CANNOT DO ──
// It catches habits that can be matched. It cannot see a paragraph that says
// nothing in four graceful sentences, and it cannot see three examples arranged
// in a row because three sounded complete. Those are still read by a person.
// This gate is the floor, not the ceiling, and it is written down here so nobody
// mistakes a pass for good writing.
//
// Usage:  node scripts/gates/slop.mjs           scan the repository
//         node scripts/gates/slop.mjs --decoy   prove every rule still bites,
//                                               and prove his words survive
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SKIP_DIR = new Set(['node_modules', '.git', '.vercel', 'art', 'gfx']);
const EXT = new Set(['.md', '.js', '.mjs', '.html']);
// this file names the habits, so it would flag itself on every line
const SKIP_FILE = /scripts\/gates\/(slop|banned)\.mjs$|config\/(copy|his-words)\.json$/;

const RULES = [
  {
    id: 'dash',
    why: 'A dash lets a sentence skip deciding how its two halves relate. Use a full stop, a comma, a colon, or rewrite it.',
    // An em dash is always a decision the sentence did not make, so it is always
    // flagged. An en dash is two different characters doing two different jobs:
    // between clauses it is the same evasion, and tight between characters it is
    // a range, which is correct typography and is left alone. `1–3` and `v4–v6` are
    // not writing habits, and a gate that mangled them would be teaching a
    // superstition rather than a rule.
    re: [/—/, /\s–\s/, /\s--\s/],
    decoy: 'The new policy — announced without warning — affects thousands.',
    allowed: 'Recipes carry a depth of 1–3, and the paintings run g31–g38.',
  },
  {
    id: 'not-just',
    why: 'The negative half names something nobody claimed, so the positive half sounds larger than it is. Say the thing.',
    re: [/\bnot\s+(just|only|merely)\b[^.!?]{0,70}\bbut\b/i, /\bit'?s not\b[^.!?]{0,45},\s*it'?s\b/i, /\bisn'?t\s+(just|only|about)\b[^.!?]{0,45}\bit'?s\b/i],
    decoy: "It's not just a feature, it's a statement about what we believe.",
  },
  {
    id: 'ai-words',
    why: 'Words a model reaches for far more often than a person does. Replace with the plain one.',
    re: [/\bdelve\w*\b/i, /\btapestr\w+\b/i, /\btestament\b/i, /\bunderscor(e|es|ed|ing)\b/i, /\bshowcas(e|es|ed|ing)\b/i, /\bfoster(s|ed|ing)?\b/i, /\bgarner\w*\b/i, /\bpivotal\b/i, /\bmeticulous\w*\b/i, /\bintricac?\w*\b/i, /\bvibrant\b/i, /\bbolster\w*\b/i, /\binterplay\b/i, /\bseamless\w*\b/i, /\butiliz\w+\b/i, /\bembark\w*\b/i, /\bmyriad\b/i, /\bplethora\b/i, /\bnestled\b/i, /\bcutting[- ]edge\b/i, /\bgame[- ]?chang\w+\b/i, /\brevolutioniz\w+\b/i, /\btransformative\b/i, /\bever[- ]evolving\b/i],
    decoy: 'A meticulous, cutting-edge tapestry of seamless features.',
  },
  {
    id: 'run-up',
    why: 'The sentence announces a point instead of making it. Cut the run-up, not just its tone.',
    re: [/\blet'?s (dive|explore|break|take a look|get into)\b/i, /\b(deep dive|dive into)\b/i, /\bhere'?s (the thing|what you need to know)\b/i, /\bthe thing is\b/i, /\bwithout further ado\b/i, /\brest assured\b/i, /\bin conclusion\b/i, /\bat the end of the day\b/i],
    decoy: "Let's dive into how this works. Here's what you need to know.",
  },
  {
    id: 'inflate',
    why: 'An ordinary fact dressed as a turning point. Keep the fact and drop the significance.',
    re: [/\bstands as a\b/i, /\bplays? a (key|vital|crucial|central) role\b/i, /\bmark(s|ing) a (pivotal|defining|key) (moment|shift)\b/i, /\bthe future looks bright\b/i, /\ba step in the right direction\b/i, /\bexciting times\b/i, /\bspeaks volumes\b/i],
    decoy: 'This stands as a testament to the work and marks a pivotal moment.',
  },
  {
    id: 'deep-saying',
    why: 'An ordinary point dressed as a hidden truth. Replace the saying with the claim.',
    re: [/\bat its core\b/i, /\bthe real question is\b/i, /\bwhat really matters\b/i, /\bthe heart of the matter\b/i, /\bfundamentally,/i, /\bin reality,/i],
    decoy: 'At its core, the real question is what really matters here.',
  },
  {
    id: 'hedge',
    why: 'Qualifiers stacked until nothing is claimed. Keep one, or none.',
    re: [/\bcould potentially\b/i, /\bmight arguably\b/i, /\bit'?s also possible that\b/i, /\bit is worth noting that\b/i, /\bneedless to say\b/i],
    decoy: 'It could potentially be argued that this might arguably help.',
  },
  {
    id: 'closer',
    why: 'A line that asks the reader to pause on a claim instead of adding to it.',
    re: [/\bread that again\b/i, /\blet that sink in\b/i, /\bthat'?s the real win\b/i, /\band that changes everything\b/i, /\bgame over\b/i],
    decoy: 'Read that again. Let that sink in.',
  },
];

// ── whose words are these ────────────────────────────────────────────────────
function hisLines() {
  const out = [];
  const reg = JSON.parse(fs.readFileSync(path.join(root, 'config/his-words.json'), 'utf8'));
  for (const s of reg.his || []) if (String(s).trim()) out.push(String(s));
  const copy = JSON.parse(fs.readFileSync(path.join(root, 'config/copy.json'), 'utf8'));
  const walk = (o) => {
    if (typeof o === 'string') { if (o.trim().length > 3) out.push(o); return; }
    if (Array.isArray(o)) return o.forEach(walk);
    if (o && typeof o === 'object') return Object.values(o).forEach(walk);
  };
  walk(copy.locked || {});
  return out;
}
const HIS = hisLines();
const isHis = (line) => HIS.some((h) => line.includes(h));

// ── the scan ────────────────────────────────────────────────────────────────
function walkDir(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(p, out);
    else if (EXT.has(path.extname(e.name))) out.push(p);
  }
  return out;
}
function hitsIn(line) {
  if (isHis(line)) return [];
  const found = [];
  for (const rule of RULES) for (const re of rule.re) if (re.test(line)) { found.push(rule); break; }
  return found;
}

// ── --decoy: every rule must still bite, and his words must still be safe ────
if (process.argv.includes('--decoy')) {
  let bad = 0;
  for (const rule of RULES) {
    const caught = hitsIn(rule.decoy).some((r) => r.id === rule.id);
    if (!caught) { bad++; console.log('DECOY MISSED  ' + rule.id + '  ::  ' + rule.decoy); }
  }
  // the other direction, and the one that matters more: his lines carry patterns
  // this gate hunts, and must come through untouched every time.
  const mustSurvive = [
    "There Are Many Reasons To Be Grateful In Today's World. Grow What Matters.",
    'Gratus Helps You Grow Gratitude Daily',
    'And Empowers You To Give Gratus Gifts.',
    'Gratus means honor.',
  ];
  for (const line of mustSurvive) {
    if (hitsIn(line).length) { bad++; console.log('HIS WORDS FLAGGED  ::  ' + line); }
  }
  // correct typography that resembles a habit must come through as well
  for (const rule of RULES) {
    if (!rule.allowed) continue;
    if (hitsIn(rule.allowed).some((r) => r.id === rule.id)) { bad++; console.log('FALSE POSITIVE  ' + rule.id + '  ::  ' + rule.allowed); }
  }
  // and prove the guard is real: the same shape, in my voice, must still be caught
  const mine = 'This stands as a testament to a truly transformative journey.';
  if (!hitsIn(mine).length) { bad++; console.log('GUARD TOO WIDE: my own slop passed  ::  ' + mine); }
  console.log('slop gate DECOY TEST: ' + (bad ? 'FAIL · ' + bad : 'PASS · ' + RULES.length + ' rules bite, ' + mustSurvive.length + ' of his lines untouched'));
  process.exit(bad ? 1 : 0);
}

const files = walkDir(root, []).filter((f) => !SKIP_FILE.test(path.relative(root, f).replace(/\\/g, '/')));
let hits = 0;
for (const file of files) {
  const rel = path.relative(root, file).replace(/\\/g, '/');
  const md = rel.endsWith('.md');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  // A fenced block holds a command, a snippet, or a prompt being quoted. None of
  // it is the repository speaking, and judging it would mean a document could
  // never quote the habit it is teaching people to remove. docs/REFINEMENT.md
  // names all eight of them and would otherwise fail on every line of its own
  // advice.
  let fenced = false;
  lines.forEach((ln, i) => {
    if (md && /^\s*(```|~~~)/.test(ln)) { fenced = !fenced; return; }
    if (fenced) return;
    for (const rule of hitsIn(ln)) {
      hits++;
      console.log(rule.id.padEnd(12), (rel + ':' + (i + 1)).padEnd(34), ln.trim().slice(0, 96));
    }
  });
}
console.log('slop gate:', files.length, 'files ·', HIS.length, 'of his lines held safe ·', hits, 'hits');
if (hits) { console.log('SLOP GATE: FAIL'); process.exit(1); }
console.log('SLOP GATE: PASS');
