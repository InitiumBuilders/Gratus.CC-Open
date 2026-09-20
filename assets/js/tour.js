// THE GUIDED TOUR.
//
// Not a slideshow. It walks somebody through the actual app: it finds the real control on
// the real screen, cuts a hole in the dark around it so there is exactly one lit thing,
// says what it is in one sentence, and waits. Doing the thing moves it on; so does Next.
//
// Every step names a selector and the screen it lives on. If a step's control is not there
// on a given build, the step is skipped rather than pointing at nothing, because a tour
// that highlights an empty rectangle is worse than no tour.
//
// It runs once, for somebody who has never been here, and afterwards only when asked.

export const TOUR = [
  { at: 'grow', find: '#write, textarea.field',
    k: 'Write one true thing',
    p: 'It does not have to be large. "The bus was on time" is a real day. This is the only box you ever have to use.',
    act: 'input' },
  { at: 'grow', find: '.pick, .chips',
    k: 'Give it an emoji',
    p: 'The emoji is the plant. Everything you write with it from now on feeds the same one.' },
  { at: 'grow', find: '#plant, .btn.gold, .btn.mint',
    k: 'Plant it',
    p: 'That is day one. Come again tomorrow and it reaches Nurtured. Miss a week and nothing is taken away.',
    act: 'click' },
  { at: 'grow', find: '.tools',
    k: 'Or say it out loud',
    p: 'Voice is transcribed on the way in. The recording itself stays on this device and is never sent anywhere.' },
  { at: null, find: '.tabs .bar',
    k: 'Three doors',
    p: 'Give, Gratus, Grow. Tap them, or swipe across the screen to move between them.' },
  { at: 'garden', find: '.garden, .field, .rows',
    k: 'Your garden',
    p: 'Every plant you have grown. Tap one to look closer. Hold one for what you usually want: look, write, or give.' },
  { at: 'garden', find: '.glyphcard, .glyphfig',
    k: 'Your Glyph',
    p: 'Drawn from your garden and nothing else. The same figure every time, and nobody else’s garden draws it.' },
  { at: 'give', find: '#give-gift, .btn.gold',
    k: 'Give it away',
    p: 'At thirteen days it is ready. The whole gift lives inside a link, and when they plant it the days come with it.' },
];

// The one-screen opening, before the walk: what this is, in four lines.
export const OPEN = {
  k: 'Gratus means honor.',
  h: 'A gratitude journal that grows a garden.',
  p: 'Write one true thing. Give it an emoji. It grows on the days you write with it, and at thirteen days you can give it away with every one of those days inside it.',
};
