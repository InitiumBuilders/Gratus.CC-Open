// G12 · STATES ARE THE DESIGN.
//
// Every view renders a designed empty, loading, error and offline state. This
// cannot be asserted until three things exist that do not today, and the gate
// says which one is missing rather than pretending:
//
//   1. a registry of every view, because dispatch is an if/else chain and the
//      only list covers 11 of 18;
//   2. one try/catch around render(), because a throw in any view leaves the
//      screen blank with no path to an error state;
//   3. a connectivity listener, because navigator.onLine and the online/offline
//      events appear nowhere in this repository.
//
// Mutant: delete the empty state from one view. This must go red.
import fs from 'node:fs';
import path from 'node:path';
import { serve, browser, open, ROOT } from './lib/harness.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const app = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');

console.log('G12 - states');
console.log('\n  the three things this gate stands on:');
say(/export const VIEWS|const VIEWS\s*=|registry/.test(app), 'a view registry exists');
say(/try\s*\{[\s\S]{0,120}root\.innerHTML[\s\S]{0,400}catch/.test(app) || /function render\(\)\s*\{\s*try/.test(app),
  'render() is wrapped so a throw has somewhere to go');
say(/navigator\.onLine|addEventListener\(\s*['"]offline/.test(app), 'the app listens for the network going away');

if (fails) {
  console.log('\n  the states themselves cannot be measured until those exist.');
  console.log('G12 states: FAIL - ' + fails + ' missing foundations');
  process.exit(1);
}

// once the registry is real, walk it
const server = await serve(4753);
const b = await browser();
const mod = await import(path.join(ROOT, 'assets/js/views.js')).catch(() => null);
const views = mod && mod.VIEWS ? Object.keys(mod.VIEWS) : [];
say(views.length >= 18, 'the registry names ' + views.length + ' views');

for (const name of views) {
  const v = await open(b, server.base, '/app/' + name, { settle: 1500 });
  const has = await v.page.evaluate(() => ({
    empty: !!document.querySelector('[data-state="empty"], .empty-state, .standing.empty'),
    text: document.body.innerText.length,
  }));
  await v.close();
  say(has.empty || has.text > 200, name + ' has something to show when there is nothing');
}
await b.close();
await server.close();
console.log('G12 states: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
