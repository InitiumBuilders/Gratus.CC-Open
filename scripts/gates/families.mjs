// G22 · THE DORMANT CONFIG IS AWAKE.
//
// config/families.json holds eight species names, eight hues, eight shapes and
// eight sentences, every one of them written by August and flagged owner. It has
// shipped to every person who ever opened Gratus and it has never once been
// fetched. This refuses that: the file is in the boot fetch, in the worker
// precache, and something a person can read renders from it.
//
// Mutant: drop families.json from the boot fetch. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const rd = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };

const fam = JSON.parse(rd('config/families.json'));
say(!!fam.families, 'config/families.json parses and holds families');
const app = rd('assets/js/galaxy.js');
const sw = rd('sw.js');

say(/['"]families['"]/.test(app), 'families is in the boot fetch in galaxy.js');
say(/families\.json/.test(sw), 'families.json is in the worker precache');

// a config nobody renders is still dormant, so prove a person can read one
const names = Object.values(fam.families || {}).map((f) => f.species).filter(Boolean);
const lines = Object.values(fam.families || {}).map((f) => f.statement).filter(Boolean);
say(names.length >= 8, 'the file carries ' + names.length + ' species names');
// reading a key is not rendering it: look for the family lookup by name
say(/C\.families|familyOf\s*\(|famOf\s*\(/.test(app), 'the app looks a family up by name');
say(/\.species\b/.test(app), 'a species name is read for a screen');
say(/fam[A-Za-z]*\.statement|f\.statement|family\.statement/.test(app), 'a family statement is read for a screen');

console.log('G22 families: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
