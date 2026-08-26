/* MAIL TRACE — Monochrome Design System */

export const T = {
  bg: '#000000',
  bgAlt: '#050505',
  bgPanel: '#0A0A0A',
  surface: '#111111',
  surfaceHover: '#181818',
  border: '#222222',
  borderHover: '#333333',
  borderBright: '#444444',

  white: '#FFFFFF',
  text: '#E0E0E0',
  textMuted: '#B3B3B3',
  textDim: '#8A8A8A',
  textFaint: '#555555',
  textDark: '#333333',

  accent: '#FFFFFF',
  accentDim: '#CCCCCC',

  /* Semantic security colors — used sparingly */
  success: '#4ADE80',
  successDim: '#22C55E',
  warning: '#FBBF24',
  warningDim: '#F59E0B',
  danger: '#F87171',
  dangerDim: '#EF4444',

  radius: 6,
  radiusLg: 10,
  sidebarWidth: 200,
  topbarHeight: 48,
};

export const riskColor = (level) => {
  const m = { LOW: '#4ADE80', MEDIUM: '#FBBF24', HIGH: '#F87171', CRITICAL: '#EF4444' };
  return m[level] || '#666666';
};

export const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'pass' || s === 'clean' || s === 'safe' || s === 'legitimate') return '#4ADE80';
  if (s === 'fail' || s === 'malicious' || s === 'critical' || s === 'high') return '#F87171';
  if (s === 'softfail' || s === 'suspicious' || s === 'warning' || s === 'medium') return '#FBBF24';
  return '#666666';
};

export const card = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius,
};

export const sectionHead = {
  fontSize: '0.62rem',
  fontWeight: 600,
  color: T.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  marginBottom: 10,
  paddingBottom: 7,
  borderBottom: `1px solid ${T.border}`,
};

export const mono = {
  fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace',
};
