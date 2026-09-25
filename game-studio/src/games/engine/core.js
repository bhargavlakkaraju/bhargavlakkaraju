// Retry Arcade game engine core.
//
// mountGame(container, createGame, meta, options) creates a crisp, DPR-aware canvas
// that letterboxes the game's logical resolution (meta.width x meta.height) into the
// container, runs the loop, normalizes input, and manages the run lifecycle:
//
//   ready  --tap/key-->  playing  --api.gameOver()-->  over  --restart()/revive()--> ready|playing
//
// The host (website React overlay, or engine/shell.js for standalone/portal builds)
// listens to events via options.onEvent(name, data) and drives restart/revive/ads.
import { createFx, ease } from './fx.js';
import { sfx } from './audio.js';
import * as draw from './draw.js';
import { createRng, dailySeed, randomSeed, todayKey } from './rng.js';
import { load, save } from './storage.js';

const START_KEYS = new Set([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D']);
const TAP_KEYS = new Set([' ', 'Enter', 'ArrowUp', 'w', 'W']);
const SCROLL_KEYS = new Set([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * @param {HTMLElement} container element the canvas is placed in (should have a size)
 * @param {(api: object) => object} createGame the game module's default export
 * @param {object} meta the game's meta.js default export
 * @param {object} [options]
 * @param {'classic'|'daily'} [options.mode]
 * @param {number|null} [options.target] challenge score to beat (shown in HUD)
 * @param {(name: string, data: object) => void} [options.onEvent]
 * @param {object} [options.platform] ads/portal adapter (engine/platform.js)
 * @param {boolean} [options.autoFocus]
 */
// Stand-in for sfx while a game plays itself: same methods, no sound.
const SILENT_SFX = new Proxy({}, { get: () => () => undefined });

export function mountGame(container, createGame, meta, options = {}) {
  // demo: the game plays itself (attract mode / recorded preview clips). It starts at once,
  // asks the game's optional demo(dt) autopilot for moves every frame, never saves scores,
  // stays silent and restarts itself after a game over. seed makes runs reproducible.
  const { mode = 'classic', target = null, onEvent = () => {}, platform = null, autoFocus = true, demo = false, seed = null } = options;
  const W = meta.width;
  const H = meta.height;
  const slug = meta.slug;
  const lowerIsBetter = !!meta.lowerIsBetter;
  const tapToStart = meta.startMode !== 'immediate';
  const daily = mode === 'daily';
  const bestKey = daily ? `best:${slug}:daily:${todayKey()}` : `best:${slug}`;

  // ---------- canvas ----------
  const canvas = document.createElement('canvas');
  canvas.className = 'ra-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('aria-label', `${meta.title} game canvas`);
  canvas.style.cssText = 'display:block;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;border-radius:inherit;';
  const cs = container.style;
  if (getComputedStyle(container).position === 'static') cs.position = 'relative';
  cs.display = 'flex';
  cs.alignItems = 'center';
  cs.justifyContent = 'center';
  cs.overflow = 'hidden';
  container.appendChild(canvas);
  const g = canvas.getContext('2d');

  let scale = 1;
  let dpr = 1;
  function resize() {
    const r = container.getBoundingClientRect();
    if (!r.width || !r.height) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scale = Math.min(r.width / W, r.height / H);
    const cssW = Math.max(1, Math.floor(W * scale));
    const cssH = Math.max(1, Math.floor(H * scale));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
  }
  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(container);
  window.addEventListener('resize', resize);
  resize();

  // ---------- state ----------
  const fx = createFx();
  const rng = createRng(seed != null ? seed : daily ? dailySeed(slug) : randomSeed());
  let demoRuns = 0;
  let state = 'ready';
  let score = 0;
  let best = load(bestKey, null);
  let runTime = 0;
  let totalTime = 0;
  let revivedThisRun = false;
  let hostPaused = false;
  let autoPaused = false;
  let overTimer = null;
  let scorePop = 0;
  let destroyed = false;
  let runs = 0;
  const store = {
    get: (k, d = null) => load(`g:${slug}:${k}`, d),
    set: (k, v) => save(`g:${slug}:${k}`, v),
  };

  const api = {
    width: W,
    height: H,
    meta,
    mode,
    daily,
    demo,
    target,
    rng,
    sfx: demo ? SILENT_SFX : sfx,
    fx,
    ease,
    draw,
    font: draw.font,
    store,
    get state() {
      return state;
    },
    get time() {
      return runTime;
    },
    get totalTime() {
      return totalTime;
    },
    get score() {
      return score;
    },
    get best() {
      return best;
    },
    setScore(n) {
      if (n !== score) scorePop = 1;
      score = n;
    },
    addScore(n = 1) {
      api.setScore(score + n);
    },
    /** End the run. result: { win?: boolean, delay?: ms before the host overlay shows, stats?: object } */
    gameOver(result = {}) {
      if (state !== 'playing') return;
      state = 'over';
      if (demo) {
        overTimer = setTimeout(() => {
          overTimer = null;
          if (!destroyed) controller.restart();
        }, (result.delay ?? 750) + 900);
        onEvent('demo-over', { slug, score });
        return;
      }
      const win = result.win ?? null;
      const counts = !(lowerIsBetter && win === false);
      let isNewBest = false;
      if (counts && (best == null || (lowerIsBetter ? score < best : score > best))) {
        // The very first run sets a best silently; beating a previous best is celebrated.
        isNewBest = best != null;
        best = score;
        save(bestKey, best);
      }
      platform?.gameplayStop();
      const payload = {
        slug,
        mode,
        score,
        best,
        isNewBest,
        win,
        duration: Math.round(runTime * 10) / 10,
        stats: result.stats || {},
        canRevive: typeof game.revive === 'function' && meta.revive !== false && !revivedThisRun && win !== true,
      };
      overTimer = setTimeout(() => {
        overTimer = null;
        if (!destroyed) onEvent('gameover', payload);
      }, result.delay ?? 750);
    },
    haptic(ms = 12) {
      if (demo) return;
      try {
        if (navigator.vibrate) navigator.vibrate(ms);
      } catch {
        /* unsupported */
      }
    },
    isTapKey: (key) => TAP_KEYS.has(key),
    /** Custom event to the host (e.g. milestones for analytics). */
    emit: (name, data = {}) => onEvent(name, { slug, ...data }),
    happy: () => platform?.happyTime(),
  };

  const game = createGame(api);
  if (!game || typeof game.render !== 'function') throw new Error(`${slug}: createGame must return an object with render()`);

  function beginRun() {
    if (seed != null) rng.reseed(seed + demoRuns++);
    else if (!daily) rng.reseed(randomSeed());
    else rng.reseed(dailySeed(slug));
    score = 0;
    runTime = 0;
    revivedThisRun = false;
    fx.clear();
    if (game.reset) game.reset();
  }

  function start() {
    if (state === 'playing') return;
    state = 'playing';
    runs += 1;
    platform?.gameplayStart();
    onEvent('start', { slug, mode, run: runs, revived: revivedThisRun });
  }

  beginRun();
  if (!tapToStart || demo) start();

  // ---------- input ----------
  function toLocal(e) {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  }

  function dispatch(ev) {
    if (destroyed || hostPaused) return false;
    if (autoPaused) {
      if (ev.type === 'down' || ev.type === 'keydown') autoPaused = false;
      return true;
    }
    if (state === 'ready') {
      const isStart = ev.type === 'down' || (ev.type === 'keydown' && START_KEYS.has(ev.key));
      if (isStart) {
        start();
        if (game.forwardStartInput && game.input) game.input(ev);
        return true;
      }
      return false;
    }
    if (state === 'playing' && game.input) {
      const r = game.input(ev);
      return r !== false;
    }
    return false;
  }

  const activePointers = new Set();
  const onPointerDown = (e) => {
    e.preventDefault();
    sfx.unlock();
    try {
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    activePointers.add(e.pointerId);
    dispatch({ type: 'down', ...toLocal(e), id: e.pointerId, button: e.button });
  };
  const onPointerMove = (e) => {
    dispatch({ type: 'move', ...toLocal(e), id: e.pointerId, pressed: activePointers.has(e.pointerId) });
  };
  const onPointerUp = (e) => {
    activePointers.delete(e.pointerId);
    dispatch({ type: 'up', ...toLocal(e), id: e.pointerId });
  };
  const onKeyDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (document.activeElement && document.activeElement.isContentEditable)) return;
    if (tag === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
    if (!isVisibleInViewport()) return;
    sfx.unlock();
    const handled = dispatch({ type: 'keydown', key: e.key, code: e.code, repeat: e.repeat });
    if (handled || SCROLL_KEYS.has(e.key)) e.preventDefault();
  };
  const onKeyUp = (e) => {
    dispatch({ type: 'keyup', key: e.key, code: e.code });
  };
  const onContext = (e) => e.preventDefault();
  const onVisibility = () => {
    if (document.hidden && state === 'playing') autoPaused = true;
  };
  function isVisibleInViewport() {
    const r = canvas.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('contextmenu', onContext);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  document.addEventListener('visibilitychange', onVisibility);
  if (autoFocus) setTimeout(() => canvas.focus({ preventScroll: true }), 50);

  // ---------- loop ----------
  let last = performance.now();
  let raf = 0;
  let readyT = 0;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    const paused = hostPaused || autoPaused;
    if (!paused) {
      totalTime += dt;
      if (state === 'playing') {
        runTime += dt;
        if (demo && game.demo) game.demo(dt);
        if (game.update) game.update(dt);
      } else if (game.idle) {
        game.idle(dt);
      }
      fx.update(dt);
      readyT += dt;
      if (scorePop > 0) scorePop = Math.max(0, scorePop - dt * 5);
    }
    render();
  }

  function render() {
    g.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    g.globalAlpha = 1;
    g.fillStyle = meta.bg || '#120b24';
    g.fillRect(0, 0, W, H);
    const o = fx.offset;
    g.save();
    g.translate(o.x, o.y);
    game.render(g, api);
    fx.renderWorld(g);
    g.restore();
    fx.renderScreen(g, W, H);
    if (game.hud !== false && state !== 'ready') drawHud();
    if (state === 'ready' && tapToStart) drawReady();
    if (autoPaused || hostPaused) drawPaused();
  }

  function drawHud() {
    const s = 1 + ease.outQuad(scorePop) * 0.25;
    g.save();
    g.translate(W / 2, 64);
    g.scale(s, s);
    draw.text(g, meta.formatScore ? meta.formatScore(score) : score, 0, 0, { size: 56, weight: 800, color: '#ffffff', shadow: 'rgba(0,0,0,0.35)' });
    g.restore();
    if (target != null && !lowerIsBetter) {
      const beat = score > target;
      draw.text(g, beat ? `🎯 ${target} beaten!` : `🎯 beat ${target}`, W / 2, 106, { size: 18, weight: 700, color: beat ? '#a3e635' : '#ffd23f' });
    }
  }

  function drawReady() {
    const pulse = 0.5 + 0.5 * Math.sin(readyT * 5);
    const cy = H * (meta.readyY ?? 0.3);
    const pw = Math.min(W - 40, 300);
    g.save();
    draw.roundRect(g, W / 2 - pw / 2, cy - 44, pw, 112, 26, 'rgba(8,4,20,0.45)');
    draw.text(g, meta.readyText || 'TAP TO PLAY', W / 2, cy, { size: 32 + pulse * 3, weight: 800, color: '#ffffff' });
    const fmt = (v) => (meta.formatScore ? meta.formatScore(v) : v);
    const sub = target != null ? `🎯 Beat ${fmt(target)}!` : best != null ? `BEST ${fmt(best)}` : daily ? 'DAILY CHALLENGE' : meta.hint || meta.tagline || '';
    if (sub) draw.text(g, sub, W / 2, cy + 42, { size: 18, weight: 700, color: target != null ? '#ffd23f' : 'rgba(255,255,255,0.85)', maxWidth: pw - 24 });
    g.restore();
  }

  function drawPaused() {
    g.fillStyle = 'rgba(8,4,20,0.55)';
    g.fillRect(0, 0, W, H);
    if (autoPaused && !hostPaused) {
      draw.text(g, 'PAUSED', W / 2, H / 2 - 20, { size: 44 });
      draw.text(g, 'tap to resume', W / 2, H / 2 + 26, { size: 20, weight: 600, color: 'rgba(255,255,255,0.8)' });
    }
  }

  raf = requestAnimationFrame(frame);
  platform?.setHooks({
    pause: () => controller.pause(),
    resume: () => controller.resume(),
  });

  // ---------- controller ----------
  const controller = {
    canvas,
    api,
    get state() {
      return state;
    },
    get score() {
      return score;
    },
    get best() {
      return best;
    },
    get canRevive() {
      return typeof game.revive === 'function' && meta.revive !== false && !revivedThisRun;
    },
    /** Start a brand-new run. */
    restart() {
      if (overTimer) clearTimeout(overTimer);
      overTimer = null;
      beginRun();
      state = 'ready';
      readyT = 0;
      if (!tapToStart || demo) start();
      onEvent('restart', { slug, mode });
      canvas.focus({ preventScroll: true });
    },
    /** Continue the current run (after a rewarded ad). */
    revive() {
      if (!controller.canRevive || state !== 'over') return false;
      revivedThisRun = true;
      game.revive();
      state = 'ready';
      readyT = 0;
      if (!tapToStart) start();
      onEvent('revive', { slug, mode, score });
      canvas.focus({ preventScroll: true });
      return true;
    },
    pause() {
      hostPaused = true;
      sfx.setSuspended(true);
    },
    resume() {
      hostPaused = false;
      sfx.setSuspended(false);
      last = performance.now();
    },
    focus() {
      canvas.focus({ preventScroll: true });
    },
    setMuted: (m) => sfx.setMuted(m),
    isMuted: () => sfx.isMuted(),
    toggleMuted: () => sfx.toggleMuted(),
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      if (overTimer) clearTimeout(overTimer);
      if (ro) ro.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
      if (game.destroy) game.destroy();
      canvas.remove();
    },
  };

  onEvent('ready', { slug, mode, best });
  return controller;
}

/**
 * Render a game's cover art (exported `cover(g, w, h)` function) into a canvas.
 * Used by scripts/thumbnails.mjs to produce thumbnails and social images.
 */
export function renderCover(canvas, coverFn, meta, w, h) {
  const g = canvas.getContext('2d');
  canvas.width = w;
  canvas.height = h;
  g.fillStyle = meta.bg || '#120b24';
  g.fillRect(0, 0, w, h);
  coverFn(g, w, h, { draw, meta });
}
