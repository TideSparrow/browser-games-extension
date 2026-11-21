import { categories, filterGames, pickGame, siteLink } from './games.js';

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
const die = roll.querySelector('.die');
const picked = document.querySelector('#picked');
const pickedTitle = document.querySelector('#picked-title');
const pickedPlay = document.querySelector('#picked-play');
const announcement = document.querySelector('#announcement');
const gameList = document.querySelector('#games');
const rowTemplate = document.querySelector('#game-row');
const count = document.querySelector('#count');
const empty = document.querySelector('#empty');
const motionAllowed = matchMedia('(prefers-reduced-motion: no-preference)');

website.href = siteLink('', 'website');
search.placeholder = message('searchHint');
for (const value of categories) category.add(new Option(message(value), value));

let favorites = new Set();
try {
  const saved = JSON.parse(localStorage.getItem(storageKey) ?? '[]');
  if (Array.isArray(saved)) favorites = new Set(saved.filter((slug) => typeof slug === 'string'));
} catch {
  // A malformed value should never prevent the catalog from opening.
}

let showingFavorites = false;
let rolling = false;
let results = [];
let selected;

const marks = { racing: '↗', puzzle: '◆', sports: '●', arcade: '✦' };

function setFavoriteState(button, game) {
  button.setAttribute('aria-pressed', String(favorites.has(game.slug)));
}

function makeRow(game) {
  const row = rowTemplate.content.firstElementChild.cloneNode(true);
  const link = row.querySelector('.game-link');
  const mark = row.querySelector('.category-mark');
  const star = row.querySelector('.star');

  link.href = siteLink(game.slug, 'catalog');
  mark.textContent = marks[game.category];
  mark.dataset.category = game.category;
  row.querySelector('.game-title').textContent = game.title;
  row.querySelector('.game-category').textContent = message(game.category);
  star.setAttribute('aria-label', message('favoriteGame', game.title));
  setFavoriteState(star, game);

  star.addEventListener('click', () => {
    if (favorites.has(game.slug)) favorites.delete(game.slug);
    else favorites.add(game.slug);
    localStorage.setItem(storageKey, JSON.stringify([...favorites]));

    if (showingFavorites) {
      const index = Array.from(gameList.children).indexOf(row);
      render();
      const next = gameList.children[Math.min(index, gameList.children.length - 1)];
      (next?.querySelector('.star') ?? favoritesButton).focus();
    } else {
      setFavoriteState(star, game);
    }
  });
  return row;
}

function render() {
  results = filterGames(search.value, category.value, showingFavorites ? favorites : null, message);
  gameList.replaceChildren(...results.map(makeRow));
  count.textContent = results.length === 1 ? message('oneGame') : message('gameCount', String(results.length));
  empty.hidden = results.length > 0;
  empty.textContent = message(showingFavorites && favorites.size === 0 ? 'emptyFavorites' : 'emptySearch');
  roll.setAttribute('aria-disabled', String(rolling || results.length === 0));

  if (selected && !results.some(({ slug }) => slug === selected.slug)) {
    picked.hidden = true;
    announcement.textContent = '';
  }
}

search.addEventListener('input', render);
category.addEventListener('change', render);
favoritesButton.addEventListener('click', () => {
  showingFavorites = !showingFavorites;
  favoritesButton.setAttribute('aria-pressed', String(showingFavorites));
  render();
});

roll.addEventListener('click', async () => {
  if (rolling || results.length === 0) return;
  rolling = true;
  roll.setAttribute('aria-disabled', 'true');
  try {
    if (motionAllowed.matches) {
      await die.animate([
        { transform: 'translateY(0) rotate(-10deg)' },
        { transform: 'translateY(-9px) rotate(190deg)', offset: 0.54 },
        { transform: 'translateY(1px) rotate(352deg)', offset: 0.88 },
        { transform: 'translateY(0) rotate(350deg)' },
      ], { duration: 420, easing: 'cubic-bezier(.2,.7,.3,1)' }).finished;
    }

    const game = pickGame(results, selected?.slug);
    if (game) {
      selected = game;
      pickedTitle.textContent = game.title;
      pickedPlay.href = siteLink(game.slug, 'dice');
      picked.hidden = false;
      announcement.textContent = message('picked', game.title);
    }
  } finally {
    rolling = false;
    roll.setAttribute('aria-disabled', String(results.length === 0));
  }
});

render();
