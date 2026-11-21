// THE FIRST WALK.
//
// Three lit steps, on the real page: the box, the emoji, the button. Each one cuts a hole
// in the dark around the real control and names it. Doing the thing moves it on; so does
// Next. What happens when the button is pressed is the app's own answer, and the walk is
// over by then.
//
// It runs once, for somebody who has never been here, and afterwards only when asked.

export const TOUR = [
  { at: 'grow', find: '#write, textarea.field', k: 'Write One True Thing', act: 'input' },
  { at: 'grow', find: '.pick, .chips', k: 'Give It An Emoji' },
  { at: 'grow', find: '#plant, .btn.gold, .btn.mint', k: 'Plant It', act: 'click' },
];

// The one-screen opening, before the walk.
export const OPEN = {
  k: 'Gratus means honor.',
  h: 'A gratitude journal that grows a garden.',
  p: 'Write one true thing a day. Give it an emoji. It grows, and what grows can be given.',
};
