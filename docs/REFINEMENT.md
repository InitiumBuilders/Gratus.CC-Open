# Refinement

How this repository is polished, how machine writing is taken out of it, and the
prompt to run when it needs doing again. Written for Gratus.CC and usable on any
product that a person and a model are building together.

---

## 1. The first rule: whose words are these

August wrote the taglines, the mantras, the mockup copy, the colophon and every
line in `config/copy.json` under `locked`. Those are his. They are never
reworded, reformatted, retitled or improved, and that includes their spelling,
their capitalisation, their punctuation and their spacing. If one of his lines
trips a rule below, the rule is wrong.

Everything else is mine to fix: interface copy, headings, empty states, error
messages, button labels, documentation, code comments, commit messages.

This is not left to memory. `config/his-words.json` lists his lines, and
`scripts/gates/slop.mjs` reads that file and looks away from any line containing
one. The registry is the mechanism. A line of his that is not in it is a line a
gate may one day rewrite, so a new line of his goes into the registry in the same
breath it goes into the product.

---

## 2. Why machine writing sounds the way it does

A language model writes whatever is most likely to come next, so by default it
makes the choice that fits the widest range of readers and subjects. A person
writes for one reader and one subject, so their choices are uneven and specific.
Every habit below is one form of that default:

- **Staging.** The sentence signals importance instead of adding a fact.
- **Rhythm by rule.** Threes and dashes applied whether or not the meaning asks.
- **Inflation.** An ordinary fact dressed as a turning point.
- **Leftovers.** Chat wrappers and drafting moves that were never for the reader.

Two rules follow. Every sentence that stays must add something the reader did not
already have. A habit counts in proportion to how rarely a careful writer would
choose it on purpose.

---

## 3. The ladder

Work down it. Each rung is cheaper to fix than the one below and each one
uncovers the next.

1. **The mechanical habits.** Run `node scripts/gates/slop.mjs`. It reports a
   file, a line and the rule. Fix every hit. This takes minutes and it is the
   floor.
2. **The shapes a grep cannot see.** Read the page aloud. Look for a contrast
   split across two sentences, three parallel examples arranged because three
   sounded complete, a one line closer that restates the paragraph above it, and
   the same closer after every section.
3. **The empty sentence.** Ask of each one: what does the reader have now that
   they did not have before it? Cut the ones with no answer. Shorten by leaving
   things out rather than by packing them in.
4. **The thing itself.** Copy is often a patch over a design that has not decided
   what it is. When a sentence is hard to write, the screen underneath it is
   usually the problem. Four dashes in this repository were standing in for a
   value the interface had never decided how to show, and removing them meant
   choosing the word: `not yet` for an answer that has not come, `$0` for a
   project that has raised nothing.

---

## 4. The strategy prompt

Copy this whole block. It is written to be handed to a model working on someone
else's product.

