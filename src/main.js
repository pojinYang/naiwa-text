import './style.css';
import { loadChar, isHan } from './data/loadChar.js';
import { layoutSvg } from './render/layout.js';
import { downloadPng, downloadSvg, safeName } from './export.js';

const $ = (id) => document.getElementById(id);
const els = {
  text: $('text'),
  thickness: $('thickness'),
  thicknessOut: $('thickness-out'),
  jitter: $('jitter'),
  jitterOut: $('jitter-out'),
  perRow: $('per-row'),
  color: $('color'),
  limbs: $('limbs'),
  transparent: $('transparent'),
  preview: $('preview'),
  status: $('status'),
  dlPng: $('dl-png'),
  dlSvg: $('dl-svg'),
};

function readOptions() {
  return {
    style: document.querySelector('input[name="style"]:checked').value,
    font: document.querySelector('input[name="font"]:checked').value,
    thickness: Number(els.thickness.value),
    jitter: Number(els.jitter.value),
    color: els.color.value,
    limbs: els.limbs.checked,
    perRow: Math.max(1, Math.min(12, Number(els.perRow.value) || 4)),
  };
}

function toRows(text, perRow) {
  const rows = [];
  for (const line of text.split('\n')) {
    const chars = Array.from(line.trim());
    if (!chars.length) continue;
    for (let i = 0; i < chars.length; i += perRow) rows.push(chars.slice(i, i + perRow));
  }
  return rows;
}

let current = null;
let token = 0;

async function render() {
  const mine = ++token;
  const opts = readOptions();
  els.thicknessOut.value = `${Math.round(opts.thickness * 100)}%`;
  els.jitterOut.value = `${Math.round(opts.jitter * 100)}%`;

  const rows = toRows(els.text.value, opts.perRow);
  if (!rows.length) {
    els.preview.innerHTML = '';
    current = null;
    els.status.textContent = '輸入一些中文字吧！';
    return;
  }

  els.preview.classList.add('loading');
  const loaded = await Promise.all(
    rows.map((row) => Promise.all(row.map(async (char) => ({ char, data: isHan(char) ? await loadChar(char) : null })))),
  );
  if (mine !== token) return;

  const missing = loaded.flat().filter((c) => !c.data && isHan(c.char)).map((c) => c.char);
  current = { rows: loaded, opts };
  els.preview.innerHTML = layoutSvg(loaded, { ...opts, background: null }).svg;
  els.preview.classList.remove('loading');
  els.status.textContent = missing.length ? `找不到這些字的筆畫資料：${missing.join('')}` : '';
}

let timer;
const scheduleRender = () => {
  clearTimeout(timer);
  timer = setTimeout(render, 180);
};

document.querySelector('.panel').addEventListener('input', scheduleRender);

async function exportAs(kind) {
  if (!current) return;
  const background = els.transparent.checked && kind === 'png' ? null : '#ffffff';
  const { svg, width, height } = layoutSvg(current.rows, { ...current.opts, background });
  const name = safeName(els.text.value);
  els.dlPng.disabled = els.dlSvg.disabled = true;
  try {
    if (kind === 'png') await downloadPng(svg, { width, height }, name);
    else downloadSvg(svg, name);
  } catch (err) {
    els.status.textContent = `匯出失敗：${err.message}`;
  } finally {
    els.dlPng.disabled = els.dlSvg.disabled = false;
  }
}

els.dlPng.addEventListener('click', () => exportAs('png'));
els.dlSvg.addEventListener('click', () => exportAs('svg'));

render();
