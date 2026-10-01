// Monetization/portal adapter. One interface, many backends:
//   none        - no ads (free "continue" instead of rewarded ads)
//   dev         - simulated ads with a countdown overlay, for testing flows
//   adsense     - Google AdSense H5 Games Ads (Ad Placement API: adBreak/adConfig) on our own site
//   crazygames  - CrazyGames SDK v3
//   poki        - Poki SDK v2
//   gamedistribution - GameDistribution HTML5 SDK
//
// Interface:
//   init(): Promise            load SDK (safe to call once)
//   loadingDone()              tell the portal the game finished loading
//   gameplayStart()/gameplayStop()
//   interstitial(placement): Promise<boolean>   true if an ad was shown
//   prepareRewarded(placement): Promise<null | { isAd: boolean, show(): Promise<boolean> }>
//   happyTime()                celebrate moment (CrazyGames)
//   setHooks({ pause, resume }) called around ads to pause game + audio. resume may get
//                              { tapToResume: true }: a run the ad interrupted then waits for a tap

function loadScript(src, attrs = {}) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    for (const k in attrs) s.setAttribute(k, attrs[k]);
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

function base(name) {
  const hooks = { pause: () => {}, resume: () => {} };
  return {
    name,
    hooks,
    setHooks(h) {
      Object.assign(hooks, h);
    },
    async init() {},
    loadingDone() {},
    gameplayStart() {},
    gameplayStop() {},
    async interstitial() {
      return false;
    },
    async prepareRewarded() {
      return null;
    },
    happyTime() {},
  };
}

export function noneAdapter() {
  const p = base('none');
  // Without an ad network we still offer one free continue per run: it keeps the
  // "second chance" loop that drives retention.
  p.prepareRewarded = async () => ({ isAd: false, show: async () => true });
  return p;
}

export function devAdapter() {
  const p = base('dev');
  const fake = (label, ms) =>
    new Promise((resolve) => {
      p.hooks.pause();
      const el = document.createElement('div');
      el.style.cssText =
        'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;flex-direction:column;background:rgba(10,6,24,.94);color:#fff;font:700 20px system-ui;gap:12px';
      el.innerHTML = `<div style="opacity:.6;font-size:13px;letter-spacing:.2em">TEST AD</div><div>${label}</div><div class="c" style="font-size:40px"></div>`;
      document.body.appendChild(el);
      let left = Math.ceil(ms / 1000);
      const c = el.querySelector('.c');
      c.textContent = left;
      const iv = setInterval(() => {
        left -= 1;
        c.textContent = left;
        if (left <= 0) {
          clearInterval(iv);
          el.remove();
          p.hooks.resume();
          resolve(true);
        }
      }, 1000);
    });
  p.interstitial = () => fake('Interstitial', 2000);
  p.prepareRewarded = async () => ({ isAd: true, show: () => fake('Rewarded video', 3000) });
  return p;
}

// Google AdSense H5 Games Ads. The host page must include:
// <script async data-ad-client="ca-pub-XXX" data-ad-frequency-hint="45s"
//   src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>
export function adsenseAdapter({ client, test = false, frequencyHint = '45s' } = {}) {
  const p = base('adsense');
  const push = (o) => {
    window.adsbygoogle = window.adsbygoogle || [];
    window.adsbygoogle.push(o);
  };
  let configured = false;
  p.init = async () => {
    if (configured || typeof window === 'undefined') return;
    configured = true;
    const src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    const attrs = { 'data-ad-client': client, 'data-ad-frequency-hint': frequencyHint, crossorigin: 'anonymous' };
    if (test) attrs['data-adbreak-test'] = 'on';
    // The website layout may already include the AdSense tag (it also serves display ads).
    if (!document.querySelector('script[src*="adsbygoogle.js"]')) await loadScript(src, attrs).catch(() => {});
    push({ preloadAdBreaks: 'on', sound: 'on' });
  };
  p.interstitial = (placement = 'next') =>
    new Promise((resolve) => {
      let shown = false;
      let settled = false;
      const done = () => {
        if (!settled) {
          settled = true;
          resolve(shown);
        }
      };
      push({
        type: 'next',
        name: placement,
        beforeAd() {
          shown = true;
          p.hooks.pause();
        },
        afterAd() {
          p.hooks.resume();
        },
        adBreakDone: done,
      });
      setTimeout(() => {
        if (!shown) done();
      }, 2500);
    });
  // The Ad Placement API tells us via beforeReward whether a rewarded ad is available;
  // we only surface the "watch ad" button when it is.
  p.prepareRewarded = (placement = 'revive') =>
    new Promise((resolve) => {
      let viewed = false;
      let offered = false;
      let finish = null;
      push({
        type: 'reward',
        name: placement,
        beforeAd() {
          p.hooks.pause();
        },
        afterAd() {
          p.hooks.resume();
        },
        beforeReward(showAdFn) {
          offered = true;
          resolve({
            isAd: true,
            show: () =>
              new Promise((res) => {
                finish = res;
                showAdFn();
              }),
          });
        },
        adDismissed() {
          viewed = false;
        },
        adViewed() {
          viewed = true;
        },
        adBreakDone() {
          if (!offered) resolve(null);
          if (finish) finish(viewed);
        },
      });
      setTimeout(() => {
        if (!offered) resolve(null);
      }, 1500);
    });
  return p;
}

