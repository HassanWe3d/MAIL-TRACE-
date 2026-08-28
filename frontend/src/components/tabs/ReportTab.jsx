import { T } from '../../theme';
import { getReportUrl } from '../../api';
import { SectionBlock } from '../Explanation';

export default function ReportTab({ data }) {
  if (!data) return null;

  const reportUrl = getReportUrl(data.id);

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Investigation Report</strong> brings together all findings from this investigation into a format that can be reviewed, shared, or archived.
        </p>
      </div>

      {/* Report card */}
      <div style={{ padding: '24px 28px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}`, textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: 12 }}>📄</div>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: T.white, margin: '0 0 8px 0' }}>PDF Investigation Report</h3>
        <p style={{ fontSize: '0.68rem', color: T.textDim, lineHeight: 1.5, marginBottom: 20, maxWidth: 400, margin: '0 auto 20px auto' }}>
          This report includes authentication results, indicators of compromise, threat intelligence findings,
          and AI analysis — formatted for review and sharing.
        </p>
        <a
          href={reportUrl}
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 24px', borderRadius: T.radius,
            background: T.white, color: T.bg, border: 'none',
            fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            textDecoration: 'none', letterSpacing: '0.03em',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          ↓ Download Report
        </a>
      </div>

      {/* What's included */}
      <SectionBlock title="What's Included" description="The report combines all investigation findings into a single document.">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            'Email metadata and headers',
            'SPF, DKIM, DMARC results',
            'Indicators of compromise',
            'Threat intelligence findings',
            'IP geolocation data',
            'AI analysis and reasoning',
            'Risk score breakdown',
            'Recommended actions',
          ].map((item, i) => (
            <div key={i} style={{
              padding: '8px 12px', borderRadius: T.radiusSm,
              background: T.surface, border: `1px solid ${T.border}`,
              fontSize: '0.62rem', color: T.textMuted, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ color: T.textFaint }}>✓</span> {item}
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  );
}
