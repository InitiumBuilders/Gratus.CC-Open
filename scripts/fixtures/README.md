# Fixtures

`garden-v1.json` is a whole Gratus garden held at `v: 1`, which is the version
every garden on a person's device holds today. It carries an entry with a photo
field, one with a voice recording, a starred one, a folder, three plants at three
phases, one of them arrived as a gift and carrying its Return, a gift given with
two words back, a bloomed seed with its reply, a goal, a vibe, a milestone, an
alchemy mark and a sunlight reading.

It exists for one gate. `scripts/gates/migration.mjs` loads it, walks it up the
ladder in `engine/state.js`, and asserts that nothing in it was lost. The whole
point is the line that used to read `if (!S || S.v !== 1) S = fresh()`.

The content is representative rather than captured from a real person, and it is
written down here so nobody mistakes it for one. What matters for the gate is the
shape, and the shape is the shape the app writes.
