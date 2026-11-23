import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import { loadCatalog, parseCatalog, refreshCatalog } from '../extension/catalog.js';
import { categories, filterGames, games, pickGame, siteLink } from '../extension/games.js';
import { formatMessage } from '../extension/i18n.js';

test('catalog slugs are unique and belong to known categories', () => {
  assert.equal(new Set(games.map(({ slug }) => slug)).size, games.length);
  for (const game of games) {
    assert.match(game.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(categories.includes(game.category));
  }
});

test('search, category, and favorites compose', () => {
  assert.deepEqual(filterGames(' soccer TWO ', 'sports', new Set(['ragdoll-soccer'])).map((g) => g.slug), ['ragdoll-soccer']);
  assert.deepEqual(filterGames('赛车', 'racing', null, () => '赛车').length, 3);
  assert.deepEqual(filterGames('soccer', 'puzzle'), []);
});

const catalogFixture = {
  version: 1,
  games: [{
    slug: 'animal-golf',
    path: '/games/animal-golf',
    title: 'Animal Golf',
    category: 'Sports',
    keywords: ['动物高尔夫', 'minigolf'],
    cover: 'game-hub/covers/animal-golf.webp',
  }],
};

test('downloaded titles, aliases, categories, and favorites work together', () => {
  const catalog = parseCatalog(catalogFixture);
  assert.deepEqual(
    filterGames('动物高尔夫 ＭＩＮＩＧＯＬＦ', 'sports', new Set(['animal-golf']), undefined, catalog),
    catalog,
  );
  assert.deepEqual(filterGames('动物高尔夫', 'puzzle', null, undefined, catalog), []);
  assert.equal(catalog[0].cover, 'https://files.browsergamehub.net/game-hub/covers/animal-golf.webp');
});

test('catalog accepts empty results and rejects malformed records and external game links', () => {
  const [game] = catalogFixture.games;
  assert.deepEqual(parseCatalog({ version: 1, games: [] }), []);
  assert.equal(parseCatalog({ version: 1, games: [game, game] }), null);
  assert.equal(parseCatalog({ version: 1, games: [{ ...game, path: '//example.org/games/animal-golf' }] }), null);
  assert.equal(parseCatalog({ version: 1, games: [{ ...game, keywords: [null] }] }), null);
  assert.equal(parseCatalog({ version: 1, games: [{ ...game, cover: 'https://example.org/image.webp' }] })[0].cover, '');
});

test('refresh is limited per hour and failures preserve the last good catalog', async () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  let requests = 0;
  const fetchCatalog = async (url, options) => {
    requests++;
    assert.equal(url, 'https://files.browsergamehub.net/extensions/catalog-v1.json');
    assert.equal(options.credentials, 'omit');
    if (requests === 1) return Response.json(catalogFixture);
    return new Response(null, { status: 503 });
  };

  assert.equal(loadCatalog(storage), games);
  assert.deepEqual(await refreshCatalog(storage, fetchCatalog, 1000), parseCatalog(catalogFixture));
  assert.equal(await refreshCatalog(storage, fetchCatalog, 60_000), null);
  assert.equal(requests, 1);
  assert.equal(await refreshCatalog(storage, fetchCatalog, 3_601_000), null);
  assert.equal(requests, 2);
  assert.deepEqual(loadCatalog(storage), parseCatalog(catalogFixture));
});

test('the random pick uses only the visible games and avoids immediate repeats', () => {
  assert.equal(pickGame([], 'missing'), undefined);
  assert.equal(pickGame([games[0]], games[0].slug), games[0]);
  assert.equal(pickGame([games[0], games[1]], games[0].slug, () => 0), games[1]);
});

test('outbound links stay on the official site and carry placement attribution', () => {
  const url = new URL(siteLink('deadly-descent', 'dice'));
  assert.equal(url.origin, 'https://browsergamehub.net');
  assert.equal(url.pathname, '/games/deadly-descent');
  assert.equal(url.searchParams.get('utm_source'), 'chrome-extension');
  assert.equal(url.searchParams.get('utm_campaign'), 'browser-games-extension-dice');
  assert.equal(new URL(siteLink('', 'website')).pathname, '/');
});

test('manifest requests no extension permissions and popup translations match', async () => {
  async function load(file) {
    return JSON.parse(await readFile(new URL(`../extension/${file}`, import.meta.url), 'utf8'));
  }
  const manifest = await load('manifest.json');
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.permissions, undefined);
  assert.equal(manifest.host_permissions, undefined);
  assert.equal(manifest.content_scripts, undefined);

  const popup = await readFile(new URL('../extension/popup.html', import.meta.url), 'utf8');
  const select = popup.match(/<select id="language"[^>]*>([\s\S]*?)<\/select>/)[1];
  const options = [...select.matchAll(/<option value="([^"]+)" lang="([^"]+)">/g)];
  const catalogs = await readdir(new URL('../extension/_locales/', import.meta.url));
  assert.equal(manifest.default_locale, 'en');
  assert.deepEqual(
    options.map(([, locale]) => locale).sort(),
    catalogs.sort(),
  );

  const english = await load('_locales/en/messages.json');
  for (const [, locale, language] of options) {
    const messages = await load(`_locales/${locale}/messages.json`);
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(english).sort(), locale);
    assert.equal(messages.documentLanguage.message, language);
    assert.ok(messages.appDescription.message.length <= 132, locale);
    for (const [key, entry] of Object.entries(messages)) {
      assert.ok(entry.message.trim(), `${locale}.${key}`);
      assert.deepEqual(entry.placeholders, english[key].placeholders, `${locale}.${key}`);
      if (entry.placeholders) {
        const substitution = 'Example $1';
        const formatted = formatMessage(entry, substitution);
        assert.ok(formatted.includes(substitution), `${locale}.${key}`);
        assert.doesNotMatch(formatted, /\$[A-Z_]+\$/i, `${locale}.${key}`);
      }
    }
  }
});
