import { useState, useRef, useEffect } from 'react';
import { T } from '../theme';

/**
 * Small info icon that shows a tooltip on hover.
 * Used beside technical terms like SPF, DKIM, IOC, etc.
 */
export default function InfoTip({ text, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}>
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label="More information"
        style={{
          width: 16, height: 16, borderRadius: '50%', border: `1px solid ${T.border}`,
          background: 'transparent', color: T.textFaint, fontSize: '0.5rem', fontWeight: 700,
          cursor: 'help', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'inherit', lineHeight: 1, padding: 0, flexShrink: 0,
        }}
      >i</button>
      {open && (
        <div style={{
          position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
          marginBottom: 6, zIndex: 1000, width: 260, padding: '10px 12px',
          background: T.surface, border: `1px solid ${T.borderHover}`, borderRadius: T.radius,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          fontSize: '0.62rem', color: T.textMuted, lineHeight: 1.5,
          pointerEvents: 'none',
        }}>
          {children || text}
          <div style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent',
            borderTop: `5px solid ${T.borderHover}`,
          }} />
        </div>
      )}
    </span>
  );
}
