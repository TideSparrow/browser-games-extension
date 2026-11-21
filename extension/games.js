export const categories = ['racing', 'puzzle', 'sports', 'arcade'];

export const games = [
  { slug: 'neon-hockey-2', title: 'Neon Hockey 2', category: 'sports', tags: 'air hockey' },
  { slug: 'mini-golf-3d', title: 'Mini Golf 3D', category: 'sports', tags: 'minigolf' },
  { slug: 'deadly-descent', title: 'Deadly Descent', category: 'racing', tags: 'downhill driving car' },
  { slug: 'astro-block', title: 'Astro Block', category: 'puzzle', tags: 'blocks' },
  { slug: 'block-blast-master', title: 'Block Blast Master', category: 'puzzle', tags: 'blocks' },
  { slug: 'basket-random', title: 'Basket Random', category: 'sports', tags: 'basketball two player' },
  { slug: 'ragdoll-soccer', title: 'Ragdoll Soccer', category: 'sports', tags: 'football two player' },
  { slug: 'mini-soccer-3d', title: 'Mini Soccer 3D', category: 'sports', tags: 'football' },
  { slug: 'kart-volcano', title: 'Kart Volcano', category: 'racing', tags: 'karting driving' },
  { slug: 'jelly-vortex-3d', title: 'Jelly Vortex 3D', category: 'puzzle', tags: 'sorting' },
  { slug: 'slime-tilt', title: 'Slime Tilt', category: 'arcade', tags: 'platform' },
  { slug: 'arcade-2048', title: 'Arcade 2048', category: 'puzzle', tags: 'number tiles' },
  { slug: 'onet-gravity', title: 'Onet Gravity', category: 'puzzle', tags: 'matching tiles' },
  { slug: 'tideroll-block-puzzle', title: 'TideRoll: Block Puzzle', category: 'puzzle', tags: 'blocks' },
  { slug: 'animals-kart', title: 'Animals Kart', category: 'racing', tags: 'karting driving' },
  { slug: 'mini-tennis-3d', title: 'Mini Tennis 3D', category: 'sports', tags: 'racket' },
];

export function filterGames(query, category, favorites, categoryLabel = (value) => value) {
  const words = query.trim().toLowerCase().split(/\s+/u);

  return games.filter((game) => {
    if (category && game.category !== category) return false;
    if (favorites && !favorites.has(game.slug)) return false;
    const searchable = [game.title, game.category, categoryLabel(game.category), game.tags].join(' ').toLowerCase();
    return words.every((word) => searchable.includes(word));
  });
}

export function pickGame(choices, previousSlug, random = Math.random) {
  if (choices.length < 2) return choices[0];
  const pool = choices.filter(({ slug }) => slug !== previousSlug);
  return pool[Math.floor(random() * pool.length)];
}

export function siteLink(slug, placement) {
  const path = slug ? `/games/${encodeURIComponent(slug)}` : '/';
  const url = new URL(path, 'https://browsergamehub.net');
  url.searchParams.set('utm_source', 'chrome-extension');
  url.searchParams.set('utm_medium', 'referral');
  url.searchParams.set('utm_campaign', `browser-games-extension-${placement}`);
  return url.href;
}
