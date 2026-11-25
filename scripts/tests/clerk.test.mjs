// The clerk reads a PAXT aloud and says where it stands. These checks hold it to the copy rules: plain words,
// numbers to twelve as words, dates with the month spelled out, every count a count of keys, and nothing said
// about anyone who has not joined.
// The narration is checked against a real count() from engine/paxt.js, so the clerk only ever reads its result.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as P from '../../engine/paxt.js';
import { reading, narrate, intent, whatChanged, spell, plainDate, marks, otherSite, MAX_MARKS } from '../../assets/js/clerk.js';

const INTENT = 'Intent: a promise between us, kept by choice. It is not a contract and it moves no money.';

const doc = P.template({
  id: 'garden-pact',
  title: 'We keep the garden together',
  threshold: 5,
  opens: '2026-11-20',
  closes: '2026-12-01',
  body: [
    INTENT,
    '',
    'We water the beds on Saturdays. Each of us brings',
    'one tool to share, e.g. a rake or a can.',
    '',
    '- We leave the gate closed.',
    '- We tell each other when we cannot come.',
  ].join('\n'),
});
const terms = P.parseGarden(doc).terms;
const day = (s) => Date.parse(s);

test('spell writes one to twelve as words and larger numbers as digits', () => {
  assert.equal(spell(1), 'one');
  assert.equal(spell(12), 'twelve');
  assert.equal(spell(13), '13');
  assert.equal(spell(500), '500');
});

test('plainDate spells the month, adds the year only when it differs, and a time only when set', () => {
  const now = day('2026-11-25T10:00:00Z');
  assert.equal(plainDate(day('2026-12-01T00:00:00Z'), now), '1 December');
  assert.equal(plainDate(day('2027-01-05T00:00:00Z'), now), '5 January 2027');
  assert.equal(plainDate(day('2026-12-01T18:30:00Z'), now), '1 December at 18:30 UTC');
});

test('reading numbers each sentence and names the line it starts on', () => {
  const r = reading(doc);
  const lines = P.canon(doc).split('\n');
  assert.deepEqual(r.map((s) => s.n), r.map((_, i) => i + 1));
  assert.deepEqual(r.map((s) => s.text), [
    'Intent: a promise between us, kept by choice.',
    'It is not a contract and it moves no money.',
    'We water the beds on Saturdays.',
    'Each of us brings one tool to share, e.g. a rake or a can.',
    '- We leave the gate closed.',
    '- We tell each other when we cannot come.',
  ]);
  // every line number points at the canonical line where that sentence begins
  for (const s of r) assert.ok(lines[s.line - 1].includes(s.text.split(' ').slice(0, 3).join(' ')), s.text);
  assert.equal(r[0].line, 10);
  // the sentence wrapped across two lines is read as one and starts on the first of them
  assert.equal(r[3].line, 12);
  assert.equal(r[4].line, 15);
});

test('reading a document with no body divider gives nothing to read', () => {
  assert.deepEqual(reading('paxt1\nid: x\n'), []);
});

test('intent finds the intent line', () => {
  assert.equal(intent(terms.body), INTENT);
  assert.equal(intent('Some words.\n  Intent: to share the tools.\nMore.'), 'Intent: to share the tools.');
});

test('intent is null when the body states none', () => {
  assert.equal(intent('We water the beds on Saturdays.\nWe leave the gate closed.'), null);
  assert.equal(intent(''), null);
  assert.equal(intent(undefined), null);
});

/** a real count of `joins` keys joining, through engine/paxt.js */
async function countOf(joins) {
  const { short } = await P.digestOf(doc);
  const ballots = [];
  for (let i = 0; i < joins; i++) {
    const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
    const address = 'did:key:' + P.didKeyAddress('ed25519', new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey)));
    const line = P.ballotLine({ id: terms.id, choices: ['join'], digest: short });
    const sig = P.toBase64url(new Uint8Array(await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, P.signedBytes(line))));
    ballots.push({ address, line, sig });
  }
  return P.count({ terms, digestShort: short, ballots, verify: P.verifyGarden });
}

