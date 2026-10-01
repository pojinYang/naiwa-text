import { blockFigures, noodleStrokes, defaultWidth } from '../geometry/segment.js';
import { figure, tube, rng } from './naiwa.js';

// Frogs are drawn slimmer than the width the skeleton is cut for, so strokes
// read more clearly without changing how they are segmented.
const SLIM = 0.82;

function skeletonWidth(data, opts) {
  return defaultWidth(data.medians.length) * opts.thickness;
}

export function bodyWidth(data, opts) {
  return Math.round(skeletonWidth(data, opts) * SLIM);
}

// Markup for one character in 1024-unit space. Earlier strokes sit underneath.
export function renderCharacter(data, char, opts) {
  const cut = skeletonWidth(data, opts);
  const width = bodyWidth(data, opts);
  const random = rng(char.codePointAt(0) * 7919 + (opts.seed || 0));
  if (opts.style === 'noodle') {
    return noodleStrokes(data.medians, cut, opts.font).map((s) => tube(s, width, opts, random)).join('');
  }
  return blockFigures(data.medians, cut, opts.font).map((f) => figure(f, width, opts, random)).join('');
}
