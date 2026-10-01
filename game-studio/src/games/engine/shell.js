// Minimal vanilla-DOM game shell: game-over panel, continue (rewarded ad), replay
// (with interstitial pacing) and a mute toggle. Used by the dev harness and by the
// standalone portal builds (CrazyGames / Poki / GameDistribution). The website uses
// its own React overlay instead but drives the same controller API.
//
// Portal options (all off by default, so the harness and other builds are unchanged):
//   splash: { image }   start screen with title, how to play and a Play button. The Play tap
//                       asks the platform for the preroll ad and the game mounts once it is
//                       over (GameDistribution: preroll on the Play button of the start screen).
//   rotateHint: true    on phones held sideways, a portrait game asks to be turned upright
//                       and stays paused until it is.
//   interstitialEvery   play-again taps between interstitial requests (1 = every time, for
//                       SDKs that enforce their own minimum gap between ads).
import { mountGame } from './core.js';
import { sfx } from './audio.js';

const CSS = `
.ra-shell{background:#0b0618;font-family:"Fredoka","Segoe UI",system-ui,sans-serif}
.ra-stage{position:absolute;inset:0}
.ra-over{position:absolute;inset:0;display:none;align-items:center;justify-content:center;background:rgba(8,4,20,.62);backdrop-filter:blur(3px);z-index:5}
.ra-over.show{display:flex;animation:raIn .25s ease-out}
@keyframes raIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:none}}
.ra-card{background:linear-gradient(180deg,#261a4a,#1a1033);border:2px solid rgba(255,255,255,.12);border-radius:22px;padding:22px 26px;min-width:240px;max-width:86%;text-align:center;color:#fff;box-shadow:0 20px 60px rgba(0,0,0,.5)}
.ra-title{font-size:14px;letter-spacing:.18em;opacity:.7;font-weight:700}
.ra-score{font-size:64px;font-weight:800;line-height:1.05;margin:6px 0}
.ra-best{font-size:15px;opacity:.8;font-weight:600}
.ra-new{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;background:#ffd23f;color:#2a1600;font-weight:800;font-size:13px;animation:raPulse 1s infinite}
@keyframes raPulse{50%{transform:scale(1.08)}}
.ra-btns{display:flex;flex-direction:column;gap:10px;margin-top:18px}
.ra-btn{appearance:none;border:0;border-radius:14px;padding:13px 18px;font:800 18px inherit;font-family:inherit;cursor:pointer;color:#fff;background:#ff3d7f;box-shadow:0 5px 0 #b3134d;transition:transform .08s}
.ra-btn:active{transform:translateY(3px);box-shadow:0 2px 0 #b3134d}
.ra-btn:disabled{opacity:.75;cursor:default}
.ra-btn.alt{background:#22c55e;box-shadow:0 5px 0 #15803d}
.ra-mute{position:absolute;top:10px;right:10px;z-index:8;width:40px;height:40px;border-radius:12px;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer}
.ra-splash{position:absolute;inset:0;z-index:7;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box;background-color:#0b0618;background-position:center;background-size:cover;background-repeat:no-repeat}
.ra-splash::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,6,24,.25),rgba(11,6,24,.82) 55%)}
.ra-splash .ra-card{position:relative;display:flex;flex-direction:column;box-sizing:border-box;width:360px;min-width:0;max-width:100%;max-height:100%;padding:20px 20px 16px}
.ra-splash h1{margin:0;font-size:34px;line-height:1.05;font-weight:800}
.ra-tag{margin:6px 0 0;font-size:15px;line-height:1.3;opacity:.85;font-weight:600}
.ra-how{margin:14px 0 0;padding:0 2px 0 0;list-style:none;text-align:left;overflow:auto;min-height:48px;font-size:14px;line-height:1.38;font-weight:500}
.ra-how li{margin:0 0 7px;padding-left:18px;position:relative}
.ra-how li::before{content:"";position:absolute;left:4px;top:.55em;width:7px;height:7px;border-radius:50%;background:#ffd23f}
.ra-how li.ctl{color:#bfe9ff}
.ra-how li.ctl::before{background:#2fd9ff}
.ra-play{font-size:22px;padding:15px 18px;margin-top:12px;flex:none}
.ra-brand{margin-top:10px;font-size:11px;letter-spacing:.22em;opacity:.45;font-weight:700;flex:none}
.ra-rotate{position:absolute;inset:0;z-index:10;display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#0b0618;color:#fff;text-align:center;padding:16px;font-size:20px;font-weight:700}
.ra-rotate.show{display:flex}
.ra-rotate .ph{width:44px;height:74px;border:4px solid #fff;border-radius:10px;animation:raTurn 1.6s ease-in-out infinite}
@keyframes raTurn{0%,20%{transform:rotate(-90deg)}60%,100%{transform:rotate(0)}}
`;

