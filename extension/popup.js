import { filterGames, siteLink } from './games.js';
import { loadCatalog, refreshCatalog } from './catalog.js';
import { initDiceDraw } from './dice.js';

const message = (key, substitutions) => chrome.i18n.getMessage(key, substitutions);
const storageKey = 'favorites';

document.documentElement.lang = message('documentLanguage');
document.title = message('appName');
for (const element of document.querySelectorAll('[data-message]')) {
  element.textContent = message(element.dataset.message);
}

const website = document.querySelector('#website');
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const favoritesButton = document.querySelector('#favorites');
const roll = document.querySelector('#roll');
const gameList = document.querySelector('#games');
const rowTemplate = document.querySelector('#game-row');
const count = document.querySelector('#count');
const empty = document.querySelector('#empty');
const more = document.querySelector('#more');
const batchSize = 20;

website.href = siteLink('', 'website');
search.placeholder = message('searchHint');

let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter((slug) => typeof slug === 'string'));
} catch {
  // A malformed value should never prevent the catalog from opening.
}

let showingFavorites = false;
let catalog = loadCatalog(localStorage);
let results = [];

const marks = { racing: '↗', puzzle: '◆', sports: '●', arcade: '✦' };
const categoryName = (value) => message(value) || value.replace(/^./u, (letter) => letter.toUpperCase());

function updateCategories() {
  const selected = category.value;
  category.length = 1;
  const values = [...new Set(catalog.map((game) => game.category))];
  values.sort((a, b) => categoryName(a).localeCompare(categoryName(b), document.documentElement.lang));
  for (const value of values) category.add(new Option(categoryName(value), value));
  if (values.includes(selected)) category.value = selected;
}

function setFavoriteState(button, game) {
  button.setAttribute('aria-pressed', String(favorites.has(game.slug)));
}

function makeRow(game) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  const link = row.querySelector('.game-link');
  const mark = row.querySelector('.category-mark');
  const star = row.querySelector('.star');

  row.dataset.slug = game.slug;
  link.href = siteLink(game.slug, 'catalog', game.path);
  mark.textContent = Object.hasOwn(marks, game.category) ? marks[game.category] : '✦';
  mark.dataset.category = game.category;
  if (game.cover) {
    const image = new Image();
    image.alt = '';
    image.loading = 'lazy';
    image.referrerPolicy = 'no-referrer';
    image.addEventListener('error', () => image.remove(), { once: true });
    image.src = game.cover;
    mark.append(image);
  }
  row.querySelector('.game-title').textContent = game.title;
  row.querySelector('.game-category').textContent = categoryName(game.category);
  star.setAttribute('aria-label', message('favoriteGame', game.title));
  setFavoriteState(star, game);

  star.addEventListener('click', () => {
    if (favorites.has(game.slug)) favorites.delete(game.slug);
    else favorites.add(game.slug);
    localStorage.setItem(storageKey, JSON.stringify([...favorites]));

    if (showingFavorites) {
      const index = Array.from(gameList.children).indexOf(row);
      render(gameList.children.length, gameList.scrollTop);
      const next = gameList.children[Math.min(index, gameList.children.length - 1)];
      (next?.querySelector('.star') ?? favoritesButton).focus();
    } else {
      setFavoriteState(star, game);
    }
  });
  return row;
}

function appendResults(size = batchSize) {
  const start = gameList.children.length;
  gameList.append(...results.slice(start, start + size).map(makeRow));
  more.hidden = gameList.children.length >= results.length;
  return gameList.children[start];
}

function render(size = batchSize, scrollTop = 0) {
  results = filterGames(search.value, category.value, showingFavorites ? favorites : null, categoryName, catalog);
  gameList.replaceChildren();
  appendResults(size);
  gameList.scrollTop = scrollTop;
  count.textContent = results.length === 1 ? message('oneGame') : message('gameCount', String(results.length));
  empty.hidden = results.length > 0;
  empty.textContent = message(showingFavorites && favorites.size === 0 ? 'emptyFavorites' : 'emptySearch');
  roll.setAttribute('aria-disabled', String(results.length === 0));
}

search.addEventListener('input', () => render());
category.addEventListener('change', () => render());
gameList.addEventListener('scroll', () => {
  if (!more.hidden && gameList.scrollHeight - gameList.scrollTop - gameList.clientHeight < 80) {
    appendResults();
  }
}, { passive: true });
more.addEventListener('click', () => appendResults()?.querySelector('a').focus());
favoritesButton.addEventListener('click', () => {
  showingFavorites = !showingFavorites;
  favoritesButton.setAttribute('aria-pressed', String(showingFavorites));
  render();
});

initDiceDraw(roll, () => results, message);

updateCategories();
render();
refreshCatalog(localStorage).then((updated) => {
  if (!updated) return;
  const focused = document.activeElement;
  const focusedSlug = focused.closest('.game-row')?.dataset.slug;
  catalog = updated;
  updateCategories();
  render(Math.max(batchSize, gameList.children.length), gameList.scrollTop);
  if (focusedSlug) {
    const row = Array.from(gameList.children).find((item) => item.dataset.slug === focusedSlug);
    (row?.querySelector(focused.matches('.star') ? '.star' : 'a') ?? search).focus({ preventScroll: true });
  } else if (focused === more && more.hidden) {
    gameList.lastElementChild?.querySelector('a').focus();
  }
});
