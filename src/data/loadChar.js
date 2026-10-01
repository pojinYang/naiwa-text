// Stroke data from hanzi-writer-data (derived from Make Me a Hanzi).
const CDN = 'https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0';
const cache = new Map();

export function loadChar(char) {
  if (!cache.has(char)) {
    const request = fetch(`${CDN}/${encodeURIComponent(char)}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((data) => {
        // Network errors should not be cached forever.
        if (!data) cache.delete(char);
        return data;
      });
    cache.set(char, request);
  }
  return cache.get(char);
}

export const isHan = (char) => /\p{Script=Han}/u.test(char);
