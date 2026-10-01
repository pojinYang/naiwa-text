import { blockFigures, noodleStrokes, defaultWidth } from '../geometry/segment.js';
import { figure, tube, rng } from './naiwa.js';

export function bodyWidth(data, opts) {
  return Math.round(defaultWidth(data.medians.length) * opts.thickness);
}

// Markup for one character in 1024-unit space. Earlier strokes sit underneath.
export function renderCharacter(data, char, opts) {
  const width = bodyWidth(data, opts);
  const random = rng(char.codePointAt(0) * 7919 + (opts.seed || 0));
  if (opts.style === 'noodle') {
    return noodleStrokes(data.medians, width, opts.font).map((s) => tube(s, width, opts, random)).join('');
  }
  return blockFigures(data.medians, width, opts.font).map((f) => figure(f, width, opts, random)).join('');
}
