import { toSvgMedian, sub, dist, len, polylineLength, slice, pointAt } from './transform.js';
import { simplify } from './simplify.js';
import { heiify } from './hei.js';

// Absolute turning angle (degrees) at b when walking a -> b -> c.
export function turnAngle(a, b, c) {
  const u = sub(b, a);
  const v = sub(c, b);
  const cos = (u.x * v.x + u.y * v.y) / ((len(u) * len(v)) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

// Median -> simplified SVG-space polyline with the tiny entry/exit ticks removed.
// font 'hei' additionally straightens the Kai skeleton (see hei.js).
export function prepareStroke(median, width, font = 'kai', epsilon = 14) {
  let pts = simplify(toSvgMedian(median), epsilon);
  const tick = width * 0.4;
  if (pts.length > 2 && dist(pts[0], pts[1]) < tick && turnAngle(pts[0], pts[1], pts[2]) > 35) {
    pts = pts.slice(1);
  }
  const n = pts.length;
  if (n > 2 && dist(pts[n - 2], pts[n - 1]) < tick && turnAngle(pts[n - 3], pts[n - 2], pts[n - 1]) > 35) {
    pts = pts.slice(0, -1);
  }
  return font === 'hei' ? heiify(pts, width) : pts;
}

// Indices of vertices where the stroke turns sharply (folds such as 橫折, hooks).
// Folds are often rounded over several short edges, so the turn is measured
// between points a fixed arc-length `reach` before and after each vertex, and
// only the strongest vertex within that reach is kept.
export function cornerIndices(pts, minAngle = 55, reach = 50) {
  const arc = [0];
  for (let i = 1; i < pts.length; i++) arc.push(arc[i - 1] + dist(pts[i - 1], pts[i]));
  const total = arc[arc.length - 1];
  const scores = pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return 0;
    const before = pointAt(pts, Math.max(0, arc[i] - reach)).point;
    const after = pointAt(pts, Math.min(total, arc[i] + reach)).point;
    return turnAngle(before, p, after);
  });
  const out = [];
  for (let i = 1; i < pts.length - 1; i++) {
    if (scores[i] <= minAngle) continue;
    const isPeak = scores.every((sc, j) => j === i || Math.abs(arc[j] - arc[i]) > reach || sc < scores[i] || (sc === scores[i] && j > i));
    if (isPeak) out.push(i);
  }
  return out;
}

// Cut a polyline at sharp corners, but only when both sides are long enough
// to be a figure of their own; otherwise the bend stays inside one figure.
export function splitAtCorners(pts, width, { minAngle = 55, minPart = 0.9 } = {}) {
  const parts = [];
  let start = 0;
  for (const i of cornerIndices(pts, minAngle, width * 0.45)) {
    const before = polylineLength(pts.slice(start, i + 1));
    const after = polylineLength(pts.slice(i));
    if (before >= width * minPart && after >= width * minPart) {
      parts.push(pts.slice(start, i + 1));
      start = i;
    }
  }
  parts.push(pts.slice(start));
  return parts;
}

// Very long parts become a row of figures (the long 橫 in 我 is two figures).
export function splitLong(pts, width, { maxLen = 2.6, pieceLen = 1.9 } = {}) {
  const total = polylineLength(pts);
  if (total <= width * maxLen) return [pts];
  const n = Math.max(2, Math.round(total / (width * pieceLen)));
  const step = total / n;
  const pad = width * 0.12;
  const out = [];
  for (let k = 0; k < n; k++) {
    out.push(slice(pts, k === 0 ? 0 : k * step + pad, k === n - 1 ? total : (k + 1) * step - pad));
  }
  return out;
}

// Order points head -> tail so faces are never upside down:
// mostly-horizontal figures get their head on the left, others on top.
export function orientHead(pts) {
  const a = pts[0];
  const b = pts[pts.length - 1];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const headIsStart = Math.abs(dx) > Math.abs(dy) * 1.2 ? a.x <= b.x : a.y <= b.y;
  return headIsStart ? pts : pts.slice().reverse();
}

// Character data -> list of figures for the block style.
export function blockFigures(medians, width, font = 'kai') {
  const figures = [];
  medians.forEach((median, strokeIndex) => {
    const pts = prepareStroke(median, width, font);
    if (polylineLength(pts) < width * 0.7) {
      figures.push({ kind: 'dot', strokeIndex, pts });
      return;
    }
    for (const part of splitAtCorners(pts, width)) {
      for (const piece of splitLong(part, width)) {
        figures.push({ kind: 'body', strokeIndex, pts: orientHead(piece) });
      }
    }
  });
  return figures;
}

// Character data -> list of tubes (one per stroke) for the noodle style.
export function noodleStrokes(medians, width, font = 'kai') {
  return medians.map((median, strokeIndex) => {
    const pts = prepareStroke(median, width, font);
    return { strokeIndex, pts, font, corners: cornerIndices(pts, 50, width * 0.45) };
  });
}

// Body thickness heuristic: fewer strokes -> chubbier frogs.
export function defaultWidth(strokeCount) {
  return Math.max(68, Math.min(140, 172 - 6.5 * strokeCount));
}