```
Run a refinement pass on the wording in this repository.

WHOSE WORDS: <path to the registry of the owner's lines>. Every line listed
there, and every line quoted from it, is the owner's. Never reword, reformat,
retitle or "improve" any of it, including spelling, capitalisation, punctuation
and spacing. If one of those lines trips a rule, the rule is wrong, not the line.
Everything else is yours to fix: interface copy, headings, empty states, error
messages, button labels, docs, code comments, commit messages.

WHAT TO REMOVE, strongest first:
1. A contrast with nothing on the other side of it. "Not just X, but Y",
   "it's not X, it's Y", and the same shape split across two sentences. State
   the claim.
2. A line that asks the reader to pause instead of adding to it. One sentence
   paragraphs restating the paragraph above, and the same closer after every
   section.
3. A saying that sounds deep. "At its core", "the real question is", "what
   really matters". Replace it with the specific claim.
4. A run-up that announces the point instead of making it. "Let's dive in",
   "here's what you need to know", "the thing is".
5. An objection nobody raised, and an option no reader would weigh.
6. Threes that arrived because three sounds complete. Check that each item
   carries a distinct idea; merge or develop when they do not.
7. Dashes doing the work of a decision. Replace each one with a full stop, a
   comma or a colon, or rewrite the sentence. A dash tight between characters
   in a range is correct typography, leave it.
8. Words a model reaches for far more often than a person does: delve, tapestry,
   testament, underscore, showcase, foster, pivotal, meticulous, seamless,
   vibrant, transformative, cutting-edge, ever-evolving.
9. An ordinary fact dressed as a turning point. "Stands as a testament",
   "marks a pivotal moment", "the future looks bright".
10. Qualifiers stacked until nothing is claimed.

WHAT TO KEEP: every supported claim, every number, every name. Do not add a
fact, a date, a quote or a citation that is not already there or given to you.
If a sentence needs a detail you do not have, write a simpler sentence or ask.

HOW TO WORK:
- Read the whole thing once and mark every habit before changing anything.
- Rewrite by saying the point plainly, not by patching flagged phrases one at
  a time. If a sentence stays awkward, rewrite the paragraph around its point.
- Vary sentence length. Real writing alternates short and long.
- Read the result aloud and find the five that survive a rewrite most often: a
  not-X-but-Y contrast, a one line closer, a dash, a three, a bold label.
- Then check that nothing was lost: no claim, number, name or date dropped.

WHAT TO BUILD, so this never has to be done by hand again:
- A gate that scans the prose and fails the build on the mechanical habits.
- A registry of the owner's lines that the gate skips whole.
- A decoy run that proves two things before every ship: each rule still catches
  a planted violation, AND the owner's lines still come through untouched.
  A gate that has stopped biting is worse than no gate, and a gate that has
  started biting the owner is worse than both.

REPORT: what was changed and why, what was left alone and why, and what a grep
cannot catch and therefore still needs a person.
```

---

## 5. What the gate cannot do

It matches habits that can be matched. It cannot see a paragraph that says
nothing in four graceful sentences. It cannot see three examples arranged in a
row because three sounded complete. It cannot tell a sentence that earns its
place from one that fills a gap. A pass means the floor is clean, and the floor
is not the room. Section 3 rungs 2 to 4 are still read by a person, every time.

It is also blunt on purpose. The dash rule has one exception, for a range sitting
tight between characters, and no exceptions in prose at all. The alternative is a
rule with a list of cases, and a rule with a list of cases is one nobody can hold
in their head while writing.

Fenced blocks are skipped everywhere. A block holds a command, a snippet or a
prompt being quoted, and none of it is the repository speaking. Without that, the
prompt in section 4 could not name a single habit it exists to remove.

---

## 6. Next moves, in order

**Now.**

1. Rotate the ElevenLabs key. It was once pasted into a chat window, and a key
   that has been seen outside the environment is a key to replace. Moving the
   new one takes one `vercel env` call per project and it never touches a file.
2. ~~Cap voice uploads below six megabytes.~~ Shipped in v32 at two megabytes,
   about forty seconds of speech.
3. Send the Giveth pitch. It has been written since v15 and sits in
   [GIVETH.md](GIVETH.md) section 5. The channels are their forum, their
   Discord, a GitHub discussion on `Giveth/impact-graph`, or their account on X.
   This one needs August, because it goes out under his name.

**Next.**

4. ~~A room's own sound.~~ Shipped in v31. A Vibe sounds the root when your
   words land in it, and a Passage sounds the chord as far as the furthest
   plant in the garden it shows.
5. ~~A gift that reports back.~~ Shipped in v32 as the Return. What is still
   open is the second hop: a gift that is passed on rather than kept has no way
   to tell the first giver that it travelled again.
6. The project console still looks plainer than every room around it.
7. A sweep for the Return. A document is kept until someone removes it, and
   nothing removes one. There is no harm in a kept one, because it holds a
   phase against a random number, and a store that only grows is still a store
   that only grows.
8. Teach the slop gate one shape a grep can almost see: a one sentence paragraph
   that repeats a noun phrase from the paragraph above it.

**Later.**

8. Accounts and a cloud Gratus profile, which August has said comes after a few
   more updates.
9. A second pair of eyes on the phase thresholds. Nine days to Bloomed and
   thirteen to Ready to Give were chosen by feel and have never been checked
   against how anyone actually writes.

---

*The floor is clean. The room is the work.*
