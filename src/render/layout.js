import { BOX } from '../geometry/transform.js';
import { defsMarkup } from './defs.js';
import { renderCharacter, bodyWidth } from './character.js';

const GAP = 40;
const PAD = 110;

const escapeXml = (s) => s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

// cells: rows of { char, data } (data null when unsupported, char ' ' for spaces).
export function layoutSvg(rows, opts) {
  const widths = [];
  let maxRowWidth = 0;
  const rowMarkup = rows.map((row, ri) => {
    let x = 0;
    const parts = row.map(({ char, data }) => {
      const cellWidth = char === ' ' ? BOX * 0.4 : BOX;
      let inner = '';
      if (data) {
        widths.push(bodyWidth(data, opts));
        inner = renderCharacter(data, char, opts);
      } else if (char.trim()) {
        inner = `<text x="${BOX / 2}" y="${BOX * 0.8}" font-size="${BOX * 0.86}" text-anchor="middle" fill="#e6ddc0" font-family="'PingFang TC','Noto Sans TC','Microsoft JhengHei',sans-serif">${escapeXml(char)}</text>`;
      }
      const g = `<g transform="translate(${x} ${ri * (BOX + GAP)})">${inner}</g>`;
      x += cellWidth + GAP;
      return g;
    });
    maxRowWidth = Math.max(maxRowWidth, x - GAP);
    return parts.join('');
  });

  const width = Math.max(maxRowWidth, BOX) + PAD * 2;
  const height = rows.length * (BOX + GAP) - GAP + PAD * 2;
  const bg = opts.background ? `<rect x="${-PAD}" y="${-PAD}" width="${width}" height="${height}" fill="${opts.background}"/>` : '';
  return {
    width,
    height,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-PAD} ${-PAD} ${width} ${height}" width="${width}" height="${height}">${defsMarkup(widths)}${bg}${rowMarkup.join('')}</svg>`,
  };
}