test('narrate says how many keys of the threshold have joined and when it closes', async () => {
  const now = day('2026-11-25T10:00:00Z');
  assert.equal(narrate(terms, await countOf(3), now), 'Three of the five keys it needs have joined. It closes on 1 December.');
  assert.equal(narrate(terms, await countOf(1), now), 'One of the five keys it needs has joined. It closes on 1 December.');
  assert.equal(narrate(terms, await countOf(0), now), 'It needs five keys to join. It closes on 1 December.');
  assert.equal(narrate(terms, null, now), 'It needs five keys to join. It closes on 1 December.');
});

test('narrate says when it is in force', async () => {
  assert.equal(narrate(terms, await countOf(5), day('2026-11-25T10:00:00Z')), 'It is in force: five keys have joined.');
  assert.equal(narrate(terms, await countOf(5), day('2026-12-03T10:00:00Z')), 'It is in force: five keys have joined.');
});

test('narrate says how it closed when it fell short', async () => {
  const after = day('2026-12-02T10:00:00Z');
  assert.equal(narrate(terms, await countOf(3), after), 'It closed with three of the five keys it needed.');
  assert.equal(narrate(terms, await countOf(0), after), 'It closed before any key joined. It needed five keys.');
});

test('narrate before it opens, and with large numbers as digits', () => {
  assert.equal(narrate(terms, null, day('2026-11-18T00:00:00Z')), 'It opens on 20 November and needs five keys to join. It closes on 1 December.');
  const big = { ...terms, threshold: 40 };
  assert.equal(narrate(big, { joined: 13, inForce: false }, day('2026-11-25T00:00:00Z')), '13 of the 40 keys it needs have joined. It closes on 1 December.');
});

test('narrate never speaks of anyone who has not joined', async () => {
  const c = await countOf(2);
  const said = [
    narrate(terms, c, day('2026-11-25T10:00:00Z')),
    narrate(terms, c, day('2026-12-02T10:00:00Z')),
  ].join(' ');
  assert.doesNotMatch(said, /not joined|yet to|still|waiting|remain|left to|missing|absent/i);
  assert.throws(() => narrate(terms, c), TypeError);
});

test('whatChanged finds the one line that differs', () => {
  const next = doc.replace('- We leave the gate closed.', '- We leave the gate open.');
  assert.deepEqual(whatChanged(doc, next), { added: ['- We leave the gate open.'], removed: ['- We leave the gate closed.'] });
});

test('whatChanged compares canonical lines, so line ends and trailing spaces are not changes', () => {
  const messy = doc.replace(/\n/g, '  \r\n');
  assert.deepEqual(whatChanged(doc, messy), { added: [], removed: [] });
});

test('whatChanged reports lines added and removed in document order', () => {
  const a = 'paxt1\n---\none\ntwo\nthree\nfour\n';
  const b = 'paxt1\n---\nzero\none\nthree\nfour\nfive\n';
  assert.deepEqual(whatChanged(a, b), { added: ['zero', 'five'], removed: ['two'] });
});

test('narrate says key, not keys, for one', () => {
  const one = { ...terms, threshold: 1 };
  assert.equal(narrate(one, { joined: 1, inForce: true }, day('2026-11-25T10:00:00Z')), 'It is in force: one key has joined.');
  assert.equal(narrate(one, null, day('2026-11-25T10:00:00Z')), 'It needs one key to join. It closes on 1 December.');
});

/* ------------------------------------------------------------------ marks: what to read before joining */

// a garden document with this body under the intent line every new PAXT starts with
const withBody = (body, over = {}) => P.template({
  id: 'marks-test', title: 'A test', threshold: 3, opens: '2026-11-25', closes: '2026-12-02', ...over,
  body: body === null ? INTENT : INTENT + '\n\n' + body,
});
const marksOf = (body, over) => { const d = withBody(body, over); return marks(d, P.parseDoc(d).terms); };

