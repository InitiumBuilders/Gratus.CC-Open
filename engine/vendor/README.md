# Vendored files

These files are copies, byte for byte. Never edit them here. They belong to their owners and are not under this
repository's licence; their owners' terms apply. A new version comes from its source as a whole new
copy, with the hash below and the test that holds it changed in the same commit.

## paxt-suites.js

- What it is: the PAXT signature suites. It checks one signed line for a wallet or a device key, and sets the one
  device-key format every app that signs PAXT lines uses (`DEVICE_PREFIX`, did:key addresses, unpadded base64url
  signatures, P-256 with s in the lower half). Gratus checks every signature with its `verifyAccount`.
- Source: the file suites.mjs in the voices folder of the shared PAXT folder on the build machine, kept by the
  owners of the suites.
- Copied: 2026-11-25
- sha256: `98fd22ded9c107f7e4821328d87e301b1b6737993b869a811e73ce4126144715`
- Imports: none. It runs in browsers and in Node 18 or later (it uses `globalThis.crypto.subtle`).
- Held by: `scripts/tests/suites.test.mjs`, which fails if the copy's sha256 changes.

The vectors that go with it sit at `scripts/tests/fixtures/paxt-suites.vectors.json`, copied the same day from
suites.vectors.json beside the source, sha256
`a1e2625b28a0da4344ea6f5f188a47e39c4ca709861aeed73116c942aa9444ab`.
