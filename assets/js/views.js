// THE VIEW REGISTRY · every screen this app can be on, named once.
//
// They were spread through a chain of conditions with nowhere to look to answer the
// question "what screens are there". That is also why the browser tab said Gratus.CC on
// every one of them and a history of twenty steps read as one page.
//
// It is a plain module with no imports so that a gate can load it under Node and walk it
// without a browser. `route` is where the app lives; `title` is what the tab says; `door`
// is which of the three the bar should light.
export const VIEWS = {
  gratus:   { route: '/app',            title: 'Gratus',               door: 'gratus' },
  grow:     { route: '/app/grow',       title: 'Grow',                 door: 'grow'   },
  give:     { route: '/app/give',       title: 'Give',                 door: 'give'   },
  garden:   { route: '/app/garden',     title: 'Your Gratus Garden',   door: 'gratus' },
  book:     { route: '/app/book',       title: 'Growth Book',          door: 'gratus' },
  giveth:   { route: '/app/giveth',     title: 'Give with Giveth',     door: 'give'   },
  vibes:    { route: '/app/vibes',      title: 'Gratus Vibes',         door: 'gratus' },
  guides:   { route: '/app/guides',     title: 'Gratus Guides',        door: 'gratus' },
  goals:    { route: '/app/goals',      title: 'Gratus Goals',         door: 'gratus' },
  galaxy:   { route: '/app/galaxy',     title: 'The Gratus Galaxy',    door: 'gratus' },
  world:    { route: '/app/world',      title: 'The world',            door: 'give'   },
  projects: { route: '/app/projects',   title: 'Projects',             door: 'give'   },
  earth:    { route: '/app/earth',      title: 'Earth',                door: 'give'   },
  vault:    { route: '/app/vault',      title: 'The vault',            door: 'gratus' },
  console:  { route: '/app/console',    title: 'Your project',         door: 'give'   },
  trace:    { route: '/app/trace',      title: 'The trace',            door: 'give'   },
  passage:  { route: '/passage',        title: 'Your Passage',         door: 'gratus' },
  journey:  { route: '/gift',           title: 'A Gratus gift',        door: 'give'   },
  page:     { route: '/p/:slug',        title: 'A Gratus page',        door: 'give'   },
  home:     { route: '/',               title: 'Gratus.CC',            door: 'gratus' },
};

/** What the browser tab should say on a given screen. */
export function titleOf(tab, sub) {
  const v = VIEWS[sub] || VIEWS[tab] || VIEWS.home;
  return v.title === 'Gratus.CC' ? v.title : v.title + ' \u00b7 Gratus.CC';
}