// A false mark is a failure: one wrong mark teaches people to skip the rest. Every one of these must give none.
const CLEAN = [
  ['the intent line alone, as a new PAXT starts', null],
  ['tea on Sundays', 'We meet for tea on Sundays and bring one thing we are glad of.'],
  ['a weekly call', 'We call each other every Thursday at 7 in the evening. If one of us cannot make it, we say so in the chat.'],
  ['a book club', 'We read one book a month and meet on the last Friday to talk about it. Each of us picks the book in turn.'],
  ['a garden, with a gate and a hose', 'We water the beds on Saturdays. We cannot leave the gate open, and we can\'t leave the hose running.'],
  ['phone-free dinners', 'At dinner our phones stay in the basket. Anyone can leave the table when they are done.'],
  ['a Sunday walk', 'We walk 5 km together every Sunday morning, rain or shine.'],
  ['shared chores', 'We share the chores: dishes, bins and laundry. The rota is on the fridge.'],
  ['music practice', 'Each of us practises for 20 minutes a day and plays one piece for the others on Fridays.'],
  ['a neighbour', 'We check on Mrs Lee next door twice a week and bring her shopping when she asks.'],
  ['notes of thanks', 'Each week we write one note of thanks to someone who helped us. We keep the notes in a box.'],
  ['an email and a Gratus link', 'Questions go to ana@example.org. The room is at https://gratus.cc/app/pact/tea-on-sundays and www.gratus.cc works too.'],
  ['a way to leave, said plainly', 'Anyone can leave at any time by signing a leave line. No money changes hands, and nobody owes anyone.'],
  ['hours given, with no hurry', 'We each give 10 hours a month to the food bank and meet at 18:00 on the first Monday.'],
  // everyday words that rush nobody
  ['no hurry, said plainly', 'There is no hurry. Join when you are ready.'],
  ['urgent, for a phone call', 'Only call after 10pm if it is urgent.'],
  ['urgent care', 'We drive each other to urgent care if one of us gets hurt.'],
  ['don’t wait for dinner', 'Don\'t wait for me to start dinner.'],
  ['do not wait up', 'Do not wait up for us on Fridays.'],
  ['limited time on weekdays', 'We have limited time on weekdays, so we keep calls short.'],
  ['food that expires soon', 'We eat whatever expires soon first.'],
  ['fixing things soon', 'If something breaks, we fix it as soon as possible.'],
  ['answering within hours', 'We answer each other within a few hours on weekdays.'],
  // everyday words that sound like a wallet's secrets
  ['backup keys to the house', 'We keep the backup keys to the house with the neighbour.'],
  ['a family’s secret words', 'The kids have secret words for when they want to be picked up early.'],
  ['a mnemonic for bin day', 'We use a mnemonic to remember which day the bins go out.'],
  ['a 12-word thanks', 'We each write a 12-word phrase of thanks on the fridge board.'],
  // house rules about leaving that are not about leaving the PAXT
  ['nobody leaves the table', 'Nobody can leave the table until the plates are cleared.'],
  ['the kids at the pool', 'No one may leave the kids alone at the pool.'],
  ['dishes in the sink', 'No leaving dishes in the sink overnight.'],
  ['the cat', 'Keep the back door shut so the cat can\'t leave.'],
  ['tickets booked', 'Once the tickets are booked there is no going back.'],
  // a sentence typed without a space after its full stop
  ['a missing space after a full stop', 'Dinner at mine.Me and you cook on Sundays.'],
];

for (const [what, body] of CLEAN) {
  test('no mark on a clean text: ' + what, () => {
    assert.deepEqual(marksOf(body), []);
  });
}

