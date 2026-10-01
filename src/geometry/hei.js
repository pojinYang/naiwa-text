import { simplify } from './simplify.js';
import { dist, sub, len } from './transform.js';

function turn(a, b, c) {
  const u = sub(b, a);
  const v = sub(c, b);
  const cos = (u.x * v.x + u.y * v.y) / ((len(u) * len(v)) || 1);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

// Horizontal snaps only move y and vertical snaps only move x, so alternating
// 橫/豎 segments that share a vertex stay connected.
function snapAxes(pts, snapH, snapV) {
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i];
    const b = pts[i + 1];
    const deg = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI);
    if (Math.min(deg, 180 - deg) <= snapH) {
      a.y = b.y = (a.y + b.y) / 2;
    } else if (Math.abs(deg - 90) <= snapV) {
      a.x = b.x = (a.x + b.x) / 2;
    }
  }
}

function intersect(p1, p2, p3, p4) {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null;
  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

// Kai folds are chamfered (a short diagonal between 橫 and 豎); turn each
// chamfer into a sharp corner where the neighbouring segments meet.
function collapseChamfers(pts, maxLen) {
  for (let i = 1; i < pts.length - 2; i++) {
    if (dist(pts[i], pts[i + 1]) >= maxLen) continue;
    const corner = intersect(pts[i - 1], pts[i], pts[i + 1], pts[i + 2]);
    if (!corner || dist(corner, pts[i]) > maxLen * 2) continue;
    pts.splice(i, 2, corner);
    i--;
  }
}

function offAxis(a, b) {
  const deg = Math.abs((Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI) % 90;
  return Math.min(deg, 90 - deg);
}

// Pointing down-right in SVG space (0°..90°), like 斜鉤 and 捺.
function downRight(a, b) {
  const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
  return deg >= 0 && deg <= 90;
}

// Kai strokes such as the 斜鉤 of 戈 bend gradually; Hei draws them as one
// straight line. Repeatedly drop the gentlest interior vertex. Bends next to a
// clearly axis-aligned part are kept (月's 豎撇 stays vertical, then sweeps),
// except for down-right strokes, whose Kai form starts steep but Hei's does not.
function straightenGentle(pts, maxTurn, protect) {
  while (pts.length > 2) {
    let best = -1;
    let bestTurn = maxTurn;
    for (let i = 1; i < pts.length - 1; i++) {
      const sweep = downRight(pts[i - 1], pts[i]) && downRight(pts[i], pts[i + 1]);
      if (!sweep && (offAxis(pts[i - 1], pts[i]) < protect || offAxis(pts[i], pts[i + 1]) < protect)) continue;
      const t = turn(pts[i - 1], pts[i], pts[i + 1]);
      if (t < bestTurn) {
        bestTurn = t;
        best = i;
      }
    }
    if (best < 0) break;
    pts.splice(best, 1);
  }
}

// Hei hooks are short knobs; long Kai hooks become big lumps on fat bodies.
function shortenHook(pts, maxLen) {
  const n = pts.length;
  if (n < 3 || turn(pts[n - 3], pts[n - 2], pts[n - 1]) < 100) return;
  const a = pts[n - 2];
  const b = pts[n - 1];
  const l = dist(a, b);
  if (l <= maxLen) return;
  pts[n - 1] = { x: a.x + ((b.x - a.x) * maxLen) / l, y: a.y + ((b.y - a.y) * maxLen) / l };
}

// Make a Kai (楷書) skeleton read like Hei (黑體): drop the brush entry,
// straighten gentle curves, sharpen chamfered folds, snap near-horizontal /
// near-vertical segments to exact axes and keep hooks short.
export function heiify(pts, width, { epsilon = width * 0.22, snapH = 18, snapV = 14, gentle = 40, protect = 8 } = {}) {
  let out = simplify(pts, epsilon).map((p) => ({ ...p }));
  if (out.length > 2 && dist(out[0], out[1]) < width * 0.7 && turn(out[0], out[1], out[2]) > 30) {
    out = out.slice(1);
  }
  straightenGentle(out, gentle, protect);
  snapAxes(out, snapH, snapV);
  collapseChamfers(out, width * 0.45);
  snapAxes(out, snapH, snapV);
  shortenHook(out, width * 0.4);
  return out.filter((p, i) => i === 0 || dist(p, out[i - 1]) > 1);
}
