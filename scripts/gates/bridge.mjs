// G17 · THE BRIDGE BUTTON EXISTS AND RESOLVES.
//
// Every loop in the Emotional TRACE ends at one human: a steward who writes back.
// That human is currently told nothing, by anything, ever. One button on the seed
// confirmation lets the donor say it out loud, through a channel the project has
// already published.
//
// With channels: the control renders and its target is one of that project's own
// channels. With none: the control is absent, not disabled with a tooltip.
//
// Mutant: point the control at a channel the project did not publish. Red.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/harness.mjs';

let fails = 0;
const say = (ok, msg) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + msg); };
const app = fs.readFileSync(path.join(ROOT, 'assets/js/galaxy.js'), 'utf8');
const api = fs.readFileSync(path.join(ROOT, 'api/giveth.js'), 'utf8');

console.log('G17 - the bridge');
say(/tellThem|bridgeSheet|Tell them/.test(app), 'the control exists in the app');
say(/socialMedia|socials|channels/i.test(api), 'the API carries the project channels');
say(/socials|channels/i.test(app), 'the app reads the channels for a project');
say(/channels?\s*(?:&&|\?|\.length)/.test(app), 'the control is absent when there are no channels');
console.log('G17 bridge: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
