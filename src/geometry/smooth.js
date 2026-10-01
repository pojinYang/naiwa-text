// Catmull-Rom spline through the points, emitted as cubic Bézier path data.
const fmt = (n) => Math.round(n * 10) / 10;

export function smoothPath(pts, tension = 0.5) {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M${fmt(pts[0].x)} ${fmt(pts[0].y)}h0.1`;
  let d = `M${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  if (pts.length === 2) return `${d}L${fmt(pts[1].x)} ${fmt(pts[1].y)}`;
  const k = tension / 3;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1 = { x: p1.x + (p2.x - p0.x) * k, y: p1.y + (p2.y - p0.y) * k };
    const c2 = { x: p2.x - (p3.x - p1.x) * k, y: p2.y - (p3.y - p1.y) * k };
    d += `C${fmt(c1.x)} ${fmt(c1.y)} ${fmt(c2.x)} ${fmt(c2.y)} ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d;
}
