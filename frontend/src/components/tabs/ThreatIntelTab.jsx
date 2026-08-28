import { T, statusColor } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

export default function ThreatIntelTab({ data }) {
  if (!data) return null;

  const ti = data.threat_intel_results || [];
  const iocs = data.iocs || [];

  const malicious = ti.filter(t => t.status === 'malicious');
  const suspicious = ti.filter(t => t.status === 'suspicious');
  const clean = ti.filter(t => t.status === 'clean');
  const unknown = ti.filter(t => !t.status || t.status === 'unknown');

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Section intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Threat intelligence</strong> checks whether the technical indicators found in this email (domains, IPs, URLs, hashes)
          have been associated with suspicious or malicious activity in security databases.
        </p>
      </div>

      {/* How it works */}
      <SectionBlock title="How Threat Intelligence Works">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: '0.62rem', color: T.textMuted, lineHeight: 1.6 }}>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: T.surfaceActive, color: T.text, fontWeight: 500 }}>Email parsed</span>
            <span style={{ color: T.textFaint }}>→</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: T.surfaceActive, color: T.text, fontWeight: 500 }}>Indicators extracted</span>
            <span style={{ color: T.textFaint }}>→</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: T.surfaceActive, color: T.text, fontWeight: 500 }}>Checked against <InfoTip text="VirusTotal aggregates information from 70+ antivirus engines, URL scanners, and community sources to assess whether an indicator has been associated with malicious activity." /> VirusTotal</span>
            <span style={{ color: T.textFaint }}>→</span>
            <span style={{ padding: '3px 8px', borderRadius: 4, background: T.surfaceActive, color: T.text, fontWeight: 500 }}>Results assessed</span>
          </div>
        </div>
      </SectionBlock>

      {/* Summary counts */}
      {ti.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Malicious', count: malicious.length, color: T.danger },
            { label: 'Suspicious', count: suspicious.length, color: T.warning },
            { label: 'Clean', count: clean.length, color: T.success },
            { label: 'Unknown', count: unknown.length, color: T.textFaint },
          ].map(s => (
            <div key={s.label} style={{ padding: '10px 14px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}`, textAlign: 'center' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.count}</div>
              <div style={{ fontSize: '0.5rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Detailed results */}
      <SectionBlock title="Detailed Results" count={ti.length}>
        {ti.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: '0.72rem', color: T.textFaint, fontStyle: 'italic', margin: 0 }}>
              No threat intelligence results are available.
            </p>
            <p style={{ fontSize: '0.62rem', color: T.textDim, marginTop: 6, margin: '6px 0 0 0' }}>
              This could mean the investigation is still processing, or the email did not contain checkable indicators.
            </p>
          </div>
        ) : (
          <div>
            {ti.map((t, i) => {
              const sc = statusColor(t.status);
              const isMal = t.status === 'malicious';
              const isSusp = t.status === 'suspicious';
              return (
                <div key={i} style={{
                  padding: '14px 16px', borderRadius: T.radius, background: T.surface,
                  border: `1px solid ${isMal ? `${T.danger}30` : isSusp ? `${T.warning}25` : T.border}`,
                  marginBottom: 8,
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.5rem', padding: '2px 6px', borderRadius: 3, background: T.surfaceActive, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.ioc_type}</span>
                    <span style={{ fontSize: '0.66rem', color: isMal ? T.white : T.textMuted, fontFamily: '"SF Mono", ui-monospace, monospace', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.ioc_value}
                    </span>
                    <span style={{
                      fontSize: '0.53rem', padding: '3px 8px', borderRadius: 4,
                      background: `${sc}14`, color: sc, fontWeight: 700,
                      textTransform: 'uppercase', border: `1px solid ${sc}25`,
                      flexShrink: 0, letterSpacing: '0.04em',
                    }}>{t.status}</span>
                  </div>

                  {/* Detection details */}
                  {t.detection_count > 0 && (
                    <div style={{ fontSize: '0.58rem', color: T.textDim, marginTop: 4 }}>
                      Detected by <strong style={{ color: isMal ? T.danger : T.warning }}>{t.detection_count}</strong> out of {t.total_engines} security engines · Source: {t.source}
                    </div>
                  )}

                  {/* What this means */}
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 3 }}>What this means</div>
                    <p style={{ fontSize: '0.62rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>
                      {isMal
                        ? `Multiple security engines have flagged this ${t.ioc_type} as associated with malicious activity. This is a strong indicator of potential threat.`
                        : isSusp
                          ? `Some security engines have flagged this ${t.ioc_type} as potentially suspicious. While not confirmed malicious, it warrants further investigation.`
                          : t.status === 'clean'
                            ? `This ${t.ioc_type} was not flagged by any of the checked security engines. This does not guarantee it is safe, but no known threats were found.`
                            : `Insufficient information was available to assess this ${t.ioc_type}.`
                      }
                    </p>
                  </div>

                  {/* Permalink */}
                  {t.permalink && (
                    <a href={t.permalink} target="_blank" rel="noreferrer" style={{
                      display: 'inline-block', marginTop: 8, fontSize: '0.56rem', color: T.textDim,
                      padding: '4px 10px', borderRadius: T.radiusSm, background: T.bgPanel,
                      border: `1px solid ${T.border}`, textDecoration: 'none', transition: 'border-color 0.15s',
                    }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
                      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                    >
                      View on VirusTotal →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionBlock>

      {/* Related IOCs that were checked */}
      {iocs.length > 0 && ti.length > 0 && (
        <SectionBlock title="Indicators Checked" count={iocs.length}>
          <p style={{ fontSize: '0.62rem', color: T.textDim, lineHeight: 1.5, marginBottom: 10 }}>
            These indicators were extracted from the email and checked against available threat intelligence sources.
          </p>
          <div style={{ maxHeight: 200, overflow: 'auto', borderRadius: T.radius, border: `1px solid ${T.border}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem' }}>
              <thead><tr style={{ background: T.bgPanel }}>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source</th>
                <th style={{ padding: '6px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk</th>
              </tr></thead>
              <tbody>{iocs.map((ioc, i) => (
                <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                  <td style={{ padding: '5px 10px' }}><span style={{ padding: '1px 5px', borderRadius: 3, background: T.surfaceActive, color: T.textDim, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase' }}>{ioc.ioc_type}</span></td>
                  <td style={{ padding: '5px 10px', color: T.textMuted, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: '"SF Mono", ui-monospace, monospace', fontSize: '0.56rem' }}>{ioc.value}</td>
                  <td style={{ padding: '5px 10px', color: T.textFaint }}>{ioc.source || '—'}</td>
                  <td style={{ padding: '5px 10px', color: statusColor(ioc.risk), fontWeight: (ioc.risk === 'malicious' || ioc.risk === 'high') ? 600 : 400, fontSize: '0.58rem' }}>{ioc.risk || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </SectionBlock>
      )}
    </div>
  );
}
