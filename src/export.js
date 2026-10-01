function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const safeName = (text) => `naiwa-${text.replace(/[\\/:*?"<>|\s]+/g, '').slice(0, 20) || 'text'}`;

export function downloadSvg(svg, name) {
  download(new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`);
}

// Rasterise through an <img>, which keeps the SVG lighting filters.
export async function downloadPng(svg, size, name, pxPerUnit = 0.5) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.width * pxPerUnit);
    canvas.height = Math.round(size.height * pxPerUnit);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    download(blob, `${name}.png`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
