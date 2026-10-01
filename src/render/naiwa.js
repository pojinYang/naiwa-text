import { smoothPath } from '../geometry/smooth.js';
import { add, scale, sub, norm, perp, dist, pointAt, polylineLength } from '../geometry/transform.js';
import { filterId } from './defs.js';

const r = (n) => Math.round(n * 10) / 10;

export const PALETTE = {
  eyeRing: '#a9d3a0',
  pupil: '#17201b',
  mouth: '#6e5a1c',
};

// Seeded PRNG so the same text always gets the same wobble.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const line = (a, b, width, color) =>
  `<path d="M${r(a.x)} ${r(a.y)}L${r(b.x)} ${r(b.y)}" stroke="${color}" stroke-width="${r(width)}" stroke-linecap="round" fill="none"/>`;

// Two eyes and a smile. `up` points from the face towards the top of the head.
export function face(center, up, width) {
  const angle = (Math.atan2(up.y, up.x) * 180) / Math.PI + 90;
  const w = width;
  const eye = (x) => `<circle cx="${r(x)}" cy="0" r="${r(w * 0.12)}" fill="${PALETTE.eyeRing}"/>
<circle cx="${r(x)}" cy="0" r="${r(w * 0.076)}" fill="${PALETTE.pupil}"/>
<circle cx="${r(x - w * 0.024)}" cy="${r(-w * 0.026)}" r="${r(w * 0.02)}" fill="#fff" opacity="0.85"/>`;
  return `<g transform="translate(${r(center.x)} ${r(center.y)}) rotate(${r(angle)})">
${eye(-w * 0.235)}${eye(w * 0.235)}
<path d="M${r(-w * 0.08)} ${r(w * 0.13)}Q0 ${r(w * 0.19)} ${r(w * 0.08)} ${r(w * 0.13)}" stroke="${PALETTE.mouth}" stroke-width="${r(w * 0.02)}" stroke-linecap="round" fill="none"/>
</g>`;
}

function centroid(pts) {
  const s = pts.reduce((acc, p) => add(acc, p), { x: 0, y: 0 });
  return scale(s, 1 / pts.length);
}

function wobble(pts, random, amount) {
  if (!amount) return '';
  const c = centroid(pts);
  const rot = (random() - 0.5) * 10 * amount;
  const k = 1 + (random() - 0.5) * 0.08 * amount;
  return `translate(${r(c.x)} ${r(c.y)}) rotate(${r(rot)}) scale(${k.toFixed(3)}) translate(${r(-c.x)} ${r(-c.y)})`;
}

// One standalone frog figure following `pts` (ordered head -> tail).
export function figure(fig, width, opts, random) {
  const { color, limbs, jitter } = opts;
  const w = width;
  const transform = wobble(fig.pts, random, jitter);
  const head = fig.pts[0];

  if (fig.kind === 'dot') {
    const c = centroid(fig.pts);
    const body = line(c, { x: c.x, y: c.y + w * 0.12 }, w * 1.02, color);
    const feet = limbs
      ? line({ x: c.x - w * 0.2, y: c.y + w * 0.5 }, { x: c.x - w * 0.2, y: c.y + w * 0.58 }, w * 0.2, color)
        + line({ x: c.x + w * 0.2, y: c.y + w * 0.5 }, { x: c.x + w * 0.2, y: c.y + w * 0.58 }, w * 0.2, color)
      : '';
    return `<g transform="${transform}"><g filter="url(#${filterId(w)})">${body}${feet}</g>${face({ x: c.x, y: c.y - w * 0.02 }, { x: 0, y: -1 }, w)}</g>`;
  }

  const total = polylineLength(fig.pts);
  const into = pointAt(fig.pts, Math.min(w * 0.3, total / 2)).dir;
  let parts = `<path d="${smoothPath(fig.pts)}" stroke="${color}" stroke-width="${r(w)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  if (limbs) {
    const tail = fig.pts[fig.pts.length - 1];
    const out = pointAt(fig.pts, Math.max(0, total - w * 0.3)).dir;
    const side = perp(out);
    for (const sgn of [-1, 1]) {
      const base = add(tail, scale(side, sgn * w * 0.21));
      parts += line(add(base, scale(out, w * 0.3)), add(base, scale(out, w * 0.5)), w * 0.2, color);
    }
    if (total > w * 0.9) {
      const at = pointAt(fig.pts, Math.min(w * 0.85, total * 0.5));
      const n = perp(at.dir);
      for (const sgn of [-1, 1]) {
        const root = add(at.point, scale(n, sgn * w * 0.42));
        parts += line(root, add(root, add(scale(n, sgn * w * 0.06), scale(at.dir, w * 0.1))), w * 0.2, color);
      }
    }
  }

  const center = add(head, scale(into, w * 0.06));
  const up = scale(into, -1);
  return `<g transform="${transform}"><g filter="url(#${filterId(w)})">${parts}</g>${face(center, up, w)}</g>`;
}

// One continuous tube per stroke, with an upright face at the start and at each fold.
export function tube(stroke, width, opts, random) {
  const { color, jitter } = opts;
  const w = width;
  const pts = stroke.pts;
  const transform = wobble(pts, random, jitter * 0.5);
  const total = polylineLength(pts);
  const body = total < w * 0.4
    ? line(pts[0], add(pts[0], { x: 0, y: w * 0.1 }), w * 1.02, color)
    : `<path d="${smoothPath(pts)}" stroke="${color}" stroke-width="${r(w)}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`;

  const up = { x: 0, y: -1 };
  const into = total > 0 ? norm(sub(pointAt(pts, Math.min(w * 0.3, total)).point, pts[0])) : { x: 0, y: 1 };
  const spots = [add(pts[0], scale(into, w * 0.08))];
  // Skip folds that would crowd an existing face or sit on a short end hook.
  for (const i of stroke.corners) {
    const remaining = polylineLength(pts.slice(i));
    if (remaining > w * 0.9 && spots.every((p) => dist(p, pts[i]) > w * 1.3)) spots.push(pts[i]);
  }
  const faces = spots.map((p) => face(p, up, w)).join('');
  return `<g transform="${transform}"><g filter="url(#${filterId(w)})">${body}</g>${faces}</g>`;
}
