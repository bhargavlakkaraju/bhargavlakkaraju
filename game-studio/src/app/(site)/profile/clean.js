// Client-side mirror of the server name rules (the server re-validates on submit).
export function cleanNameClient(raw) {
  const name = String(raw || '')
    .normalize('NFKC')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 16);
  return name.length >= 2 ? name : null;
}
