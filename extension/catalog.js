import { games } from './games.js';

const origin = 'https://files.browsergamehub.net';
const url = origin + '/extensions/catalog-v1.json';
const catalogKey = 'game-catalog-v1';
const refreshKey = 'game-catalog-v1-attempt';
const refreshInterval = 60 * 60 * 1000;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const gamePathPattern = /^\/games\/[a-z0-9]+(?:-[a-z0-9]+)*$/;
const coverPattern = /^game-hub\/(?:[\w-]+\/)*[\w.-]+\.(?:webp|png|jpe?g)$/i;

export function parseCatalog(value) {
  if (value?.version !== 1 || !Array.isArray(value.games)) return null;

  const slugs = new Set();
  const catalog = [];
  for (const game of value.games) {
    if (
      typeof game?.slug !== 'string' || !slugPattern.test(game.slug) || slugs.has(game.slug)
      || typeof game.path !== 'string' || !gamePathPattern.test(game.path)
      || typeof game.title !== 'string' || !game.title.trim()
      || typeof game.category !== 'string' || !game.category.trim()
      || !Array.isArray(game.keywords) || game.keywords.some((item) => typeof item !== 'string')
    ) return null;

    slugs.add(game.slug);
    catalog.push({
      slug: game.slug,
      path: game.path,
      title: game.title,
      category: game.category.toLowerCase(),
      keywords: game.keywords.join(' '),
      cover: typeof game.cover === 'string' && coverPattern.test(game.cover) ? origin + '/' + game.cover : '',
    });
  }
  return catalog;
}

export function loadCatalog(storage) {
  try {
    return parseCatalog(JSON.parse(storage.getItem(catalogKey))) ?? games;
  } catch {
    return games;
  }
}

export async function refreshCatalog(storage, fetchCatalog = fetch, now = Date.now()) {
  try {
    const lastAttempt = Number(storage.getItem(refreshKey));
    if (lastAttempt > 0 && now >= lastAttempt && now - lastAttempt < refreshInterval) return null;
    storage.setItem(refreshKey, String(now));
  } catch {
    // Keep the popup usable when storage is unavailable.
  }

  try {
    const response = await fetchCatalog(url, {
      credentials: 'omit',
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const value = await response.json();
    const catalog = parseCatalog(value);
    if (!catalog) return null;
    const serialized = JSON.stringify(value);
    try {
      if (storage.getItem(catalogKey) === serialized) return null;
      storage.setItem(catalogKey, serialized);
    } catch {
      // The freshly loaded catalog is still usable in this popup.
    }
    return catalog;
  } catch {
    return null;
  }
}
