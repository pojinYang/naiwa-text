import { describe, it, expect } from 'vitest';
import { simplify } from '../src/geometry/simplify.js';
import { smoothPath } from '../src/geometry/smooth.js';
import { polylineLength } from '../src/geometry/transform.js';
import { heiify } from '../src/geometry/hei.js';
import {
  turnAngle, prepareStroke, splitAtCorners, splitLong, orientHead, blockFigures, defaultWidth,
} from '../src/geometry/segment.js';

// Medians copied from hanzi-writer-data.
const KOU = [
  [[229, 584], [272, 548], [287, 517], [330, 203], [348, 152]],
  [[304, 569], [333, 552], [488, 574], [663, 608], [700, 607], [720, 598], [759, 559], [758, 552], [694, 295], [661, 273]],
  [[369, 185], [394, 203], [651, 238], [710, 236], [744, 224]],
];
const WO_XIEGOU = [[492, 807], [537, 760], [538, 627], [569, 435], [612, 299], [676, 170], [717, 112], [779, 48], [817, 22], [859, 12], [880, 78], [891, 140], [886, 147], [894, 173]];
const WO_SHUGOU = [[323, 556], [351, 542], [365, 522], [361, 116], [340, 67], [246, 113]];
const LE = [
  [[228, 705], [296, 678], [401, 712], [502, 736], [666, 768], [699, 764], [716, 739], [721, 715], [534, 568], [513, 563]],
  [[461, 574], [532, 506], [551, 451], [564, 290], [556, 153], [541, 101], [515, 68], [470, 84], [367, 141]],
];

describe('simplify', () => {
  it('collapses collinear points', () => {
    const pts = [0, 1, 2, 3, 4].map((x) => ({ x: x * 10, y: 0 }));
    expect(simplify(pts, 1)).toEqual([pts[0], pts[4]]);
  });
  it('keeps a right-angle corner', () => {
    const pts = [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }];
    expect(simplify(pts, 5)).toHaveLength(3);
  });
});

describe('turnAngle', () => {
  it('is 90 for a right turn and 0 for straight', () => {
    expect(turnAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 })).toBeCloseTo(90);
    expect(turnAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 })).toBeCloseTo(0);
  });
});

describe('block segmentation', () => {
  const w = defaultWidth(3);

  it('splits the 橫折 of 口 into a horizontal and a vertical part', () => {
    const parts = splitAtCorners(prepareStroke(KOU[1], w), w);
    expect(parts).toHaveLength(2);
    const [h, v] = parts;
    expect(Math.abs(h.at(-1).x - h[0].x)).toBeGreaterThan(Math.abs(h.at(-1).y - h[0].y));
    expect(Math.abs(v.at(-1).y - v[0].y)).toBeGreaterThan(Math.abs(v.at(-1).x - v[0].x));
  });

  it('drops the tiny entry tick at the start of a stroke', () => {
    const pts = prepareStroke(KOU[1], w);
    expect(pts[0].x).toBeGreaterThan(320);
  });

  it('turns 了 into several figures with the hook kept', () => {
    const figs = blockFigures(LE, defaultWidth(2));
    expect(figs.length).toBeGreaterThanOrEqual(3);
    expect(figs.every((f) => f.pts.length >= 2)).toBe(true);
  });

  it('splits long parts into pieces of similar length', () => {
    const line = [{ x: 0, y: 0 }, { x: 600, y: 0 }];
    const pieces = splitLong(line, 100);
    expect(pieces.length).toBe(3);
    for (const p of pieces) expect(polylineLength(p)).toBeGreaterThan(150);
  });

  it('puts the head on the left for horizontal and on top for vertical figures', () => {
    expect(orientHead([{ x: 100, y: 0 }, { x: 0, y: 0 }])[0].x).toBe(0);
    expect(orientHead([{ x: 0, y: 100 }, { x: 0, y: 0 }])[0].y).toBe(0);
  });
});

describe('smoothPath', () => {
  it('emits one cubic per segment', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }]);
    expect(d.match(/C/g)).toHaveLength(2);
  });
});

describe('heiify', () => {
  it('snaps a slightly rising 橫 to exact horizontal', () => {
    const out = heiify([{ x: 0, y: 100 }, { x: 300, y: 70 }], 100);
    expect(out[0].y).toBe(out[1].y);
  });

  it('keeps 橫折 connected while making both legs axis-aligned', () => {
    const out = heiify([{ x: 0, y: 10 }, { x: 300, y: 0 }, { x: 290, y: 300 }], 100);
    expect(out).toHaveLength(3);
    expect(out[0].y).toBe(out[1].y);
    expect(out[1].x).toBe(out[2].x);
  });

  it('leaves real diagonals (撇) alone', () => {
    const pts = [{ x: 300, y: 0 }, { x: 0, y: 300 }];
    expect(heiify(pts, 100)).toEqual(pts);
  });

  it('makes every 口 stroke axis-aligned', () => {
    const w = defaultWidth(3);
    for (const median of KOU) {
      const pts = prepareStroke(median, w, 'hei');
      for (let i = 1; i < pts.length; i++) {
        const dx = Math.abs(pts[i].x - pts[i - 1].x);
        const dy = Math.abs(pts[i].y - pts[i - 1].y);
        expect(Math.min(dx, dy)).toBeLessThan(1e-9);
      }
    }
  });

  it('draws the 斜鉤 of 我 as one straight diagonal plus a short hook', () => {
    const w = defaultWidth(7);
    const pts = prepareStroke(WO_XIEGOU, w, 'hei');
    expect(pts).toHaveLength(3);
    expect(Math.hypot(pts[2].x - pts[1].x, pts[2].y - pts[1].y)).toBeLessThanOrEqual(w * 0.4 + 1e-9);
  });

  it('keeps the vertical of a 豎鉤 and turns the chamfered hook into a short knob', () => {
    const w = defaultWidth(7);
    const pts = prepareStroke(WO_SHUGOU, w, 'hei');
    expect(pts).toHaveLength(3);
    expect(pts[0].x).toBe(pts[1].x);
  });
});