// one planted problem per text, and exactly one mark for it, quoting the sentence it is in
const PLANTED = [
  ['money', 'an amount in dollars', 'Each of us puts $20 in the jar every month.'],
  ['money', 'a currency by its code', 'We pay the host in USDT each week.'],
  ['money', 'a currency word with a number', 'The tickets are 15 euros each.'],
  ['wallet', 'an Ethereum address', 'Send your share to 0x52908400098527886E0F7030069857D2E4169EE7 on Fridays.'],
  ['wallet', 'a bech32 address', 'The jar lives at bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq for now.'],
  ['wallet', 'a Dash address', 'Our Dash address is XpESxaUmonkq8RaLLp46Brx2K39ggQe226 and it never changes.'],
  ['link', 'a link to another site', 'Read the rules at https://gratus-claim.com/rules before Sunday.'],
  ['link', 'a bare name of another site', 'Sign up at bit.ly/tea-club on the day.'],
  ['link', 'a site dressed as Gratus', 'The room is at https://gratus.cc.example.com/pact for everyone.'],
  ['link', 'a site hiding behind a name and password', 'Open http://gratus.cc@example.net/join to begin.'],
  ['secret', 'a seed phrase', 'Write your seed phrase on the form so we can check it.'],
  ['secret', 'a wallet to verify', 'First verify your wallet with the host.'],
  ['secret', 'a private key', 'Each of us shares a private key with the group.'],
  ['rush', 'a day to answer', 'Reply within 24 hours or your place goes to someone else.'],
  ['rush', 'act now', 'Act now, the places are going.'],
  ['rush', 'hurry and join', 'Hurry and join before the places go.'],
  ['rush', 'don’t wait to join', 'Don\'t wait to join, the places are few.'],
  ['rush', 'urgent: join', 'Urgent: join by tonight.'],
  ['rush', 'a deadline to reply', 'Reply within 24 hours.'],
  ['secret', 'a 12-word recovery phrase', 'Keep your 12-word recovery phrase ready for the host.'],
  ['secret', 'a 24-word list from a wallet', 'Bring the 24-word list from your wallet.'],
  ['no-exit', 'never undone', 'Once you join, this agreement can never be undone.'],
  ['no-exit', 'no leaving', 'Once you join, you cannot leave.'],
  ['no-exit', 'irrevocable', 'This promise is irrevocable.'],
  ['no-exit', 'nobody leaves the agreement', 'Nobody can leave this agreement.'],
  ['no-exit', 'no going back once joined', 'Once you join there is no going back.'],
  ['link', 'a site with a capital ending and a path', 'The rules are at Evil.Com/rules for everyone.'],
];

for (const [kind, what, body] of PLANTED) {
  test('one mark for a planted problem: ' + what, () => {
    const d = withBody(body);
    const got = marks(d, P.parseDoc(d).terms);
    assert.equal(got.length, 1, JSON.stringify(got));
    assert.equal(got[0].kind, kind);
    const s = reading(d).find((x) => x.n === got[0].n);
    assert.ok(s, 'the mark names a sentence the clerk reads');
    assert.equal(got[0].quote, s.text, 'the mark quotes its sentence exactly');
    assert.equal(got[0].line, s.line);
    assert.ok(got[0].say && !/scam|fraud|trick|lie|steal/i.test(got[0].say), 'it says what it is without guessing why');
  });
}

test('one mark for a closing time less than a day after the opening, quoting the closes line', () => {
  const d = withBody('We meet for tea on Sundays.', { opens: '2026-11-25T09:00Z', closes: '2026-11-25T21:00Z' });
  const got = marks(d, P.parseDoc(d).terms);
  assert.equal(got.length, 1);
  assert.equal(got[0].kind, 'short');
  assert.equal(got[0].n, null);
  assert.equal(got[0].quote, 'closes: 2026-11-25T21:00Z');
  assert.equal(P.canon(d).split('\n')[got[0].line - 1], got[0].quote);
  // a full day is enough: the control
  assert.deepEqual(marksOf('We meet for tea on Sundays.', { opens: '2026-11-25T09:00Z', closes: '2026-11-26T09:00Z' }), []);
});

