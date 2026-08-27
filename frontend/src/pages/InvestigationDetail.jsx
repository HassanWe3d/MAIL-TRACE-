import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvestigation, getInvestigationGraph, getReportUrl, ApiError } from '../api';
import { T, riskColor, statusColor, card, sectionHead, mono, btnPrimary, btnSecondary } from '../theme';
import AppShell from '../components/AppShell';
import InvestigationGraph from '../components/InvestigationGraph';

function formatDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString();
  } catch { return val; }
}

function Row({ label, value, m, isDate }) {
  const display = isDate ? formatDate(value) : value;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '5px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ minWidth: 92, fontSize: '0.63rem', color: T.textFaint, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.63rem', color: T.textMuted, wordBreak: 'break-all', lineHeight: 1.5, ...(m ? mono : {}) }}>{display || '—'}</span>
    </div>
  );
}

function Auth({ label, result, domain }) {
  const c = statusColor(result);
  const isFail = result === 'fail';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: T.radius, background: T.bgPanel,
      border: `1px solid ${isFail ? `${T.danger}25` : T.border}`,
      transition: 'border-color 0.15s',
    }}>
      <span style={{ fontSize: '0.63rem', color: T.textDim, minWidth: 44, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</span>
      <span style={{
        fontSize: '0.56rem', padding: '2px 8px', borderRadius: 4,
        background: `${c}12`, color: c, fontWeight: 600,
        border: `1px solid ${c}25`, textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>{result || 'unknown'}</span>
      {domain && <span style={{ fontSize: '0.56rem', color: T.textFaint, marginLeft: 'auto', ...mono }}>{domain}</span>}
    </div>
  );
}

function Section({ title, children, count }) {
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={{ ...sectionHead, display: 'flex', alignItems: 'center', gap: 8 }}>
        {title}
        {count != null && <span style={{ fontSize: '0.52rem', fontWeight: 500, color: T.textFaint, background: T.surfaceActive, padding: '1px 6px', borderRadius: 4, fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
      </div>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <p style={{ fontSize: '0.68rem', color: T.textFaint, padding: '16px 0', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.4 }}>{text}</p>;
}

const IOC_C = { url: '#CCC', domain: '#BBB', ip: '#AAA', hash_sha256: '#DDD', hash_sha1: '#CCC', hash_md5: '#BBB', email: '#FFF' };

export default function InvestigationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [graph, setGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null); setNotFound(false);
      const [r, g] = await Promise.allSettled([getInvestigation(id), getInvestigationGraph(id)]);
      if (r.status === 'fulfilled') {
        setData(r.value.data);
        if (r.value.data?.status === 'processing') {
          pollRef.current = setTimeout(() => load(), 3000);
        }
      } else {
        if (r.reason instanceof ApiError && r.reason.status === 404) setNotFound(true);
        else throw r.reason;
      }
      if (g.status === 'fulfilled' && g.value?.data) {
        setGraph(g.value.data);
        setGraphError(false);
      } else {
        setGraphError(true);
      }
      setGraphLoading(false);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setNotFound(true);
      } else {
        setError(e.message);
      }
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); return () => { if (pollRef.current) clearTimeout(pollRef.current); }; }, [load]);

  if (loading && !data) return <AppShell><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: '0.75rem', flexDirection: 'column', gap: 10 }}><div style={{ width: 20, height: 20, border: `2px solid ${T.border}`, borderTopColor: T.white, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /><div>Loading investigation...</div></div></AppShell>;
  if (notFound) return <AppShell><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 40 }}><p style={{ color: T.white, fontSize: '1.3rem', fontWeight: 700, letterSpacing: '0.02em' }}>Investigation not found</p><p style={{ color: T.textDim, fontSize: '0.75rem' }}>This investigation may have been deleted or the ID is invalid.</p><button onClick={() => navigate('/dashboard')} style={btnPrimary}>Back to Dashboard</button></div></AppShell>;
  if (error) return <AppShell><div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14, padding: 40 }}><p style={{ color: T.textMuted, fontSize: '0.82rem', textAlign: 'center', maxWidth: 400, lineHeight: 1.5 }}>{error}</p><div style={{ display: 'flex', gap: 10 }}><button onClick={load} style={btnPrimary}>Retry</button><button onClick={() => navigate('/dashboard')} style={btnSecondary}>Dashboard</button></div></div></AppShell>;
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
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ ...btnSecondary, padding: '5px 10px', fontSize: '0.68rem' }}>← Dashboard</button>
        <div style={{ width: 1, height: 14, background: T.border }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.subject || data.filename || 'Investigation'}</div>
        </div>
        <a href={getReportUrl(id)} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px' }}>↓ PDF</a>
      </header>

      <main style={{ padding: '20px 28px', flex: 1, animation: 'fadeIn 0.15s ease' }}>
        {/* Processing Banner */}
        {data.status === 'processing' && (
          <div style={{ ...card, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, borderColor: T.border, background: T.bgPanel }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: T.warning, animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: '0.73rem', color: T.textMuted, fontWeight: 500 }}>Analysis in progress — this page will update automatically.</span>
          </div>
        )}
        {data.status === 'failed' && (
          <div style={{ ...card, padding: '14px 18px', marginBottom: 16, borderColor: `${T.danger}30`, background: '#0C0808' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.73rem', color: T.danger, fontWeight: 600 }}>Investigation failed</span>
              <button onClick={load} style={{ ...btnSecondary, marginLeft: 'auto', padding: '4px 12px', fontSize: '0.63rem' }}>Retry</button>
            </div>
            {data.error_message && <p style={{ fontSize: '0.6rem', color: T.textFaint, marginTop: 6 }}>{data.error_message}</p>}
          </div>
        )}

        {/* Risk Banner */}
        <div style={{
          ...card, padding: '16px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
          borderColor: `${rc}30`,
          background: `linear-gradient(135deg, ${T.surface} 0%, ${T.bgPanel} 100%)`,
        }}>
          <div style={{
            width: 46, height: 46, borderRadius: T.radius, background: T.bgPanel,
            border: `1.5px solid ${rc}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.15rem', fontWeight: 700, color: rc, flexShrink: 0,
            fontVariantNumeric: 'tabular-nums',
          }}>{data.risk_score ?? 0}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: rc, letterSpacing: '0.04em' }}>{data.risk_level || 'UNKNOWN'} RISK</div>
            <div style={{ fontSize: '0.62rem', color: T.textDim, marginTop: 2 }}>{data.classification || ai.classification || 'Unknown'}{data.ai_confidence != null ? ` · ${(data.ai_confidence * 100).toFixed(0)}% confidence` : ''}</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: '0.58rem', color: T.textFaint, lineHeight: 1.6 }}>
            {data.sender && <div style={{ color: T.textMuted }}>{data.sender}</div>}
            {data.date && <div>{new Date(data.date).toLocaleDateString()}</div>}
          </div>
        </div>

        {/* Two columns */}
        <div className="detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Section title="Email Information">
              <Row label="From" value={meta.from_address || data.sender} />
              <Row label="To" value={(meta.to_addresses || []).join(', ')} />
              <Row label="Subject" value={meta.subject || data.subject} />
              <Row label="Date" value={meta.date || data.date} isDate />
              <Row label="Reply-To" value={meta.reply_to} />
              <Row label="Return-Path" value={meta.return_path} />
              <Row label="Message-ID" value={meta.message_id} m />
            </Section>

            <Section title="Authentication">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Auth label="SPF" result={auth.spf_result} domain={auth.spf_domain} />
                <Auth label="DKIM" result={auth.dkim_result} domain={auth.dkim_domain} />
                <Auth label="DMARC" result={auth.dmarc_result} domain={auth.dmarc_policy} />
              </div>
              {auth.domain_mismatch && <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: T.radius, background: '#0C0808', border: `1px solid ${T.warning}25`, color: T.warning, fontSize: '0.63rem', lineHeight: 1.5 }}>⚠ From ({auth.from_domain}) ≠ Return-Path ({auth.return_path_domain})</div>}
              {auth.reply_to_mismatch && <div style={{ marginTop: 5, padding: '8px 12px', borderRadius: T.radius, background: '#0C0808', border: `1px solid ${T.warning}25`, color: T.warning, fontSize: '0.63rem', lineHeight: 1.5 }}>⚠ Reply-To ({auth.reply_to}) ≠ From ({auth.from_address})</div>}
            </Section>

            <Section title="IP Geolocation">
              {ips.length === 0 ? <Empty text="No IP enrichment available" /> : ips.map((ip, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 6 }}>
                  <div style={{ fontSize: '0.7rem', color: T.white, ...mono }}>{ip.ip_address}</div>
                  <div style={{ fontSize: '0.58rem', color: T.textDim, marginTop: 3 }}>{[ip.city, ip.region, ip.country].filter(Boolean).join(', ')}{ip.isp ? ` · ${ip.isp}` : ''}{ip.asn ? ` · ${ip.asn}` : ''}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 4 }}>
                    {ip.is_hosting && <span style={{ fontSize: '0.48rem', padding: '1px 6px', borderRadius: 3, background: `${T.warning}10`, color: T.warning, border: `1px solid ${T.warning}20`, fontWeight: 600, letterSpacing: '0.04em' }}>HOSTING</span>}
                    {ip.is_datacenter && <span style={{ fontSize: '0.48rem', padding: '1px 6px', borderRadius: 3, background: `${T.warning}10`, color: T.warning, border: `1px solid ${T.warning}20`, fontWeight: 600, letterSpacing: '0.04em' }}>DATACENTER</span>}
                  </div>
                </div>
              ))}
            </Section>

            <Section title="AI Assessment">
              {!ai.summary && !ai.error ? <Empty text="No AI analysis available" /> : ai.error ? (
                <div style={{ padding: '10px 14px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}` }}>
                  <p style={{ fontSize: '0.68rem', color: T.textMuted, fontWeight: 500, marginBottom: 3 }}>AI Assessment — Temporarily unavailable</p>
                  {ai.limitations?.length > 0 && <div style={{ marginTop: 6 }}>{ai.limitations.map((l, i) => <p key={i} style={{ fontSize: '0.58rem', color: T.textFaint, marginTop: 2, lineHeight: 1.4 }}>• {l}</p>)}</div>}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {ai.classification && <div style={{ padding: '5px 10px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${statusColor(ai.classification === 'legitimate' ? 'pass' : ai.classification === 'unknown' ? 'unknown' : 'fail')}25` }}><div style={{ fontSize: '0.48rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Classification</div><div style={{ fontSize: '0.72rem', color: statusColor(ai.classification === 'legitimate' ? 'pass' : ai.classification === 'unknown' ? 'unknown' : 'fail'), fontWeight: 600, textTransform: 'capitalize', marginTop: 1 }}>{ai.classification}</div></div>}
                    {ai.severity && <div style={{ padding: '5px 10px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}` }}><div style={{ fontSize: '0.48rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Severity</div><div style={{ fontSize: '0.72rem', color: riskColor(ai.severity?.toUpperCase()), fontWeight: 600, textTransform: 'capitalize', marginTop: 1 }}>{ai.severity}</div></div>}
                    {ai.confidence != null && <div style={{ padding: '5px 10px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}` }}><div style={{ fontSize: '0.48rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Confidence</div><div style={{ fontSize: '0.72rem', color: T.white, fontWeight: 600, marginTop: 1 }}>{(ai.confidence * 100).toFixed(0)}%</div></div>}
                  </div>
                  {ai.summary && <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, marginBottom: 12 }}>{ai.summary}</p>}
                  {ai.reasoning?.length > 0 && <div style={{ marginBottom: 12 }}><p style={{ fontSize: '0.56rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Reasoning</p>{ai.reasoning.map((r, i) => <div key={i} style={{ padding: '5px 8px', borderRadius: T.radius, background: T.bgPanel, marginBottom: 3, fontSize: '0.63rem', color: T.textMuted, lineHeight: 1.5 }}>{typeof r === 'string' ? r : r.evidence || JSON.stringify(r)}</div>)}</div>}
                  {ai.threat_categories?.length > 0 && <div style={{ marginBottom: 12 }}><p style={{ fontSize: '0.56rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Threat Categories</p><div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>{ai.threat_categories.map((c, i) => <span key={i} style={{ padding: '2px 8px', borderRadius: 4, background: T.surfaceActive, color: T.textMuted, fontSize: '0.56rem', fontWeight: 600, border: `1px solid ${T.border}` }}>{c}</span>)}</div></div>}
                  {ai.social_engineering_detected && <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: T.radius, background: '#0C0808', border: `1px solid ${T.warning}25`, fontSize: '0.63rem', color: T.warning, lineHeight: 1.4 }}>⚠ Social Engineering Detected{ai.social_engineering_confidence != null ? ` · ${(ai.social_engineering_confidence * 100).toFixed(0)}%` : ''}</div>}
                  {ai.recommended_actions?.length > 0 && <div style={{ marginBottom: 10 }}><p style={{ fontSize: '0.56rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Recommended Actions</p>{ai.recommended_actions.map((a, i) => <div key={i} style={{ fontSize: '0.63rem', color: T.textMuted, padding: '3px 0', display: 'flex', gap: 5, lineHeight: 1.5 }}><span style={{ color: T.textFaint }}>›</span>{a}</div>)}</div>}
                  {ai.limitations?.length > 0 && <div><p style={{ fontSize: '0.53rem', color: T.textFaint, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>Limitations</p>{ai.limitations.map((l, i) => <p key={i} style={{ fontSize: '0.58rem', color: T.textFaint, lineHeight: 1.4 }}>• {l}</p>)}</div>}
                </div>
              )}
            </Section>
          </div>

          {/* RIGHT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <Section title="Risk Score">
              <div style={{ display: 'flex', gap: 10, marginBottom: 10, fontSize: '0.62rem', color: T.textDim, flexWrap: 'wrap' }}>
                <span>Deterministic: <strong style={{ color: T.text }}>{risk.deterministic_score ?? '—'}</strong></span>
                <span style={{ color: T.textFaint }}>·</span>
                <span>AI SE: <strong style={{ color: T.text }}>+{risk.ai_social_engineering_score ?? 0}</strong></span>
                <span style={{ color: T.textFaint }}>·</span>
                <span>Final: <strong style={{ color: rc }}>{risk.final_score ?? data.risk_score}</strong></span>
              </div>
              {signals.length > 0 ? signals.map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: T.radiusSm, background: T.bgPanel, fontSize: '0.63rem', marginBottom: 3 }}>
                  <span style={{ fontWeight: 700, color: T.white, minWidth: 26, fontSize: '0.58rem', fontVariantNumeric: 'tabular-nums' }}>+{s.weight}</span>
                  <span style={{ color: T.textMuted, flex: 1 }}>{s.name}</span>
                  {s.evidence && <span style={{ color: T.textFaint, fontSize: '0.53rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.evidence}</span>}
                </div>
              )) : <Empty text="No risk signals" />}
            </Section>

            <Section title="Indicators of Compromise" count={iocs.length}>
              {iocs.length === 0 ? <Empty text="No IOCs extracted" /> : (
                <div style={{ maxHeight: 280, overflow: 'auto', borderRadius: T.radius, border: `1px solid ${T.border}` }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.62rem' }}>
                    <thead><tr style={{ background: T.bgPanel }}>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.53rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Type</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.53rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</th>
                      <th style={{ padding: '7px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.53rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Risk</th>
                    </tr></thead>
                    <tbody>{iocs.map((ioc, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                        <td style={{ padding: '5px 10px' }}><span style={{ padding: '1px 6px', borderRadius: 3, background: T.surfaceActive, color: IOC_C[ioc.ioc_type] || T.textDim, fontWeight: 600, fontSize: '0.53rem', textTransform: 'uppercase' }}>{ioc.ioc_type}</span></td>
                        <td style={{ padding: '5px 10px', color: T.textMuted, maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...mono, fontSize: '0.58rem' }}>{ioc.value}</td>
                        <td style={{ padding: '5px 10px', color: statusColor(ioc.risk), fontSize: '0.58rem', fontWeight: ioc.risk === 'malicious' || ioc.risk === 'high' ? 600 : 400 }}>{ioc.risk}</td>
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
                  <div key={i} style={{
                    padding: '10px 12px', borderRadius: T.radius, background: T.bgPanel,
                    border: `1px solid ${bold ? `${T.danger}25` : T.border}`, marginBottom: 5,
                    transition: 'border-color 0.15s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{t.ioc_type}</span>
                      <span style={{ fontSize: '0.63rem', color: bold ? T.white : T.textMuted, ...mono, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.ioc_value?.substring(0, 50)}</span>
                      <span style={{ fontSize: '0.53rem', padding: '2px 7px', borderRadius: 4, background: `${sc}12`, color: sc, fontWeight: 600, textTransform: 'uppercase', border: `1px solid ${sc}25`, flexShrink: 0, letterSpacing: '0.04em' }}>{t.status}</span>
                    </div>
                    {t.detection_count > 0 && <div style={{ fontSize: '0.53rem', color: T.textFaint, marginTop: 3 }}>{t.detection_count}/{t.total_engines} engines · {t.source}</div>}
                  </div>
                );
              })}
            </Section>

            <Section title="Attachments" count={atts.length}>
              {atts.length === 0 ? <Empty text="No attachments detected" /> : atts.map((a, i) => (
                <div key={i} style={{ padding: '10px 12px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 5 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.7rem', color: T.white, fontWeight: 500 }}>{a.filename}</span>
                    <span style={{ fontSize: '0.53rem', color: T.textFaint }}>{a.mime_type}</span>
                  </div>
                  <div style={{ fontSize: '0.53rem', color: T.textFaint, marginTop: 3 }}>{a.size != null ? `${(a.size / 1024).toFixed(1)} KB` : 'Unknown size'}</div>
                  {a.sha256 && <div style={{ fontSize: '0.48rem', color: T.textFaint, marginTop: 2, ...mono }}>SHA-256: {a.sha256.substring(0, 32)}…</div>}
                </div>
              ))}
            </Section>

            {hops.length > 0 && (
              <Section title="Received Hops" count={hops.length}>
                <div style={{ maxHeight: 180, overflow: 'auto' }}>
                  {hops.map((h, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', fontSize: '0.56rem', ...mono, color: T.textFaint }}>
                      <span style={{ width: 16, height: 16, borderRadius: '50%', background: i === 0 ? T.surfaceActive : T.bgPanel, border: `1px solid ${i === 0 ? T.borderHover : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.44rem', color: T.textDim, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
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
        <div style={{ marginTop: 16 }}>
          <Section title="Relationship Graph">
            <InvestigationGraph
              graph={graph}
              loading={graphLoading}
              error={graphError}
              onRetry={() => {
                setGraphLoading(true);
                setGraphError(false);
                getInvestigationGraph(id).then(g => { setGraph(g?.data || null); setGraphLoading(false); }).catch(() => { setGraphError(true); setGraphLoading(false); });
              }}
            />
          </Section>
        </div>
      </main>
    </AppShell>
  );
}
