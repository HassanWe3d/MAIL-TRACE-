import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvestigation, getInvestigationGraph, getReportUrl } from '../api';
import { T, riskColor, statusColor, card, sectionHead, mono } from '../theme';
import AppShell from '../components/AppShell';
import InvestigationGraph from '../components/InvestigationGraph';

function Row({ label, value, m }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '4px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ minWidth: 90, fontSize: '0.65rem', color: T.textFaint, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.65rem', color: T.textMuted, wordBreak: 'break-all', ...(m ? mono : {}) }}>{value || '—'}</span>
    </div>
  );
}

function Auth({ label, result, domain }) {
  const c = statusColor(result);
  const isPass = result === 'pass';
  const isFail = result === 'fail';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${isFail ? '#F8717130' : T.border}` }}>
      <span style={{ fontSize: '0.65rem', color: T.textFaint, minWidth: 42, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ fontSize: '0.58rem', padding: '1px 7px', borderRadius: 3, background: `${c}15`, color: c, fontWeight: 600, border: `1px solid ${c}30`, textTransform: 'uppercase' }}>{result || 'unknown'}</span>
      {domain && <span style={{ fontSize: '0.58rem', color: T.textFaint, marginLeft: 'auto', ...mono }}>{domain}</span>}
    </div>
  );
}

function Section({ title, children, count }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ ...sectionHead, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title}
        {count != null && <span style={{ fontSize: '0.55rem', fontWeight: 500, color: T.textFaint, background: '#111', padding: '1px 5px', borderRadius: 3 }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p style={{ fontSize: '0.68rem', color: T.textFaint, padding: '14px 0', textAlign: 'center', fontStyle: 'italic' }}>{text}</p>;
}

const IOC_C = { url: '#CCC', domain: '#BBB', ip: '#AAA', hash_sha256: '#DDD', hash_sha1: '#CCC', hash_md5: '#BBB', email: '#FFF' };

export default function InvestigationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [graph, setGraph] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const [r, g] = await Promise.all([getInvestigation(id), getInvestigationGraph(id).catch(() => null)]);
      setData(r.data);
      if (g?.data) setGraph(g.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <AppShell><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: '0.75rem' }}>Loading investigation...</div></AppShell>;
  if (error) return <AppShell><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, padding: 40 }}><p style={{ color: T.textMuted, fontSize: '0.8rem' }}>{error}</p><button onClick={() => navigate('/dashboard')} style={{ padding: '6px 14px', borderRadius: T.radius, background: T.white, color: T.bg, border: 'none', cursor: 'pointer', fontSize: '0.7rem' }}>Dashboard</button></div></AppShell>;
  if (!data) return null;

  const rc = riskColor(data.risk_level);
  const auth = data.authentication_results || {};
  const risk = data.risk_score_detail || {};
  const ai = data.ai_analysis || {};
  const iocs = data.iocs || [];
  const meta = data.email_metadata || {};
  const signals = risk.signals || [];
  const ips = data.ip_enrichments || [];
  const ti = data.threat_intel_results || [];
  const hops = data.received_hops || [];
  const atts = data.attachments || [];

  return (
    <AppShell>
      {/* Header */}
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500 }}>← Dashboard</button>
        <div style={{ width: 1, height: 16, background: T.border }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.subject || data.filename || 'Investigation'}</div>
        </div>
        <a href={getReportUrl(id)} target="_blank" rel="noreferrer" style={{ padding: '5px 12px', borderRadius: T.radius, background: 'transparent', color: T.textMuted, border: `1px solid ${T.border}`, textDecoration: 'none', fontSize: '0.65rem', fontWeight: 500, whiteSpace: 'nowrap', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = T.white; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMuted; }}>↓ PDF Report</a>
      </header>

      <main style={{ padding: '18px 24px', flex: 1 }}>
        {/* Risk Banner */}
        <div style={{ ...card, padding: '14px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, borderColor: `${rc}40` }}>
          <div style={{ width: 42, height: 42, borderRadius: 6, background: '#111', border: `1px solid ${rc}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 700, color: rc, flexShrink: 0 }}>{data.risk_score ?? 0}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: rc, letterSpacing: '0.04em' }}>{data.risk_level || 'UNKNOWN'} RISK</div>
            <div style={{ fontSize: '0.62rem', color: T.textDim, marginTop: 1 }}>{data.classification || ai.classification || 'Unknown'}{data.ai_confidence != null ? ` · ${(data.ai_confidence * 100).toFixed(0)}%` : ''}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.6rem', color: T.textFaint }}>
            {data.sender && <div>{data.sender}</div>}
            {data.date && <div>{new Date(data.date).toLocaleDateString()}</div>}
          </div>
        </div>

        {/* Two columns */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <Section title="Email Information">
              <Row label="From" value={meta.from_address || data.sender} />
              <Row label="To" value={(meta.to_addresses || []).join(', ')} />
              <Row label="Subject" value={meta.subject || data.subject} />
              <Row label="Date" value={meta.date || data.date} />
              <Row label="Reply-To" value={meta.reply_to} />
              <Row label="Return-Path" value={meta.return_path} />
              <Row label="Message-ID" value={meta.message_id} m />
            </Section>

            <Section title="Authentication">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Auth label="SPF" result={auth.spf_result} domain={auth.spf_domain} />
                <Auth label="DKIM" result={auth.dkim_result} domain={auth.dkim_domain} />
                <Auth label="DMARC" result={auth.dmarc_result} domain={auth.dmarc_policy} />
              </div>
              {auth.domain_mismatch && <div style={{ marginTop: 6, padding: '6px 9px', borderRadius: T.radius, background: '#111', border: `1px solid ${T.warning}30`, color: T.warning, fontSize: '0.65rem' }}>⚠ From ({auth.from_domain}) ≠ Return-Path ({auth.return_path_domain})</div>}
              {auth.reply_to_mismatch && <div style={{ marginTop: 4, padding: '6px 9px', borderRadius: T.radius, background: '#111', border: `1px solid ${T.warning}30`, color: T.warning, fontSize: '0.65rem' }}>⚠ Reply-To ({auth.reply_to}) ≠ From ({auth.from_address})</div>}
            </Section>

            <Section title="IP Geolocation">
              {ips.length === 0 ? <Empty text="No IP enrichment available" /> : ips.map((ip, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${T.border}`, marginBottom: 5 }}>
                  <div style={{ fontSize: '0.7rem', color: T.white, ...mono }}>{ip.ip_address}</div>
                  <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: 2 }}>{[ip.city, ip.region, ip.country].filter(Boolean).join(', ')}{ip.isp ? ` · ${ip.isp}` : ''}{ip.asn ? ` · ${ip.asn}` : ''}</div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3 }}>
                    {ip.is_hosting && <span style={{ fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3, background: `${T.warning}10`, color: T.warning, border: `1px solid ${T.warning}25`, fontWeight: 600 }}>HOSTING</span>}
                    {ip.is_datacenter && <span style={{ fontSize: '0.5rem', padding: '1px 5px', borderRadius: 3, background: `${T.warning}10`, color: T.warning, border: `1px solid ${T.warning}25`, fontWeight: 600 }}>DATACENTER</span>}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="AI Assessment">
              {!ai.summary && !ai.error ? <Empty text="No AI analysis available" /> : ai.error ? (
                <div style={{ padding: '8px 12px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: '0.68rem', color: T.textMuted, fontWeight: 500, marginBottom: 2 }}>AI Assessment — Temporarily unavailable</p>
                  {ai.limitations?.length > 0 && <div style={{ marginTop: 4 }}>{ai.limitations.map((l, i) => <p key={i} style={{ fontSize: '0.6rem', color: T.textFaint, marginTop: 1 }}>• {l}</p>)}</div>}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
                    {ai.classification && <div style={{ padding: '4px 9px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${statusColor(ai.classification === 'legitimate' ? 'pass' : ai.classification === 'unknown' ? 'unknown' : 'fail')}30` }}><div style={{ fontSize: '0.5rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Classification</div><div style={{ fontSize: '0.72rem', color: statusColor(ai.classification === 'legitimate' ? 'pass' : ai.classification === 'unknown' ? 'unknown' : 'fail'), fontWeight: 600, textTransform: 'capitalize' }}>{ai.classification}</div></div>}
                    {ai.severity && <div style={{ padding: '4px 9px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${T.border}` }}><div style={{ fontSize: '0.5rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Severity</div><div style={{ fontSize: '0.72rem', color: riskColor(ai.severity?.toUpperCase()), fontWeight: 600, textTransform: 'capitalize' }}>{ai.severity}</div></div>}
                    {ai.confidence != null && <div style={{ padding: '4px 9px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${T.border}` }}><div style={{ fontSize: '0.5rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</div><div style={{ fontSize: '0.72rem', color: T.white, fontWeight: 600 }}>{(ai.confidence * 100).toFixed(0)}%</div></div>}
                  </div>
                  {ai.summary && <p style={{ fontSize: '0.7rem', color: T.textMuted, lineHeight: 1.5, marginBottom: 10 }}>{ai.summary}</p>}
                  {ai.reasoning?.length > 0 && <div style={{ marginBottom: 10 }}><p style={{ fontSize: '0.58rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Reasoning</p>{ai.reasoning.map((r, i) => <div key={i} style={{ padding: '4px 7px', borderRadius: T.radius, background: '#0A0A0A', marginBottom: 2, fontSize: '0.65rem', color: T.textMuted }}>{typeof r === 'string' ? r : r.evidence || JSON.stringify(r)}</div>)}</div>}
                  {ai.threat_categories?.length > 0 && <div style={{ marginBottom: 10 }}><p style={{ fontSize: '0.58rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Threat Categories</p><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{ai.threat_categories.map((c, i) => <span key={i} style={{ padding: '2px 6px', borderRadius: 3, background: '#1A1A1A', color: T.textMuted, fontSize: '0.58rem', fontWeight: 600, border: `1px solid ${T.border}` }}>{c}</span>)}</div></div>}
                  {ai.social_engineering_detected && <div style={{ marginBottom: 10, padding: '6px 9px', borderRadius: T.radius, background: '#111', border: `1px solid ${T.warning}30`, fontSize: '0.65rem', color: T.warning }}>⚠ Social Engineering Detected{ai.social_engineering_confidence != null ? ` · ${(ai.social_engineering_confidence * 100).toFixed(0)}%` : ''}</div>}
                  {ai.recommended_actions?.length > 0 && <div style={{ marginBottom: 8 }}><p style={{ fontSize: '0.58rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Recommended Actions</p>{ai.recommended_actions.map((a, i) => <div key={i} style={{ fontSize: '0.65rem', color: T.textMuted, padding: '2px 0', display: 'flex', gap: 4 }}><span style={{ color: T.textFaint }}>›</span>{a}</div>)}</div>}
                  {ai.limitations?.length > 0 && <div><p style={{ fontSize: '0.55rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 2 }}>Limitations</p>{ai.limitations.map((l, i) => <p key={i} style={{ fontSize: '0.6rem', color: T.textFaint }}>• {l}</p>)}</div>}
                </div>
              )}
            </Section>
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <Section title="Risk Score">
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, fontSize: '0.62rem', color: T.textDim }}>
                <span>Deterministic: <strong style={{ color: T.text }}>{risk.deterministic_score ?? '—'}</strong></span>
                <span style={{ color: T.textFaint }}>·</span>
                <span>AI SE: <strong style={{ color: T.text }}>+{risk.ai_social_engineering_score ?? 0}</strong></span>
                <span style={{ color: T.textFaint }}>·</span>
                <span>Final: <strong style={{ color: rc }}>{risk.final_score ?? data.risk_score}</strong></span>
              </div>
              {signals.length > 0 ? signals.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 7px', borderRadius: T.radius, background: '#0A0A0A', fontSize: '0.65rem', marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, color: T.white, minWidth: 24, fontSize: '0.6rem' }}>+{s.weight}</span>
                  <span style={{ color: T.textMuted, flex: 1 }}>{s.name}</span>
                  {s.evidence && <span style={{ color: T.textFaint, fontSize: '0.55rem', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.evidence}</span>}
                </div>
              )) : <Empty text="No risk signals" />}
            </Section>

            <Section title="Indicators of Compromise" count={iocs.length}>
              {iocs.length === 0 ? <Empty text="No IOCs extracted" /> : (
                <div style={{ maxHeight: 260, overflow: 'auto', borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.62rem' }}>
                    <thead><tr style={{ background: '#0A0A0A' }}>
                      <th style={{ padding: '5px 7px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                      <th style={{ padding: '5px 7px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Value</th>
                      <th style={{ padding: '5px 7px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.55rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Risk</th>
                    </tr></thead>
                    <tbody>{iocs.map((ioc, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: '4px 7px' }}><span style={{ padding: '1px 5px', borderRadius: 3, background: '#111', color: IOC_C[ioc.ioc_type] || T.textDim, fontWeight: 600, fontSize: '0.55rem', textTransform: 'uppercase' }}>{ioc.ioc_type}</span></td>
                        <td style={{ padding: '4px 7px', color: T.textMuted, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...mono, fontSize: '0.58rem' }}>{ioc.value}</td>
                        <td style={{ padding: '4px 7px', color: statusColor(ioc.risk), fontSize: '0.58rem', fontWeight: ioc.risk === 'malicious' || ioc.risk === 'high' ? 600 : 400 }}>{ioc.risk}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Threat Intelligence" count={ti.length}>
              {ti.length === 0 ? <Empty text="No threat intel results" /> : ti.map((t, i) => {
                const sc = statusColor(t.status);
                const bold = t.status === 'malicious';
                return (
                  <div key={i} style={{ padding: '8px 10px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${bold ? `${T.danger}30` : T.border}`, marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: '0.55rem', color: T.textFaint, textTransform: 'uppercase' }}>{t.ioc_type}</span>
                      <span style={{ fontSize: '0.65rem', color: bold ? T.white : T.textMuted, ...mono, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ioc_value?.substring(0, 50)}</span>
                      <span style={{ fontSize: '0.55rem', padding: '1px 6px', borderRadius: 3, background: `${sc}15`, color: sc, fontWeight: 600, textTransform: 'uppercase', border: `1px solid ${sc}30`, flexShrink: 0 }}>{t.status}</span>
                    </div>
                    {t.detection_count > 0 && <div style={{ fontSize: '0.55rem', color: T.textFaint, marginTop: 2 }}>{t.detection_count}/{t.total_engines} engines · {t.source}</div>}
                  </div>
                );
              })}
            </Section>

            <Section title="Attachments" count={atts.length}>
              {atts.length === 0 ? <Empty text="No attachments detected" /> : atts.map((a, i) => (
                <div key={i} style={{ padding: '8px 10px', borderRadius: T.radius, background: '#0A0A0A', border: `1px solid ${T.border}`, marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.7rem', color: T.white, fontWeight: 500 }}>{a.filename}</span>
                    <span style={{ fontSize: '0.55rem', color: T.textFaint }}>{a.mime_type}</span>
                  </div>
                  <div style={{ fontSize: '0.55rem', color: T.textFaint, marginTop: 1 }}>{(a.size / 1024).toFixed(1)} KB</div>
                  {a.sha256 && <div style={{ fontSize: '0.5rem', color: T.textFaint, marginTop: 1, ...mono }}>SHA-256: {a.sha256.substring(0, 32)}…</div>}
                </div>
              ))}
            </Section>

            {hops.length > 0 && (
              <Section title="Received Hops" count={hops.length}>
                <div style={{ maxHeight: 160, overflow: 'auto' }}>
                  {hops.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '3px 0', fontSize: '0.58rem', ...mono, color: T.textFaint }}>
                      <span style={{ width: 14, height: 14, borderRadius: '50%', background: i === 0 ? '#333' : '#111', border: `1px solid ${i === 0 ? '#555' : '#222'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.45rem', color: T.textDim, flexShrink: 0 }}>{i + 1}</span>
                      <span style={{ color: T.textMuted }}>{h.source_hostname || h.source_ip || '?'}</span>
                      <span style={{ color: T.textFaint }}>→</span>
                      <span style={{ color: T.textMuted }}>{h.destination_hostname || h.destination_ip || '?'}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>

        {/* Graph */}
        {graph && graph.nodes?.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Section title="Relationship Graph">
              <InvestigationGraph graph={graph} />
            </Section>
          </div>
        )}
      </main>
    </AppShell>
  );
}
