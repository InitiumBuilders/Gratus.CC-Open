# Security

## Reporting something

Use **GitHub's private vulnerability reporting** on this repository: the Security tab, then
"Report a vulnerability". It goes straight to the maintainer and stays private while it is
being fixed.

Please do not open a public issue for anything that could be used against somebody before
it is fixed.

You should get a first answer within a few days. If a report is real, the fix and the gate
that proves it ship together, and you are credited unless you would rather not be.

## What is worth reporting

- Anything that lets somebody read words their author had not published.
- Anything that lets somebody act as a project, a room or another person.
- Anything that lets somebody delete or overwrite what another person wrote.
- Anything that writes an unverified number into a document that people read as fact.
- Secrets in the tree, in the history, or in a deployment.

## What this project already assumes

- **The store is public by path.** Every document in Vercel Blob is world readable to
  anyone holding its URL, so nothing sensitive is ever stored unhashed, and counters are
  keyed by a salted hash with the salt held in the environment.
- **Keys never travel in a URL.** A query string is written to every log it passes.
- **A claim is proved, not asserted.** A project key is only issued to somebody who can
  edit what that project says about itself on Giveth.
- **Journal text never reaches a server.** If you find a path where it does, that is a
  security report.

## What is out of scope

Rate limits are soft ceilings against runaway cost, not exact meters, and the read, modify,
write pattern behind them can undercount under load. That is written down rather than
hidden. Denial of service against the free hosting tier is not a finding.
