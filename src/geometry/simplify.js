// Ramer–Douglas–Peucker polyline simplification.
function segmentDistance(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function simplify(pts, epsilon) {
  if (pts.length < 3) return pts.slice();
  let maxD = 0;
  let index = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = segmentDistance(pts[i], pts[0], pts[pts.length - 1]);
    if (d > maxD) {
      maxD = d;
      index = i;
    }
  }
  if (maxD <= epsilon) return [pts[0], pts[pts.length - 1]];
  const left = simplify(pts.slice(0, index + 1), epsilon);
  const right = simplify(pts.slice(index), epsilon);
  return left.slice(0, -1).concat(right);
}
