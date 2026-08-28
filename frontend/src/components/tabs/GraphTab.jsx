import { T } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';
import InvestigationGraph from '../InvestigationGraph';

export default function GraphTab({ graph, loading, error, onRetry }) {
  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Relationship Graph</strong> connects the technical elements discovered during the investigation.
          It helps you visualize how the email, domains, IP addresses, and other indicators are related to each other.
        </p>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <InfoTip text="Node colors indicate risk level. Red means malicious, amber means suspicious, green means clean, and gray means unknown or not assessed." />
        <span style={{ fontSize: '0.58rem', color: T.textFaint }}>Node colors indicate risk level:</span>
        {[
          { label: 'Malicious', color: T.danger },
          { label: 'Suspicious', color: T.warning },
          { label: 'Clean', color: T.success },
          { label: 'Unknown', color: T.textFaint },
        ].map(l => (
          <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.56rem', color: T.textDim }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
            {l.label}
          </span>
        ))}
      </div>

      {/* Graph */}
      <InvestigationGraph graph={graph} loading={loading} error={error} onRetry={onRetry} />
    </div>
  );
}
