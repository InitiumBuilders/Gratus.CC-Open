// The parts that hold an emoji together, and nowhere else, and the joiners some scripts write between letters.
//
// Some emoji are drawn from several characters, and inside an emoji these hide nothing. Anywhere else the same
// characters hide text or say nothing a reader can see, so a rule that refuses hidden characters (a name in
// engine/paxt.js, a signal's question in api/signal.js) runs on the text as drawn: these parts taken out first.
// One helper for both, so a name and a signal's text never disagree about an emoji, and one list of hidden
// characters (HIDDEN) for both to refuse. No imports: the server and the browser load it alike.
//
// Every character below is written as an escape, because typed in it would be invisible here too.

//   tag characters that spell a subdivision flag, right after U+1F3F4 and closed by U+E007F (England, Scotland);
const FLAG_TAGS = /\u{1F3F4}[\u{E0020}-\u{E007E}]{1,30}\u{E007F}/gu;
//   U+FE0E or U+FE0F right after a pictograph, which picks how it is drawn;
const EMOJI_STYLE = /(\p{Extended_Pictographic})[\u{FE0E}\u{FE0F}]/gu;
//   U+FE0F in a keycap (1, #, * and U+20E3);
const KEYCAP = /([0-9#*])\u{FE0F}\u{20E3}/gu;
//   U+200D between two emoji, which holds a family, a cook or a rainbow flag together.
const EMOJI_JOIN = /(\p{Extended_Pictographic}[\u{1F3FB}-\u{1F3FF}]?)\u{200D}(?=\p{Extended_Pictographic})/gu;
//   U+200C or U+200D between two letters of one script that is written with them: Persian and the other languages
//   in Arabic script, Syriac, and the scripts of India and Sri Lanka. There they choose how letters join or form a
//   conjunct, as in Persian mi-khaham or the Sinhala name of Sri Lanka, so ordinary words hold them. Between Latin
//   letters, or across two scripts, they change nothing a reader sees, and stay hidden.
const JOINING = ['Arab', 'Syrc', 'Deva', 'Beng', 'Guru', 'Gujr', 'Orya', 'Taml', 'Telu', 'Knda', 'Mlym', 'Sinh'];
const SCRIPT_JOIN = JOINING.map((sc) => new RegExp(String.raw`((?=[\p{L}\p{M}])\p{scx=${sc}})[\u{200C}\u{200D}](?=(?=[\p{L}\p{M}])\p{scx=${sc}})`, 'gu'));

/** The text with the joiners, tags and style marks that belong to an emoji taken out. Every other character,
    hidden ones included, is left where it was, so a check run on the answer still sees them. */
export function asDrawn(text) {
  let s = String(text ?? '')
    .replace(FLAG_TAGS, '\u{1F3F4}')
    .replace(EMOJI_STYLE, '$1')
    .replace(KEYCAP, '$1\u{20E3}')
    .replace(EMOJI_JOIN, '$1');
  for (const re of SCRIPT_JOIN) s = s.replace(re, '$1');
  return s;
}

/** Characters a reader cannot see, or that turn text around. Unicode marks the first kind Default_Ignorable_Code_Point:
    zero-width characters, U+00AD, U+034F, U+180B to U+180F, U+2060 to U+2064, U+FEFF, the variation selectors
    (U+FE00 to U+FE0F and U+E0100 to U+E01EF), tag characters and the Hangul fillers, named here too because text of
    one looks empty. The second kind is Bidi_Control: U+061C, U+200E, U+200F, U+202A to U+202E and U+2066 to
    U+2069. Test it on asDrawn(text), so the parts that hold an emoji together pass. The name rule
    (engine/paxt.js) and the signal's text rule (api/signal.js and assets/js/signal.js) all use this one, so they
    cannot drift apart. */
export const HIDDEN = /[\p{Bidi_Control}\p{Default_Ignorable_Code_Point}\u{115F}\u{1160}\u{3164}\u{FFA0}]/u;
