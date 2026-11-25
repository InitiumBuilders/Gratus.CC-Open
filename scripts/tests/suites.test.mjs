// The signature suites are vendored byte for byte from the PAXT voices (engine/vendor/README.md). These checks hold
// the copy to the hash recorded when it was taken, and to the suites' own vectors for the two device-key suites a
// garden accepts, so a copy edited here fails. They never read the source: a newer version of the suites does
// not show up here. It comes in on purpose, as a new copy, with its hash, the README and this file changed
// together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import * as S from '../../engine/vendor/paxt-suites.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SUITES_FILE = resolve(root, 'engine/vendor/paxt-suites.js');
const VECTORS_FILE = resolve(root, 'scripts/tests/fixtures/paxt-suites.vectors.json');
const SUITES_SHA = '98fd22ded9c107f7e4821328d87e301b1b6737993b869a811e73ce4126144715';
const VECTORS_SHA = 'a1e2625b28a0da4344ea6f5f188a47e39c4ca709861aeed73116c942aa9444ab';
const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

test('the vendored suites are the exact copy their README records', () => {
  assert.equal(sha(SUITES_FILE), SUITES_SHA);
  const readme = readFileSync(resolve(root, 'engine/vendor/README.md'), 'utf8');
  assert.ok(readme.includes(SUITES_SHA), 'the README records the hash');
  assert.ok(readme.includes(VECTORS_SHA), 'the README records the vectors hash');
  assert.match(readme, /2026-11-25/);
});

test('the vendored vectors are the exact copy taken with them', () => {
  assert.equal(sha(VECTORS_FILE), VECTORS_SHA);
});

test('the shared device prefix is the one the suites set', () => {
  assert.equal(S.DEVICE_PREFIX, 'PAXT Signed Line:\n');
});

const vectors = JSON.parse(readFileSync(VECTORS_FILE, 'utf8'));
for (const name of ['did-key:ed25519', 'did-key:p256']) {
  test('the vendored suites agree with the vectors for ' + name, async () => {
    const cases = (vectors.suites || vectors)[name];
    assert.ok(Array.isArray(cases) && cases.length > 0, 'the vectors hold cases for ' + name);
    const s = S.suite(name);
    for (const c of cases) {
      const line = c.line || vectors.line;
      assert.equal(s.account(c.account), c.account, 'the account is in its one spelling');
      assert.equal(await s.verify(c.account, line, c.signature), true, 'accepted: ' + c.account);
      // the same case through the chain-agnostic id, as a record holds it
      const id = 'did:key:' + c.account;
      assert.equal(await S.canonicalId(id), id);
      assert.equal(await S.verifyAccount(id, line, c.signature), true);
      assert.ok(Array.isArray(c.refuse) && c.refuse.length > 0);
      for (const r of c.refuse) {
        assert.equal(await s.verify(r.account, r.line, r.signature), false, 'refused: ' + r.why);
        assert.equal(await S.verifyAccount('did:key:' + r.account, r.line, r.signature), false, 'refused by id: ' + r.why);
      }
    }
  });
}
