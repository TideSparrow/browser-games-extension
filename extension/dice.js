import { pickGame, siteLink } from './games.js';

const restingAngles = [[0, 0], [0, -90], [0, -180], [0, 90], [-90, 0], [90, 0]];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const soundKey = 'bgh-dice-sound';
const rollDuration = 1360;
const autoOpenDelay = 3000;

function rotation(x, y, lift = 0) {
  return `translateY(${lift}px) rotateX(${x}deg) rotateY(${y}deg)`;
}

export function initDiceDraw(trigger, getResults, message) {
  const dialog = document.querySelector('#dice-draw');
  const orbit = dialog.querySelector('#dice-orbit');
  const cube = dialog.querySelector('#dice-cube');
  const faces = [...cube.children];
  const result = dialog.querySelector('#dice-result');
  const play = dialog.querySelector('#dice-play');
  const reroll = dialog.querySelector('#dice-reroll');
  const countdown = dialog.querySelector('#dice-countdown');
  const sound = dialog.querySelector('#dice-sound');

  let previous;
  let angle = restingAngles[0];
  let animation;
  let drag;
  let timer;
  let paused = false;
  let audio;
  let volume;
  let soundOn = localStorage.getItem(soundKey) !== 'off';
  sound.setAttribute('aria-pressed', String(soundOn));

  function playNotes(notes) {
    if (!soundOn) return;
    audio ??= new AudioContext();
    if (!volume) {
      volume = audio.createGain();
      volume.gain.value = .34;
      volume.connect(audio.destination);
    }
    if (audio.state !== 'running') audio.resume().catch(() => {});

    for (const [offset, start, end, length, level, type = 'triangle'] of notes) {
      const time = audio.currentTime + offset;
      const oscillator = audio.createOscillator();
      const envelope = audio.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(start, time);
      oscillator.frequency.exponentialRampToValueAtTime(end, time + length);
      envelope.gain.setValueAtTime(.001, time);
      envelope.gain.exponentialRampToValueAtTime(level, time + .008);
      envelope.gain.exponentialRampToValueAtTime(.001, time + length);
      oscillator.connect(envelope).connect(volume);
      oscillator.start(time);
      oscillator.stop(time + length);
    }
  }

  function silence() {
    volume?.disconnect();
    volume = null;
  }

  function startCountdown() {
    clearTimeout(timer);
    if (!dialog.open || !play.hasAttribute('href')) return;
    if (paused) {
      countdown.textContent = message('diceResume');
      return;
    }
    const deadline = performance.now() + autoOpenDelay;

    function tick() {
      if (!dialog.open) return;
      const remaining = deadline - performance.now();
      if (remaining <= 0) {
        chrome.tabs.create({ url: play.href }).catch(() => {
          paused = true;
          startCountdown();
        });
        return;
      }
      const seconds = Math.ceil(remaining / 1000);
      countdown.textContent = message('diceCountdown', String(seconds));
      timer = setTimeout(tick, remaining - (seconds - 1) * 1000);
    }

    tick();
  }

  function resetOrbit() {
    const pointer = drag?.pointer;
    drag = null;
    if (pointer !== undefined && orbit.hasPointerCapture(pointer)) orbit.releasePointerCapture(pointer);
    orbit.getAnimations().forEach(turn => turn.cancel());
    orbit.style.removeProperty('transform');
    dialog.removeAttribute('data-dragging');
  }

  function rollDice() {
    if (animation) return;
    const results = getResults();
    const winner = pickGame(results, previous);
    if (!winner) return;

    clearTimeout(timer);
    resetOrbit();
    dialog.setAttribute('data-rolling', '');
    reroll.setAttribute('aria-disabled', 'true');
    play.removeAttribute('href');
    result.textContent = message('diceRolling');

    const pool = results.filter(game => game !== winner);
    const candidates = [winner];
    while (candidates.length < faces.length && pool.length) {
      candidates.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
    }
    const winnerIndex = Math.floor(Math.random() * candidates.length);
    [candidates[0], candidates[winnerIndex]] = [candidates[winnerIndex], candidates[0]];

    for (const [index, face] of faces.entries()) {
      const game = candidates[index];
      face.removeAttribute('data-winner');
      face.replaceChildren();
      if (!game) continue;
      const image = new Image();
      image.alt = '';
      image.draggable = false;
      image.src = `covers/${game.slug}.webp`;
      const name = document.createElement('span');
      name.textContent = game.title;
      face.append(image, name);
    }

    const from = rotation(...angle);
    angle = restingAngles[winnerIndex];
    const [x, y] = angle;
    cube.style.transform = rotation(x, y);

    function reveal() {
      if (!dialog.open) return;
      previous = winner.slug;
      faces[winnerIndex].setAttribute('data-winner', '');
      result.textContent = winner.title;
      play.href = siteLink(winner.slug, 'dice');
      dialog.removeAttribute('data-rolling');
      reroll.removeAttribute('aria-disabled');
      playNotes([[0, 180, 58, .13, .26], [.035, 523, 515, .135, .15, 'sine'], [.11, 784, 770, .18, .12, 'sine']]);
      startCountdown();
    }

    if (reduceMotion.matches) {
      reveal();
      return;
    }
    const endX = 720 + x;
    const endY = 720 + y;
    animation = cube.animate([
      { transform: from, easing: 'cubic-bezier(.14,.52,.44,.9)' },
      { transform: rotation(endX - 58, endY - 91, -24), offset: .72, easing: 'ease-out' },
      { transform: rotation(endX + 6, endY - 8, 4), offset: .93, easing: 'ease-out' },
      { transform: rotation(endX, endY) },
    ], { duration: rollDuration });
    animation.onfinish = () => {
      animation = null;
      reveal();
    };
    playNotes([[.02, 270], [.16, 225], [.32, 248], [.53, 186], [.77, 159]].map(([at, pitch]) =>
      [at * rollDuration / 1000, pitch, pitch * .46, .082, .14]
    ));
  }

  trigger.addEventListener('click', () => {
    if (dialog.open || !getResults().length) return;
    paused = false;
    dialog.showModal();
    rollDice();
  });
  reroll.addEventListener('click', rollDice);
  countdown.addEventListener('click', () => {
    paused = !paused;
    if (!drag) startCountdown();
  });
  play.addEventListener('click', () => clearTimeout(timer));
  dialog.addEventListener('close', () => {
    clearTimeout(timer);
    animation?.cancel();
    animation = null;
    resetOrbit();
    silence();
  });
  sound.addEventListener('click', () => {
    soundOn = !soundOn;
    sound.setAttribute('aria-pressed', String(soundOn));
    localStorage.setItem(soundKey, soundOn ? 'on' : 'off');
    if (!soundOn) silence();
  });

  orbit.addEventListener('pointerdown', event => {
    if (animation || drag || !event.isPrimary || event.button !== 0) return;
    orbit.getAnimations().forEach(turn => turn.cancel());
    orbit.setPointerCapture(event.pointerId);
    drag = { pointer: event.pointerId, x: event.clientX, y: event.clientY };
    dialog.setAttribute('data-dragging', '');
    clearTimeout(timer);
  });
  orbit.addEventListener('pointermove', event => {
    if (event.pointerId !== drag?.pointer) return;
    orbit.style.transform = rotation((drag.y - event.clientY) * .85, (event.clientX - drag.x) * .85);
  });
  orbit.addEventListener('lostpointercapture', event => {
    if (event.pointerId !== drag?.pointer) return;
    const from = orbit.style.transform;
    resetOrbit();
    if (from && !reduceMotion.matches) {
      const spin = orbit.animate([{ transform: from }, { transform: rotation(0, 0) }], {
        duration: 260,
        easing: 'ease-out',
      });
      spin.onfinish = startCountdown;
    } else {
      startCountdown();
    }
  });
}
