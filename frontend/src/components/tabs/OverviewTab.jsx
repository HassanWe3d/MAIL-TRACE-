import { T, riskColor, statusColor } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

function StatMini({ label, value, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color || T.white, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: '0.5rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>{label}</div>
    </div>
  );
}

function SummaryItem({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ fontSize: '0.64rem', color: T.textDim }}>{label}</span>
      <span style={{ fontSize: '0.64rem', color: color || T.textMuted, fontWeight: 500 }}>{value || '—'}</span>
    </div>
  );
}

export default function OverviewTab({ data }) {
  if (!data) return null;

  const rc = riskColor(data.risk_level);
  const ai = data.ai_analysis || {};
  const auth = data.authentication_results || {};
  const iocs = data.iocs || [];
  const ti = data.threat_intel_results || [];
  const ips = data.ip_enrichments || [];
  const meta = data.email_metadata || {};

  // Count auth failures
  const authFails = [auth.spf_result, auth.dkim_result, auth.dmarc_result].filter(r => r && r.toLowerCase() === 'fail').length;
  const malTi = ti.filter(t => t.status === 'malicious').length;
  const suspTi = ti.filter(t => t.status === 'suspicious').length;
  const highIocs = iocs.filter(i => i.risk === 'high' || i.risk === 'malicious' || i.risk === 'critical').length;

  // Build human-readable summary
  const warnings = [];
  if (authFails > 0) warnings.push(`${authFails} authentication check${authFails > 1 ? 's' : ''} failed`);
  if (malTi > 0) warnings.push(`${malTi} indicator${malTi > 1 ? 's' : ''} flagged as malicious`);
  if (suspTi > 0) warnings.push(`${suspTi} indicator${suspTi > 1 ? 's' : ''} flagged as suspicious`);
  if (highIocs > 0) warnings.push(`${highIocs} high-risk IOC${highIocs > 1 ? 's' : ''} detected`);
  if (ai.social_engineering_detected) warnings.push('Social engineering indicators detected');
  if (auth.domain_mismatch) warnings.push('Sender domain mismatch detected');
  if (auth.reply_to_mismatch) warnings.push('Reply-To address mismatch detected');

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Risk Banner */}
      <div style={{
        padding: '20px 24px', borderRadius: T.radius, background: T.surface,
        border: `1px solid ${T.border}`, marginBottom: 20,
        display: 'flex', alignItems: 'center', gap: 20,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: T.radiusLg, background: T.bgPanel,
          border: `2px solid ${rc}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.4rem', fontWeight: 800, color: rc, flexShrink: 0,
          fontVariantNumeric: 'tabular-nums',
        }}>{data.risk_score ?? 0}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: rc, letterSpacing: '0.03em' }}>
            {(data.risk_level || 'UNKNOWN').toUpperCase()} RISK
          </div>
          <div style={{ fontSize: '0.62rem', color: T.textDim, marginTop: 3 }}>
            Classification: {data.classification || ai.classification || 'Unknown'}
            {data.ai_confidence != null && ` · ${(data.ai_confidence * 100).toFixed(0)}% confidence`}
          </div>
        </div>
      </div>

      {/* Summary explanation */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          {warnings.length > 0
            ? <>This investigation identified {warnings.length} notable finding{warnings.length > 1 ? 's' : ''}:</>
            : 'No significant threats were identified during this investigation.'
          }
        </p>
        {warnings.length > 0 && (
          <ul style={{ margin: '6px 0 0 0', padding: '0 0 0 16px' }}>
            {warnings.map((w, i) => <li key={i} style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.6 }}>{w}</li>)}
          </ul>
        )}
      </div>

      {/* Key Metrics */}
      <SectionBlock title="Key Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, padding: '16px 0' }}>
          <StatMini label="Risk Score" value={data.risk_score ?? 0} color={rc} />
          <StatMini label="IOCs" value={iocs.length} color={iocs.length > 0 ? T.white : T.textFaint} />
          <StatMini label="Threat Hits" value={ti.length} color={malTi > 0 ? T.danger : ti.length > 0 ? T.warning : T.textFaint} />
          <StatMini label="Auth Failures" value={authFails} color={authFails > 0 ? T.danger : T.textFaint} />
          <StatMini label="IPs Found" value={ips.length} color={ips.length > 0 ? T.white : T.textFaint} />
        </div>
      </SectionBlock>

      {/* Quick Summary */}
      <SectionBlock title="Investigation Summary">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div>
            <SummaryItem label="Subject" value={data.subject || meta.subject} />
            <SummaryItem label="Sender" value={data.sender || meta.from_address} />
            <SummaryItem label="Date" value={data.date ? new Date(data.date).toLocaleString() : '—'} />
          </div>
          <div>
            <SummaryItem label="Recipients" value={(meta.to_addresses || []).join(', ')} />
            <SummaryItem label="Filename" value={data.filename} />
            <SummaryItem label="Status" value={data.status?.toUpperCase()} color={data.status === 'completed' ? T.success : data.status === 'failed' ? T.danger : T.warning} />
          </div>
        </div>
      </SectionBlock>

      {/* Risk Score Breakdown */}
      {data.risk_score_detail && (
        <SectionBlock title="Risk Score Breakdown">
          <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', gap: 16, marginBottom: 10, fontSize: '0.62rem', color: T.textDim, flexWrap: 'wrap' }}>
              <span>Deterministic: <strong style={{ color: T.text }}>{data.risk_score_detail.deterministic_score ?? '—'}</strong></span>
              <span style={{ color: T.textFaint }}>·</span>
              <span>Social Engineering AI: <strong style={{ color: T.text }}>+{data.risk_score_detail.ai_social_engineering_score ?? 0}</strong></span>
              <span style={{ color: T.textFaint }}>·</span>
              <span>Final: <strong style={{ color: rc }}>{data.risk_score_detail.final_score ?? data.risk_score}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <InfoTip text="The risk score combines automated security checks and AI analysis to produce a single number. Higher scores indicate more risk factors were found." />
              <span style={{ fontSize: '0.56rem', color: T.textFaint }}>What is a risk score?</span>
            </div>
            {(data.risk_score_detail.signals || []).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: T.radiusSm, background: T.surface, fontSize: '0.63rem', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, color: T.white, minWidth: 26, fontSize: '0.58rem', fontVariantNumeric: 'tabular-nums' }}>+{s.weight}</span>
                <span style={{ color: T.textMuted, flex: 1 }}>{s.name}</span>
                {s.evidence && <span style={{ color: T.textFaint, fontSize: '0.53rem', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.evidence}</span>}
              </div>
            ))}
          </div>
        </SectionBlock>
      )}
    </div>
  );
}
