import { useState } from 'react';
import { T } from '../theme';

/**
 * Reusable explanation block used throughout investigation tabs.
 * Shows: concept name, simple explanation, actual result, why it matters.
 *
 * Props:
 * - title: string (e.g. "SPF")
 * - explanation: string (what is it?)
 * - result: ReactNode (the actual finding)
 * - resultColor: string (color for result label)
 * - resultLabel: string (e.g. "PASS", "FAIL")
 * - whyMatters: string (why this finding is important)
 * - technicalDetails: ReactNode (optional expandable raw data)
 */
export default function Explanation({ title, explanation, result, resultColor, resultLabel, whyMatters, technicalDetails }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      padding: '16px 18px', borderRadius: T.radius, background: T.surface,
      border: `1px solid ${T.border}`, marginBottom: 10,
    }}>
      {/* Title + result row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.white, letterSpacing: '0.02em' }}>{title}</span>
        {resultLabel && (
          <span style={{
            fontSize: '0.53rem', padding: '2px 8px', borderRadius: 4, fontWeight: 600,
            background: `${resultColor}14`, color: resultColor,
            border: `1px solid ${resultColor}25`, textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>{resultLabel}</span>
        )}
      </div>

      {/* What is it? */}
      {explanation && (
        <p style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.55, marginBottom: 8 }}>{explanation}</p>
      )}

      {/* What did we find? */}
      {result && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>What did we find</div>
          <div style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.5 }}>{result}</div>
        </div>
      )}

      {/* Why does it matter? */}
      {whyMatters && (
        <div>
          <div style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Why this matters</div>
          <p style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.55, margin: 0 }}>{whyMatters}</p>
        </div>
      )}

      {/* Technical details expandable */}
      {technicalDetails && (
        <div style={{ marginTop: 10 }}>
          <button
            onClick={() => setExpanded(v => !v)}
            style={{
              fontSize: '0.58rem', color: T.textFaint, background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'inherit',
            }}
          >
            <span style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▸</span>
            Technical details
          </button>
          {expanded && (
            <div style={{
              marginTop: 6, padding: '10px 12px', borderRadius: T.radiusSm,
              background: T.bgPanel, border: `1px solid ${T.border}`,
              fontSize: '0.6rem', color: T.textDim, lineHeight: 1.5,
              fontFamily: '"SF Mono", ui-monospace, monospace',
              wordBreak: 'break-all', whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto',
            }}>
              {technicalDetails}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Simple section wrapper with a title and optional description.
 */
export function SectionBlock({ title, description, count, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <h3 style={{ fontSize: '0.7rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{title}</h3>
        {count != null && (
          <span style={{ fontSize: '0.5rem', fontWeight: 600, color: T.textFaint, background: T.surfaceActive, padding: '1px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>{count}</span>
        )}
      </div>
      {description && <p style={{ fontSize: '0.62rem', color: T.textDim, lineHeight: 1.5, marginBottom: 12, maxWidth: 600 }}>{description}</p>}
      {children}
    </div>
  );
}
