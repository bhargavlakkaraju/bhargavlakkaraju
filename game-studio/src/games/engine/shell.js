// Minimal vanilla-DOM game shell: game-over panel, continue (rewarded ad), replay
// (with interstitial pacing) and a mute toggle. Used by the dev harness and by the
// standalone portal builds (CrazyGames / Poki / GameDistribution). The website uses
// its own React overlay instead but drives the same controller API.
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
.ra-btn.alt{background:#22c55e;box-shadow:0 5px 0 #15803d}
.ra-mute{position:absolute;top:10px;right:10px;z-index:6;width:40px;height:40px;border-radius:12px;border:0;background:rgba(255,255,255,.12);color:#fff;font-size:18px;cursor:pointer}
`;

function injectCss() {
  if (document.getElementById('ra-shell-css')) return;
  const s = document.createElement('style');
  s.id = 'ra-shell-css';
  s.textContent = CSS;
  document.head.appendChild(s);
}

export async function bootStandalone({ container, createGame, meta, platform, mode = 'classic', target = null, interstitialEvery = 3, onEvent: extraOnEvent = null }) {
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
  const syncMute = () => (mute.textContent = sfx.isMuted() ? '🔇' : '🔊');
  syncMute();
  mute.onclick = () => {
    sfx.toggleMuted();
    syncMute();
  };
  shell.appendChild(mute);

  try {
    await platform.init();
  } catch {
    /* ad SDK unavailable: game still works */
  }

  const events = [];
  let runsSinceAd = 0;
  let overShownAt = 0;

  const controller = mountGame(stage, createGame, meta, {
    mode,
    target,
    platform,
    onEvent(name, data) {
      events.push({ name, data, t: Date.now() });
      if (extraOnEvent) extraOnEvent(name, data);
      if (name === 'gameover') showOver(data);
    },
  });
  platform.loadingDone();

  async function playAgain() {
    hideOver();
    runsSinceAd += 1;
    if (runsSinceAd >= interstitialEvery) {
      runsSinceAd = 0;
      await platform.interstitial('next');
    }
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
      const offer = await platform.prepareRewarded('revive');
      if (offer && over.classList.contains('show')) {
        const cont = document.createElement('button');
        cont.className = 'ra-btn alt';
        cont.textContent = offer.isAd ? '▶ Continue (watch ad)' : '▶ Continue';
        cont.onclick = async () => {
          cont.disabled = true;
          const ok = await offer.show();
          if (ok) {
            hideOver();
            controller.revive();
          } else cont.remove();
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

  window.__ra = { controller, events, meta };
  return controller;
}
