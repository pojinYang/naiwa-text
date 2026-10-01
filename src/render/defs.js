// Shared <defs>: one "puffy plastic" filter per body width, so the blur that
// fakes the rounded cross-section scales with how fat the frogs are.
// The region is in user space: a straight stroke has a zero-height bounding
// box, which would clip it with the default objectBoundingBox region.
const r = (n) => Math.round(n * 100) / 100;

export function filterId(width) {
  return `puff-${Math.round(width)}`;
}

export function puffFilter(width) {
  const w = Math.round(width);
  return `<filter id="${filterId(w)}" filterUnits="userSpaceOnUse" x="-300" y="-300" width="1624" height="1624" color-interpolation-filters="sRGB">
  <feGaussianBlur in="SourceAlpha" stdDeviation="${r(w * 0.2)}" result="height"/>
  <feDiffuseLighting in="height" surfaceScale="${r(w * 0.05)}" diffuseConstant="1" lighting-color="#ffffff" result="diffuse">
    <feDistantLight azimuth="235" elevation="52"/>
  </feDiffuseLighting>
  <feComposite in="SourceGraphic" in2="diffuse" operator="arithmetic" k1="0.75" k2="0.38" result="lit"/>
  <feSpecularLighting in="height" surfaceScale="${r(w * 0.05)}" specularConstant="0.55" specularExponent="16" lighting-color="#fffbe8" result="spec">
    <feDistantLight azimuth="235" elevation="48"/>
  </feSpecularLighting>
  <feComposite in="spec" in2="SourceAlpha" operator="in" result="specIn"/>
  <feComposite in="lit" in2="specIn" operator="arithmetic" k2="1" k3="0.7" result="shaded"/>
  <feComposite in="shaded" in2="SourceAlpha" operator="in" result="body"/>
  <feGaussianBlur in="SourceAlpha" stdDeviation="${r(w * 0.09)}" result="shadowBlur"/>
  <feOffset in="shadowBlur" dx="${r(w * 0.05)}" dy="${r(w * 0.1)}" result="shadowOff"/>
  <feFlood flood-color="#5a4a10" flood-opacity="0.22"/>
  <feComposite in2="shadowOff" operator="in" result="shadow"/>
  <feMerge><feMergeNode in="shadow"/><feMergeNode in="body"/></feMerge>
</filter>`;
}

export function defsMarkup(widths) {
  const unique = [...new Set(widths.map((w) => Math.round(w)))];
  return `<defs>${unique.map(puffFilter).join('')}</defs>`;
}
