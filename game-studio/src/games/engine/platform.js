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
//   setHooks({ pause, resume }) called around ads to pause game + audio

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

export function gameDistributionAdapter({ gameId } = {}) {
  const p = base('gamedistribution');
  let rewardedOk = false;
  p.init = () =>
    new Promise((resolve) => {
      window.GD_OPTIONS = {
        gameId,
        onEvent(event) {
          if (event.name === 'SDK_GAME_PAUSE') p.hooks.pause();
          if (event.name === 'SDK_GAME_START') p.hooks.resume();
          if (event.name === 'SDK_REWARDED_WATCH_COMPLETE') rewardedOk = true;
          if (event.name === 'SDK_READY') resolve();
        },
      };
      loadScript('https://html5.api.gamedistribution.com/main.min.js').catch(() => resolve());
      setTimeout(resolve, 4000);
    });
  p.interstitial = async () => {
    if (!window.gdsdk) return false;
    try {
      await window.gdsdk.showAd();
      return true;
    } catch {
      return false;
    }
  };
  p.prepareRewarded = async () =>
    window.gdsdk
      ? {
          isAd: true,
          show: async () => {
            rewardedOk = false;
            try {
              await window.gdsdk.showAd('rewarded');
            } catch {
              return false;
            }
            return rewardedOk;
          },
        }
      : null;
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