export function crazyGamesAdapter() {
  const p = base('crazygames');
  let sdk = null;
  p.init = async () => {
    await loadScript('https://sdk.crazygames.com/crazygames-sdk-v3.js');
    sdk = window.CrazyGames && window.CrazyGames.SDK;
    if (sdk) await sdk.init();
  };
  p.loadingDone = () => sdk?.game?.loadingStop?.();
  p.gameplayStart = () => sdk?.game?.gameplayStart?.();
  p.gameplayStop = () => sdk?.game?.gameplayStop?.();
  p.happyTime = () => sdk?.game?.happytime?.();
  const request = (type) =>
    new Promise((resolve) => {
      if (!sdk) return resolve(false);
      sdk.ad.requestAd(type, {
        adStarted: () => p.hooks.pause(),
        adFinished: () => {
          p.hooks.resume();
          resolve(true);
        },
        adError: () => {
          p.hooks.resume();
          resolve(false);
        },
      });
    });
  p.interstitial = () => request('midgame');
  p.prepareRewarded = async () => (sdk ? { isAd: true, show: () => request('rewarded') } : null);
  return p;
}

export function pokiAdapter() {
  const p = base('poki');
  let sdk = null;
  p.init = async () => {
    await loadScript('https://game-cdn.poki.com/scripts/v2/poki-sdk.js');
    sdk = window.PokiSDK;
    if (sdk) await sdk.init().catch(() => {});
  };
  p.loadingDone = () => sdk?.gameLoadingFinished?.();
  p.gameplayStart = () => sdk?.gameplayStart?.();
  p.gameplayStop = () => sdk?.gameplayStop?.();
  p.interstitial = async () => {
    if (!sdk) return false;
    await sdk.commercialBreak(() => p.hooks.pause());
    p.hooks.resume();
    return true;
  };
  p.prepareRewarded = async () =>
    sdk
      ? {
          isAd: true,
          show: async () => {
            const ok = await sdk.rewardedBreak(() => p.hooks.pause());
            p.hooks.resume();
            return !!ok;
          },
        }
      : null;
  return p;
}

// ---------- GameDistribution ----------
// HTML5 SDK: https://github.com/GameDistribution/GD-HTML5/wiki/SDK-Implementation
// Rules from the SDK wiki and the GD developer guidelines that this adapter follows:
//   - load the SDK once, at boot, so it is ready before the first ad call
//   - SDK_GAME_PAUSE: pause the game AND mute it; SDK_GAME_START: resume
//   - ads only after a player's tap: the preroll sits on the start screen's Play button and
//     a midroll on Play again (the host decides when; the SDK enforces its own minimum gap
//     and rejects calls that come too soon, which we treat as "no ad")
//   - rewarded ads only when gdsdk.preloadAd('rewarded') says one is available, only on an
//     explicit tap, and the reward only after SDK_REWARDED_WATCH_COMPLETE
//   - after an ad that interrupted a run, the game waits for a tap before it moves again
//   - every SDK call is guarded and time-limited: a blocked or missing SDK never stops the game
// gdsdk.showAd() returns a promise, but it can settle before the ad is over (or, in rare SDK
// states, never), so the SDK_GAME_PAUSE / SDK_GAME_START events decide when an ad is running.
export const GD_SDK_URL = 'https://html5.api.gamedistribution.com/main.min.js';
const GD_ID = /^[0-9a-f]{32}$/i;

/** GD hosts every game at a URL that contains its 32-character hex game id, e.g.
 *  https://html5.gamedistribution.com/<gameId>/ (or /<token>/<gameId>/). Returns '' when absent. */
export function gdGameIdFromLocation(loc = typeof window !== 'undefined' ? window.location : null) {
  try {
    return (loc?.pathname || '').split('/').find((s) => GD_ID.test(s)) || '';
  } catch {
    return '';
  }
}

