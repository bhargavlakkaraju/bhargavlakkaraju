// Namespaced, exception-safe localStorage (private mode / sandboxed iframes can throw).
const NS = 'ra:';

export function load(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(NS + key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function save(key, value) {
  try {
    window.localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    /* storage unavailable: progress simply isn't persisted */
  }
}

export function remove(key) {
  try {
    window.localStorage.removeItem(NS + key);
  } catch {
    /* ignore */
  }
}