test('at most three marks, the ones that could cost most, shown in the order of the text', () => {
  const d = withBody([
    'Reply within 24 hours.',
    'Each of us puts $20 in the jar.',
    'This can never be undone.',
    'The rules are at https://example.com/rules today.',
    'Send it to 0x52908400098527886E0F7030069857D2E4169EE7 soon.',
    'Bring your recovery phrase.',
  ].join(' '), { opens: '2026-11-25T09:00Z', closes: '2026-11-25T12:00Z' });
  const got = marks(d, P.parseDoc(d).terms);
  assert.equal(got.length, MAX_MARKS);
  assert.deepEqual(got.map((m) => m.kind), ['link', 'wallet', 'secret']);
  assert.deepEqual(got.map((m) => m.n), [...got.map((m) => m.n)].sort((a, b) => a - b));
});

test('the intent line is never marked, whatever it says about money', () => {
  assert.deepEqual(marks(withBody(null)), []);
  assert.deepEqual(marks(withBody('It moves no money, and no money is asked for.')), []);
});

test('otherSite reads the site a link really goes to', () => {
  assert.equal(otherSite('See https://gratus.cc/app.'), null);
  assert.equal(otherSite('See www.gratus.cc.'), null);
  assert.equal(otherSite('See https://app.gratus.cc/x'), null);
  assert.equal(otherSite('See http://gratus.cc@example.net/x'), 'example.net');
  assert.equal(otherSite('See gratus.cc.example.com now'), 'gratus.cc.example.com');
  assert.equal(otherSite('Read example.com.au first.'), 'example.com.au');
  assert.equal(otherSite('Write to ana@example.org.'), null);
  assert.equal(otherSite('We meet at 7. Then we eat, e.g. soup.'), null);
});

/* ------------------------------------------------------------------ hidden characters and long numbers */

// each written as an escape, because typed in it would be invisible here too
const ZW = '\u{200B}', RLO = '\u{202E}';

test('a zero-width space inside a planted sentence hides it from no mark, and the sentence gets a mark of its own', () => {
  const planted = [
    ['secret', 'Send your s' + ZW + 'eed phrase to me.'],
    ['wallet', 'Pay 0x' + ZW + '52908400098527886E0F7030069857D2E4169EE7 now.'],
    ['link', 'Read the rest at evil' + ZW + '.com first.'],
    ['money', 'Bring 50 ' + ZW + 'USD each.'],
  ];
  for (const [kind, text] of planted) {
    const got = marksOf(text).map((m) => m.kind);
    assert.ok(got.includes(kind), kind + ' is still found with a zero-width space inside: ' + JSON.stringify(got));
    assert.ok(got.includes('hidden'), 'and the sentence is marked as holding characters nobody sees');
  }
  assert.deepEqual(marksOf('We meet for tea on Sundays.'), [], 'the control: a clean sentence has no mark');
  const turned = marksOf('We meet on ' + RLO + 'Sundays.');
  assert.ok(turned.some((m) => m.kind === 'hidden' && /turn text around/.test(m.say)), 'a character that turns text around is marked');
  assert.deepEqual(marksOf('We share a \u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467} table.'), [], 'the joiner inside a family emoji is not hidden');
});

test('a body of one long run of digits is read quickly, every time the room paints', () => {
  const d = withBody('1'.repeat(19000));
  const t0 = performance.now();
  for (let i = 0; i < 3; i++) marks(d, P.parseDoc(d).terms);
  const ms = (performance.now() - t0) / 3;
  assert.ok(ms < 60, 'marks took ' + ms.toFixed(1) + ' ms on 19,000 digits');
  assert.ok(marksOf('Bring 50 USD each.').some((m) => m.kind === 'money'), 'the control: an amount is still marked');
  assert.ok(marksOf('Bring 1,250.50 EUR each.').some((m) => m.kind === 'money'), 'and so is one with separators');
});