export function gameDistributionAdapter({ gameId = '', sdkUrl = GD_SDK_URL, readyTimeout = 5000, adStartTimeout = 6000, maxAdMs = 90000 } = {}) {
  const p = base('gamedistribution');
  // Build-time id (scripts/portals/gamedistribution-ids.json or GD_GAME_IDS) wins; otherwise
  // read it from the URL GD serves the game from. Only a 32-char hex string is accepted.
  const id = GD_ID.test(String(gameId)) ? String(gameId).toLowerCase() : gdGameIdFromLocation();
  p.gameId = id;
  let adActive = false; // between SDK_GAME_PAUSE and SDK_GAME_START
  let rewardedDone = false;
  let initPromise = null;
  const watchers = new Set();
  const sdk = () => (typeof window !== 'undefined' && window.gdsdk && typeof window.gdsdk.showAd === 'function' ? window.gdsdk : null);

  // A host that registers its hooks while an ad is already running (the GD loader can show
  // one at startup) still gets paused.
  const setHooks = p.setHooks;
  p.setHooks = (h) => {
    setHooks(h);
    if (adActive) p.hooks.pause();
  };

  function onSdkEvent(event) {
    const name = event && event.name;
    if (name === 'SDK_GAME_PAUSE' && !adActive) {
      adActive = true;
      p.hooks.pause();
    } else if (name === 'SDK_GAME_START' && adActive) {
      adActive = false;
      p.hooks.resume({ tapToResume: true });
    } else if (name === 'SDK_REWARDED_WATCH_COMPLETE') {
      rewardedDone = true;
    }
    for (const fn of watchers) fn(name);
  }

  p.init = () => {
    if (initPromise) return initPromise;
    initPromise = new Promise((resolve) => {
      if (typeof window === 'undefined') return resolve();
      let done = false;
      const finish = () => {
        if (!done) {
          done = true;
          resolve();
        }
      };
      const opts = {
        onEvent(event) {
          try {
            onSdkEvent(event);
          } finally {
            if (event && (event.name === 'SDK_READY' || event.name === 'SDK_ERROR')) finish();
          }
        },
      };
      // Without an id the SDK falls back to its own demo id (fine for local testing).
      if (id) opts.gameId = id;
      window.GD_OPTIONS = opts;
      loadScript(sdkUrl, { id: 'gamedistribution-jssdk' }).catch(finish);
      setTimeout(finish, readyTimeout);
    });
    return initPromise;
  };

  // Runs one ad and resolves true once it has played, false if none played.
  function runAd(type) {
    return new Promise((resolve) => {
      const s = sdk();
      if (!s) return resolve(false);
      let started = adActive;
      let settled = false;
      let timer = 0;
      const finish = (shown) => {
        if (settled) return;
        settled = true;
        watchers.delete(watch);
        clearTimeout(timer);
        // Never leave the game frozen if the SDK paused it and then went quiet.
        if (adActive) {
          adActive = false;
          p.hooks.resume({ tapToResume: true });
        }
        resolve(shown);
      };
      const watch = (name) => {
        if (name === 'SDK_GAME_PAUSE') {
          started = true;
          clearTimeout(timer);
          timer = setTimeout(() => finish(true), maxAdMs);
        } else if (name === 'SDK_GAME_START' && started) {
          finish(true);
        }
      };
      watchers.add(watch);
      timer = setTimeout(() => {
        if (!started) finish(false);
      }, adStartTimeout);
      // The promise can settle while the ad is still on screen: then SDK_GAME_START ends it.
      const settle = () => {
        if (!adActive) finish(started);
      };
      try {
        Promise.resolve(type ? s.showAd(type) : s.showAd()).then(settle, settle);
      } catch {
        finish(false);
      }
    });
  }

  p.interstitial = async () => {
    await p.init();
    return runAd();
  };

  p.prepareRewarded = async () => {
    await p.init();
    const s = sdk();
    if (!s) return null;
    if (typeof s.preloadAd === 'function') {
      const available = await Promise.race([
        Promise.resolve()
          .then(() => s.preloadAd('rewarded'))
          .then(
            () => true,
            () => false,
          ),
        new Promise((r) => setTimeout(() => r(false), 3000)),
      ]);
      if (!available) return null;
    }
    return {
      isAd: true,
      show: async () => {
        rewardedDone = false;
        await runAd('rewarded');
        // SDK_REWARDED_WATCH_COMPLETE can land a moment after the ad closes.
        if (!rewardedDone) await new Promise((r) => setTimeout(r, 150));
        return rewardedDone;
      },
    };
  };
  return p;
}

export function createPlatform(name, opts = {}) {
  switch (name) {
    case 'dev':
      return devAdapter();
    case 'adsense':
      return opts.client ? adsenseAdapter(opts) : noneAdapter();
    case 'crazygames':
      return crazyGamesAdapter();
    case 'poki':
      return pokiAdapter();
    case 'gamedistribution':
      return gameDistributionAdapter(opts);
    default:
      return noneAdapter();
  }
}
