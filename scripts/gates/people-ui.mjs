// G33 · YOUR PEOPLE, ON THE SCREEN.
//
// G32 proves the store. This opens the real app in a real browser and walks the whole
// thing with a thumb: keep a person, find them in a room, hand them the code. Parsing is
// not loading, and a handler that was never wired looks exactly like one that was.
//
//   node scripts/gates/people-ui.mjs
import { serve, browser, open } from './lib/harness.mjs';
import { month } from './lib/garden.mjs';

let fails = 0;
const say = (ok, m) => { if (!ok) fails++; console.log('  ' + (ok ? 'pass  ' : 'FAIL  ') + m); };

const ROOM = { code: 'TESTRM', name: 'The Kitchen Table', emoji: '☕', about: 'Ours.', count: 2, voices: 2,
  posts: [{ emoji: '☕', name: 'Ben', text: 'The first coffee.', at: '2026-09-18T08:00:00.000Z' }] };
const BEN = { handle: 'ben', name: 'Ben', line: '', since: '2026-09-01',
  garden: { plants: 2, days: 9, ready: 0, faces: ['☕'] }, both: true };

console.log('G33 - your people, on the screen');
const srv = await serve(4757);
const b = await browser();
const { page, close } = await open(b, srv.base, '/app/vibes');

// This server holds files and nothing else, so the app's own calls to /api answer 404
// here and that is the harness, not the product. Anything else missing is a real hole.
const loud = [];
const missing = [];
page.on('pageerror', (e) => loud.push(String(e.message).slice(0, 100)));
page.on('console', (m) => { if (m.type() === 'error' && !/404|Failed to load resource/.test(m.text())) loud.push(m.text().slice(0, 100)); });
page.on('response', (r) => { if (r.status() === 404) missing.push(new URL(r.url()).pathname); });

// the store, answering the way the live one does
await page.route('**/api/vibes**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ vibe: ROOM }) }));
await page.route('**/api/account**', async (r) => {
  const act = JSON.parse(r.request().postData() || '{}').act;
  const body = act === 'friends' ? { friends: [BEN], mine: 'ava' }
    : act === 'me' ? { handle: 'ava', profile: { name: 'Ava' }, published: true, friends: 1 }
      : { ok: true, friends: 1 };
  await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
});
await page.evaluate(() => localStorage.setItem('gratus.account.token', 'a.b.c'));
// Somebody with people has a garden. An empty one is a first visit, and the app meets a
// first visit with the tour as soon as it changes rooms, which covers the door being walked.
await page.evaluate((g) => localStorage.setItem('gratus.galaxy.v1', JSON.stringify(g)), month());
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);
// The marks a garden has already earned light the first time it is opened, and the large
// ones are held on the screen. Walk past them once, so the walk starts from a garden at rest.
for (let i = 0, quiet = 0; i < 60 && quiet < 4; i++) {
  const up = await page.evaluate(() => { const r = document.getElementById('ceremony'); return !!r && !r.hidden; });
  if (up) { quiet = 0; await page.keyboard.press('Escape'); } else quiet++;
  await page.waitForTimeout(260);
}

const text = () => page.evaluate(() => (document.body.innerText || '').replace(/\s+/g, ' '));
const sheetText = () => page.evaluate(() => {
  const s = document.querySelectorAll('#sheets .sheet');
  return s.length ? (s[s.length - 1].innerText || '').replace(/\s+/g, ' ') : '';
});
// Every scrim, not the first one. Sheets stack, and a closed sheet that is still on its
// way out eats the next tap, which reads exactly like a button that was never wired.
const shut = async () => {
  await page.evaluate(() => document.querySelectorAll('#sheets .scrim').forEach((s) => s.click()));
  await page.waitForFunction(() => !document.querySelector('#sheets .scrim'), null, { timeout: 4000 });
};

// ── walk into a room ──
await page.fill('#vb-code', 'testrm');
await page.click('#vb-join');
await page.waitForTimeout(700);
say((await text()).includes('The Kitchen Table'), 'the room opens');
say(await page.locator('#vb-bring').count() === 1, 'and it offers to bring somebody in');

await page.click('#vb-bring');
await page.waitForTimeout(600);
let s = await sheetText();
say(/Bring somebody into The Kitchen Table/.test(s), 'the sheet knows which room  (' + s.slice(0, 44) + ')');
say(s.includes('TESTRM'), 'and shows the code, because the code is the room');
say(s.includes('Ben'), 'and Ben is there, one tap away');

// the tap has to actually write something a person can send
await page.evaluate(() => { window.__sent = null; navigator.clipboard.writeText = (t) => { window.__sent = t; return Promise.resolve(); }; });
await page.locator('[data-bg="ben"]').click();
await page.waitForTimeout(500);
const sent = await page.evaluate(() => window.__sent);
say(!!sent && sent.includes('TESTRM'), 'tapping him writes a line carrying the code  (' + String(sent).slice(0, 52) + ')');
say(!!sent && /\/app\/vibes\?code=TESTRM/.test(sent), 'and a link that walks straight into the room');
await shut(); await page.waitForTimeout(400);

// ── the list itself, reached the way a thumb reaches it: the door on the home page ──
const centre = (id) => page.evaluate((i) => { const el = document.getElementById(i); if (el) el.scrollIntoView({ block: 'center', behavior: 'instant' }); return !!el; }, id);
await page.goto(srv.base + '/app?nosplash=1&notour=1&dev=1', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
say(await centre('open-together'), 'the home page has a door to Gratus Gives Together');
await page.click('#open-together');
await page.waitForTimeout(900);
say(/\/app\/goals$/.test(new URL(page.url()).pathname), 'which is a room with an address  (' + new URL(page.url()).pathname + ')');
say(await centre('tg-people'), 'and the room has a door to your people');
await page.click('#tg-people');
await page.waitForTimeout(700);
s = await sheetText();
say(s.includes('Your people') && s.includes('Ben'), 'and it opens on the list  (' + s.slice(0, 40) + ')');
say(/Ben · together/.test(s), 'Ben reads as together, because he keeps her back');
say(/2 growings?|2 growing/.test(s) || s.includes('9 days'), 'his garden shows as a shape, never a word from it');
say(!/journal|entry|wrote/i.test(s), 'and nothing from anybody’s journal is on this screen');

// from the list, into a room
say(await page.locator('[data-room="ben"]').count() === 1, 'each person can be handed a room');
await page.click('[data-room="ben"]');
await page.waitForTimeout(600);
s = await sheetText();
say(/Bring @ben in/.test(s), 'which opens on the rooms you are in  (' + s.slice(0, 34) + ')');
say(s.includes('The Kitchen Table'), 'and the room you just walked into is one of them');

// ── and with no account, the door still goes somewhere ──
await shut(); await page.waitForTimeout(400);
await page.evaluate(() => localStorage.removeItem('gratus.account.token'));
await centre('tg-people');
await page.click('#tg-people'); await page.waitForTimeout(600);
s = await sheetText();
say(/Keep your garden|Gratus account/.test(s), 'without an account it opens on making one, never on nothing  (' + s.slice(0, 40) + ')');

say(loud.length === 0, 'the browser threw nothing' + (loud.length ? '  (' + loud[0] + ')' : ''));
const real = [...new Set(missing)].filter((p) => !p.startsWith('/api/'));
say(real.length === 0, 'and every file the app asked for was there' + (real.length ? '  (' + real.join(', ') + ')' : ''));

await close(); await b.close(); await srv.close();
console.log('G33 your people on the screen: ' + (fails ? 'FAIL - ' + fails : 'PASS'));
process.exit(fails ? 1 : 0);
