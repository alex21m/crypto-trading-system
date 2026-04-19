export const C = {
  bg:    '#05070a',
  bg1:   '#080c12',
  bg2:   '#0b1018',
  bg3:   '#0e141e',
  bg4:   '#111926',
  bd:    '#1a2535',
  bd2:   '#243040',
  g:     '#00e87a',
  g2:    'rgba(0,232,122,.12)',
  g3:    'rgba(0,232,122,.05)',
  r:     '#ff3b5c',
  r2:    'rgba(255,59,92,.12)',
  b:     '#2d9cff',
  b2:    'rgba(45,156,255,.10)',
  y:     '#f5c518',
  y2:    'rgba(245,197,24,.10)',
  p:     '#c77dff',
  p2:    'rgba(199,125,255,.10)',
  acc:   '#f0b90b',
  text:  '#c8d8e8',
  text2: '#7a94ab',
  text3: '#3d5570',
};

export const fmtPrice = (n) => {
  if (!n) return '—';
  n = parseFloat(n);
  if (n >= 1000)  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (n >= 100)   return '$' + n.toFixed(2);
  if (n >= 1)     return '$' + n.toFixed(3);
  if (n >= 0.01)  return '$' + n.toFixed(4);
  return '$' + n.toFixed(6);
};

export const fmtChg = (n) => {
  if (n === undefined || n === null) return '—';
  const v = parseFloat(n);
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
};

export const fmtUSD = (n) => {
  if (n === undefined || n === null) return '$0.00';
  const v = parseFloat(n);
  return (v < 0 ? '-$' : '$') + Math.abs(v).toFixed(2);
};

export const fmtVol = (n) => {
  if (!n) return '—';
  n = parseFloat(n);
  if (n > 1e9) return (n / 1e9).toFixed(2) + 'B';
  if (n > 1e6) return (n / 1e6).toFixed(1) + 'M';
  return n.toFixed(0);
};

export const colorForChg = (chg) =>
  parseFloat(chg) >= 0 ? C.g : C.r;

export const ph = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 10,
  letterSpacing: 2,
  color: C.text3,
  padding: '4px 9px 3px',
  background: C.bg1,
  borderBottom: `1px solid ${C.bd}`,
  flexShrink: 0,
};

export const scrollCol = {
  overflowY: 'auto',
  overflowX: 'hidden',
  flex: 1,
};
