/* MAIL TRACE — Premium Monochrome Design System */

export const T = {
  bg: '#000000',
  bgAlt: '#060608',
  bgPanel: '#0A0A0C',
  surface: '#111113',
  surfaceHover: '#19191C',
  surfaceActive: '#1F1F23',
  border: '#1E1E22',
  borderHover: '#2E2E33',
  borderBright: '#3A3A40',

  white: '#FFFFFF',
  text: '#DEDEE0',
  textMuted: '#A0A0A8',
  textDim: '#72727A',
  textFaint: '#48484F',
  textDark: '#2A2A2F',

  accent: '#FFFFFF',
  accentDim: '#C8C8CC',

  success: '#4ADE80',
  successDim: '#22C55E',
  warning: '#FBBF24',
  warningDim: '#F59E0B',
  danger: '#F87171',
  dangerDim: '#EF4444',

  radius: 8,
  radiusSm: 4,
  radiusLg: 12,
  radiusFull: 9999,
  sidebarWidth: 208,
  topbarHeight: 52,
};

export const riskColor = (level) => {
  const m = { LOW: '#4ADE80', MEDIUM: '#FBBF24', HIGH: '#F87171', CRITICAL: '#EF4444' };
  return m[level] || '#555555';
};

export const statusColor = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'pass' || s === 'clean' || s === 'safe' || s === 'legitimate') return '#4ADE80';
  if (s === 'fail' || s === 'malicious' || s === 'critical' || s === 'high') return '#F87171';
  if (s === 'softfail' || s === 'suspicious' || s === 'warning' || s === 'medium') return '#FBBF24';
  return '#555555';
};

export const card = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius,
};

export const sectionHead = {
  fontSize: '0.6rem',
  fontWeight: 600,
  color: T.textDim,
  textTransform: 'uppercase',
  letterSpacing: '0.16em',
  marginBottom: 12,
  paddingBottom: 8,
  borderBottom: `1px solid ${T.border}`,
};

export const mono = {
  fontFamily: '"SF Mono", "Cascadia Code", "Fira Code", ui-monospace, monospace',
};

/* Reusable button styles */
export const btnPrimary = {
  padding: '7px 16px',
  borderRadius: T.radius,
  background: T.white,
  color: T.bg,
  border: 'none',
  fontSize: '0.7rem',
  fontWeight: 600,
  cursor: 'pointer',
  letterSpacing: '0.03em',
  transition: 'all 0.15s ease',
};

export const btnSecondary = {
  padding: '6px 14px',
  borderRadius: T.radius,
  background: 'transparent',
  color: T.textMuted,
  border: `1px solid ${T.border}`,
  fontSize: '0.7rem',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
