import { T, riskColor, statusColor } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

export default function AIAnalysisTab({ data }) {
  if (!data) return null;

  const ai = data.ai_analysis || {};

  if (!ai || (!ai.summary && !ai.error)) {
    return (
      <div style={{ animation: 'fadeIn 0.2s ease' }}>
        <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
            <strong>AI Analysis</strong> interprets the evidence collected from the email and its security checks, then provides a human-readable assessment.
          </p>
        </div>
        <div style={{ padding: 24, textAlign: 'center', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: '0.75rem', color: T.textFaint, fontStyle: 'italic', margin: 0 }}>No AI analysis is available for this investigation.</p>
          <p style={{ fontSize: '0.62rem', color: T.textDim, marginTop: 6, margin: '6px 0 0 0' }}>This may be because the AI service was temporarily unavailable during processing.</p>
        </div>
      </div>
    );
  }

  if (ai.error) {
    return (
      <div style={{ animation: 'fadeIn 0.2s ease' }}>
        <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
          <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
            <strong>AI Analysis</strong> interprets the evidence collected from the email and its security checks, then provides a human-readable assessment.
          </p>
        </div>
        <div style={{ padding: 20, borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ color: T.warning, fontSize: '0.85rem' }}>⚠</span>
            <span style={{ fontSize: '0.75rem', color: T.warning, fontWeight: 600 }}>AI Analysis — Temporarily Unavailable</span>
          </div>
          <p style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>
            The AI analysis service was not available during this investigation. The deterministic security analysis (authentication, IOCs, threat intelligence) is unaffected.
          </p>
          {ai.limitations?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 4 }}>Notes</div>
              {ai.limitations.map((l, i) => <p key={i} style={{ fontSize: '0.6rem', color: T.textFaint, marginTop: 3, lineHeight: 1.4 }}>• {l}</p>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>AI Analysis</strong> interprets the evidence collected from the email and its security checks, then provides a human-readable assessment.
          This is <em>not</em> a replacement for security tools — it is an additional perspective that helps translate technical findings into plain language.
        </p>
      </div>

      {/* Key metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {ai.classification && (
          <div style={{ padding: '14px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: '0.48rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Classification</span>
              <InfoTip text="The AI's overall assessment of this email's nature — e.g., legitimate, phishing, spam, malware, or unknown." />
            </div>
            <div style={{
              fontSize: '0.88rem', fontWeight: 700,
              color: statusColor(ai.classification === 'legitimate' ? 'pass' : ai.classification === 'unknown' ? 'unknown' : 'fail'),
              textTransform: 'capitalize',
            }}>{ai.classification}</div>
          </div>
        )}
        {ai.severity && (
          <div style={{ padding: '14px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: '0.48rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Severity</span>
              <InfoTip text="How serious the AI considers the findings. Critical/High indicates strong evidence of malicious intent. Low suggests minimal risk." />
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: riskColor(ai.severity?.toUpperCase()), textTransform: 'capitalize' }}>{ai.severity}</div>
          </div>
        )}
        {ai.confidence != null && (
          <div style={{ padding: '14px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: '0.48rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Confidence</span>
              <InfoTip text="How strongly the available evidence supports this assessment. High confidence means the AI had sufficient data to form a conclusion. This is not the same as risk level." />
            </div>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: T.white }}>{(ai.confidence * 100).toFixed(0)}%</div>
          </div>
        )}
      </div>

      {/* Summary */}
      {ai.summary && (
        <SectionBlock title="Summary">
          <div style={{ padding: '14px 18px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: '0.72rem', color: T.textMuted, lineHeight: 1.65, margin: 0 }}>{ai.summary}</p>
          </div>
        </SectionBlock>
      )}

      {/* Reasoning */}
      {ai.reasoning?.length > 0 && (
        <SectionBlock title="Reasoning" description="The AI's thought process based on the available evidence.">
          <div>
            {ai.reasoning.map((r, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: T.radiusSm, background: T.surface,
                border: `1px solid ${T.border}`, marginBottom: 4, fontSize: '0.64rem',
                color: T.textMuted, lineHeight: 1.5,
              }}>
                <span style={{ color: T.textFaint, fontWeight: 600, marginRight: 6 }}>{i + 1}.</span>
                {typeof r === 'string' ? r : r.evidence || JSON.stringify(r)}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Threat Categories */}
      {ai.threat_categories?.length > 0 && (
        <SectionBlock title="Threat Categories">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {ai.threat_categories.map((c, i) => (
              <span key={i} style={{
                padding: '4px 12px', borderRadius: T.radiusFull, background: T.surfaceActive,
                color: T.textMuted, fontSize: '0.62rem', fontWeight: 600,
                border: `1px solid ${T.border}`,
              }}>{c}</span>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Social Engineering */}
      {ai.social_engineering_detected && (
        <div style={{
          padding: '14px 18px', borderRadius: T.radius, background: '#0C0808',
          border: `1px solid ${T.warning}25`, marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: T.warning, fontSize: '0.85rem' }}>⚠</span>
            <span style={{ fontSize: '0.72rem', color: T.warning, fontWeight: 600 }}>Social Engineering Detected</span>
            {ai.social_engineering_confidence != null && (
              <span style={{ fontSize: '0.58rem', color: T.textDim, marginLeft: 'auto' }}>
                Confidence: {(ai.social_engineering_confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
          <p style={{ fontSize: '0.62rem', color: T.textDim, lineHeight: 1.5, margin: '6px 0 0 0' }}>
            The AI detected signs that this email may be attempting to manipulate the recipient through psychological tactics
            such as urgency, authority impersonation, or deceptive requests.
          </p>
        </div>
      )}

      {/* Recommended Actions */}
      {ai.recommended_actions?.length > 0 && (
        <SectionBlock title="Recommended Actions" description="Suggested next steps based on the AI's analysis.">
          <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            {ai.recommended_actions.map((a, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                padding: '6px 0', borderBottom: i < ai.recommended_actions.length - 1 ? `1px solid ${T.border}` : 'none',
              }}>
                <span style={{ color: T.textFaint, fontSize: '0.68rem', marginTop: 1 }}>›</span>
                <span style={{ fontSize: '0.64rem', color: T.textMuted, lineHeight: 1.5 }}>{a}</span>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* Limitations */}
      {ai.limitations?.length > 0 && (
        <SectionBlock title="Limitations">
          <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}` }}>
            {ai.limitations.map((l, i) => (
              <p key={i} style={{ fontSize: '0.6rem', color: T.textFaint, lineHeight: 1.5, margin: '3px 0' }}>• {l}</p>
            ))}
          </div>
        </SectionBlock>
      )}
    </div>
  );
}
