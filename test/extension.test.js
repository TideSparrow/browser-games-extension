import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { categories, filterGames, games, pickGame, siteLink } from '../extension/games.js';

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
  const en = await load('_locales/en/messages.json');
  const zh = await load('_locales/zh_CN/messages.json');
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
});
