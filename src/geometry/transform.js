// Make Me a Hanzi data uses a 1024 box with y pointing up; flip into SVG space.
export const BOX = 1024;

export function toSvgPoint([x, y]) {
  return { x, y: 900 - y };
}

export function toSvgMedian(median) {
  return median.map(toSvgPoint);
}

export const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y });
export const add = (a, b) => ({ x: a.x + b.x, y: a.y + b.y });
export const scale = (a, k) => ({ x: a.x * k, y: a.y * k });
export const len = (a) => Math.hypot(a.x, a.y);
export const dist = (a, b) => len(sub(a, b));
export const norm = (a) => {
  const l = len(a) || 1;
  return { x: a.x / l, y: a.y / l };
};
export const perp = (a) => ({ x: -a.y, y: a.x });
export const lerp = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });

export function polylineLength(pts) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += dist(pts[i - 1], pts[i]);
  return total;
}

// Point and tangent at arc-length s along a polyline.
export function pointAt(pts, s) {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= s || i === pts.length - 1) {
      const t = d === 0 ? 0 : Math.min(1, Math.max(0, (s - acc) / d));
      return { point: lerp(pts[i - 1], pts[i], t), dir: norm(sub(pts[i], pts[i - 1])) };
    }
    acc += d;
  }
  return { point: pts[0], dir: { x: 1, y: 0 } };
}

// Sub-polyline between arc-lengths s0 and s1.
export function slice(pts, s0, s1) {
  const out = [pointAt(pts, s0).point];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += dist(pts[i - 1], pts[i]);
    if (acc > s0 && acc < s1) out.push(pts[i]);
  }
  out.push(pointAt(pts, s1).point);
  return out;
}