function injectCss() {
  if (document.getElementById('ra-shell-css')) return;
  const s = document.createElement('style');
  s.id = 'ra-shell-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const isTouchDevice = () => {
  try {
    return window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

// Start screen: title, how to play (with the controls for this device) and a Play button.
// Resolves once the player pressed Play and the preroll (if any) is over.
function runSplash({ shell, meta, platform, ready, image }) {
  return new Promise((resolve) => {
    const root = el('div', 'ra-splash');
    if (image) root.style.backgroundImage = `url("${String(image).replace(/["\\]/g, '')}")`;
    // Party games keep the sound button at the bottom center: leave room for it.
    if (meta.party) root.style.paddingBottom = '60px';
    const card = el('div', 'ra-card');
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', meta.title);
    card.appendChild(el('h1', '', meta.title));
    if (meta.tagline) card.appendChild(el('p', 'ra-tag', meta.tagline));
    const how = el('ul', 'ra-how');
    for (const line of (meta.howTo || []).slice(0, 3)) how.appendChild(el('li', '', line));
    const c = meta.controls || {};
    const ctl = isTouchDevice() ? [c.touch] : [c.keyboard && `Keyboard: ${c.keyboard}`, c.mouse && `Mouse: ${c.mouse}`];
    for (const line of ctl) if (line) how.appendChild(el('li', 'ctl', line));
    if (how.children.length) card.appendChild(how);
    const play = el('button', 'ra-btn ra-play', '▶ PLAY');
    play.setAttribute('aria-label', `Play ${meta.title}`);
    card.appendChild(play);
    card.appendChild(el('div', 'ra-brand', 'RETRY ARCADE'));
    root.appendChild(card);
    shell.appendChild(root);

    let started = false;
    const onKey = (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        go();
      }
    };
    async function go() {
      if (started) return;
      started = true;
      window.removeEventListener('keydown', onKey);
      sfx.unlock();
      sfx.play('click');
      play.disabled = true;
      play.textContent = 'Loading...';
      await ready;
      try {
        await platform.interstitial('preroll');
      } catch {
        /* no ad: just play */
      }
      root.remove();
      resolve();
    }
    play.onclick = go;
    window.addEventListener('keydown', onKey);
    setTimeout(() => play.focus({ preventScroll: true }), 50);
  });
}

// Phones held sideways: a portrait game is tiny, so ask the player to turn the device.
// Uses the device orientation (not the iframe's shape, which publishers choose).
function watchOrientation(shell, onChange) {
  const box = el('div', 'ra-rotate');
  box.appendChild(el('div', 'ph'));
  box.appendChild(el('div', '', 'Turn your device upright to play'));
  shell.appendChild(box);
  let shown = false;
  const check = () => {
    let landscape = false;
    try {
      const t = window.screen.orientation && window.screen.orientation.type;
      landscape = t ? t.startsWith('landscape') : Math.abs(window.orientation || 0) === 90;
    } catch {
      landscape = false;
    }
    const phone = Math.min(window.screen.width || 0, window.screen.height || 0) < 520;
    const show = isTouchDevice() && phone && landscape;
    if (show === shown) return;
    shown = show;
    box.classList.toggle('show', show);
    onChange(show);
  };
  window.addEventListener('resize', check);
  window.addEventListener('orientationchange', check);
  try {
    window.screen.orientation.addEventListener('change', check);
  } catch {
    /* older browsers: resize covers it */
  }
  check();
}

export async function bootStandalone({
  container,
  createGame,
  meta,
  platform,
  mode = 'classic',
  target = null,
  interstitialEvery = 3,
  onEvent: extraOnEvent = null,
  splash = null,
  rotateHint = false,
}) {
  injectCss();
  if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
  const shell = document.createElement('div');
  shell.className = 'ra-shell';
  shell.style.cssText = 'position:absolute;inset:0;';
  container.appendChild(shell);
  const stage = document.createElement('div');
  stage.className = 'ra-stage';
  shell.appendChild(stage);

  const over = document.createElement('div');
  over.className = 'ra-over';
  shell.appendChild(over);

  const mute = document.createElement('button');
  mute.className = 'ra-mute';
  mute.setAttribute('aria-label', 'Toggle sound');
  // Party games use all four corners for player buttons: keep the mute out of P3's corner.
  if (meta.party) mute.style.cssText = 'top:auto;right:auto;bottom:8px;left:50%;transform:translateX(-50%);opacity:.8';
  const syncMute = () => (mute.textContent = sfx.isMuted() ? '🔇' : '🔊');
  syncMute();
  mute.onclick = () => {
    sfx.toggleMuted();
    syncMute();
  };
  shell.appendChild(mute);

  const events = [];
  const ra = { controller: null, events, meta, platform, sfx };
  window.__ra = ra;

  // Ads and the rotate hint can both hold the game; it only runs again when neither does.
  // Before the game is mounted there is only audio to silence.
  let controller = null;
  const holds = new Set();
  function hold(reason, on, opts) {
    const before = holds.size > 0;
    if (on) holds.add(reason);
    else holds.delete(reason);
    const after = holds.size > 0;
    if (before === after) return;
    if (controller) {
      if (after) controller.pause();
      else controller.resume(opts);
    } else sfx.setSuspended(after);
  }
  const adHooks = { pause: () => hold('ad', true), resume: (opts) => hold('ad', false, opts) };
  platform.setHooks(adHooks);
  if (rotateHint && meta.height > meta.width) watchOrientation(shell, (on) => hold('rotate', on, { tapToResume: true }));

  // The SDK starts loading right away; a failure or a blocked script never stops the game.
  const ready = Promise.resolve()
    .then(() => platform.init())
    .catch(() => {
      /* ad SDK unavailable: game still works */
    });
  if (splash) await runSplash({ shell, meta, platform, ready, image: splash.image });
  else await ready;

  let runsSinceAd = 0;
  let overShownAt = 0;

  controller = mountGame(stage, createGame, meta, {
    mode,
    target,
    platform,
    onEvent(name, data) {
      events.push({ name, data, t: Date.now() });
      if (extraOnEvent) extraOnEvent(name, data);
      if (name === 'gameover') showOver(data);
    },
  });
  ra.controller = controller;
  // mountGame registers plain pause/resume hooks; ours also respect the rotate hint.
  platform.setHooks(adHooks);
  if (holds.size) controller.pause();
  platform.loadingDone();

  let busy = false; // an ad requested from the game-over panel is in progress
  async function playAgain() {
    if (busy) return;
    busy = true;
    sfx.play('click');
    // The panel stays up (button disabled) until any ad is over, so a slow ad request never
    // leaves the player looking at a frozen board.
    over.querySelectorAll('.ra-btn').forEach((b) => (b.disabled = true));
    runsSinceAd += 1;
    if (runsSinceAd >= interstitialEvery) {
      runsSinceAd = 0;
      try {
        await platform.interstitial('next');
      } catch {
        /* no ad */
      }
    }
    hideOver();
    busy = false;
    controller.restart();
  }

  async function showOver(d) {
    overShownAt = performance.now();
    const fmt = (v) => (meta.formatScore ? meta.formatScore(v) : v);
    const headline = d.win === true ? 'YOU WIN!' : d.win === false ? 'SO CLOSE!' : 'GAME OVER';
    over.innerHTML = `<div class="ra-card" role="dialog" aria-label="Game over">
      <div class="ra-title">${headline}</div>
      <div class="ra-score">${fmt(d.score)}</div>
      <div class="ra-best">BEST ${d.best != null ? fmt(d.best) : '-'}</div>
      ${d.isNewBest ? '<div class="ra-new">NEW BEST!</div>' : ''}
      <div class="ra-btns"></div></div>`;
    const btns = over.querySelector('.ra-btns');
    const again = document.createElement('button');
    again.className = 'ra-btn';
    again.textContent = '↻ Play again';
    again.onclick = playAgain;
    btns.appendChild(again);
    over.classList.add('show');
    if (d.isNewBest) platform.happyTime();
    if (d.canRevive) {
      let offer = null;
      try {
        offer = await platform.prepareRewarded('revive');
      } catch {
        offer = null;
      }
      if (offer && over.classList.contains('show')) {
        const cont = document.createElement('button');
        cont.className = 'ra-btn alt';
        cont.textContent = offer.isAd ? '▶ Continue (watch ad)' : '▶ Continue';
        cont.onclick = async () => {
          if (busy) return;
          busy = true;
          over.querySelectorAll('.ra-btn').forEach((b) => (b.disabled = true));
          sfx.play('click');
          let ok = false;
          try {
            ok = await offer.show();
          } catch {
            ok = false;
          }
          busy = false;
          if (ok) {
            hideOver();
            controller.revive();
          } else {
            cont.remove();
            again.disabled = false;
          }
        };
        btns.insertBefore(cont, again);
      }
    }
  }

  function hideOver() {
    over.classList.remove('show');
  }

  window.addEventListener('keydown', (e) => {
    if (!over.classList.contains('show')) return;
    if ((e.key === ' ' || e.key === 'Enter') && performance.now() - overShownAt > 450) {
      e.preventDefault();
      playAgain();
    }
  });

  return controller;
}