test('a garden title or body with a hidden, control or direction character is refused before anyone can sign it', () => {
  const ok = withBody('We meet on Sundays.');
  assert.equal(P.parseGarden(ok).ok, true, 'the control: a plain document opens');
  const bad = [
    ['a zero-width space in the body', withBody('Send your s' + ZW + 'eed phrase.')],
    ['an override in the body', withBody('We meet on ' + RLO + 'Sundays.')],
    ['an escape in the body', withBody('We meet.\u{1B}[2K\u{1B}[1A')],
    ['a NUL in the body', withBody('We meet.\u{0}')],
    ['an override in the title', withBody('We meet.', { title: 'Tea ' + RLO + 'on Sundays' })],
    ['a form feed in the title', withBody('We meet.', { title: 'Tea\u{C}on Sundays' })],
    ['U+0085 in the title', withBody('We meet.', { title: 'Tea\u{85}on Sundays' })],
  ];
  for (const [what, d] of bad) {
    const r = P.parseGarden(d);
    assert.equal(r.ok, false, what + ' is refused');
    assert.ok(r.errors.some((e) => /hidden or control character/.test(e)), what + ' is refused with plain words');
    assert.equal(P.parseDoc(d).ok, true, what + ' still parses as a PAXT 1 document, so a Dash document is untouched');
  }
  assert.equal(P.parseGarden(withBody('Line one.\n\tIndented with a tab.')).ok, true, 'a tab and line breaks in the body are kept');
  assert.equal(P.parseGarden(withBody('We share a \u{1F468}\u{200D}\u{1F469}\u{200D}\u{1F467} table \u{2764}\u{FE0F}.')).ok, true, 'an emoji held together by a joiner is kept');
});

test('the joiners Persian, Sinhala and Hindi write between letters are kept, and a joiner anywhere else is still refused', () => {
  const { nameProblem } = P;
  const ZWNJ = '\u{200C}', ZWJ = '\u{200D}';
  // Persian mi-khaham (I want), the Sinhala name of Sri Lanka, and Hindi ksha written with an explicit half form
  const words = [
    ['Persian', '\u{645}\u{6CC}' + ZWNJ + '\u{62E}\u{648}\u{627}\u{647}\u{645}'],
    ['Sinhala', '\u{DC1}\u{DCA}' + ZWJ + '\u{DBB}\u{DD3} \u{DBD}\u{D82}\u{D9A}\u{DCF}'],
    ['Hindi', '\u{915}\u{94D}' + ZWJ + '\u{937}'],
  ];
  for (const [what, w] of words) {
    assert.equal(P.parseGarden(withBody('We meet. ' + w)).ok, true, what + ' in the body opens');
    assert.equal(P.parseGarden(withBody('We meet.', { title: 'Tea ' + w })).ok, true, what + ' in the title opens');
    assert.equal(nameProblem(w), null, what + ' as a name is kept');
    assert.deepEqual(marksOf('We meet. ' + w), [], what + ' gets no hidden mark');
  }
  const still = [
    ['between Latin letters', 'Ye' + ZWNJ + 's'],
    ['across two scripts', '\u{645}' + ZWNJ + 'a'],
    ['at the end of a word', '\u{645}\u{6CC}' + ZWNJ + ' tea'],
    ['two in a row', '\u{645}' + ZWNJ + ZWNJ + '\u{62E}'],
    ['a joiner between Latin letters', 'Te' + ZWJ + 'a'],
  ];
  for (const [what, w] of still) {
    assert.equal(P.parseGarden(withBody('We meet. ' + w)).ok, false, what + ' is refused in the body');
    assert.notEqual(nameProblem(w), null, what + ' is refused in a name');
  }
});
