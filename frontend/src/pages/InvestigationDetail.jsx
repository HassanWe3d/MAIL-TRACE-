import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { getInvestigation, getInvestigationGraph, ApiError } from '../api';
import { T, riskColor, btnPrimary, btnSecondary } from '../theme';
import AppShell from '../components/AppShell';
import {
  OverviewTab, EmailHeadersTab, AuthenticationTab, RoutingTab,
  ThreatIntelTab, IOCsTab, GraphTab, AIAnalysisTab, ReportTab,
} from '../components/tabs';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'email', label: 'Email & Headers' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'routing', label: 'Routing' },
  { id: 'threat-intelligence', label: 'Threat Intelligence' },
  { id: 'iocs', label: 'IOCs' },
  { id: 'graph', label: 'Graph' },
  { id: 'ai-analysis', label: 'AI Analysis' },
  { id: 'report', label: 'Report' },
];

function formatDate(val) {
  if (!val) return null;
  try {
    const d = new Date(val);
    return isNaN(d.getTime()) ? val : d.toLocaleString();
  } catch { return val; }
}

export default function InvestigationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [graph, setGraph] = useState(null);
  const [graphLoading, setGraphLoading] = useState(true);
  const [graphError, setGraphError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const pollRef = useRef(null);

  const activeTab = useMemo(() => {
    const tab = searchParams.get('tab');
    return TABS.find(t => t.id === tab) ? tab : 'overview';
  }, [searchParams]);

  const setTab = useCallback((tabId) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tabId);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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

  return (
    <AppShell>
      {/* Header */}
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ ...btnSecondary, padding: '5px 10px', fontSize: '0.68rem' }}>← Dashboard</button>
        <div style={{ width: 1, height: 14, background: T.border }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: T.white, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{data.subject || data.filename || 'Investigation'}</div>
        </div>
        {/* Risk badge in header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px',
          borderRadius: T.radiusSm, background: T.bgPanel, border: `1px solid ${T.border}`,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: rc, boxShadow: `0 0 6px ${rc}40` }} />
          <span style={{ fontSize: '0.56rem', color: rc, fontWeight: 700, letterSpacing: '0.04em' }}>{data.risk_level || 'UNKNOWN'}</span>
          <span style={{ fontSize: '0.53rem', color: T.textFaint, fontVariantNumeric: 'tabular-nums' }}>{data.risk_score ?? 0}</span>
        </div>
        <a href={`/api/investigations/${id}/report`} target="_blank" rel="noreferrer" style={{ ...btnSecondary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 12px', fontSize: '0.65rem' }}>↓ PDF</a>
      </header>

      {/* Tab Navigation */}
      <nav style={{
        borderBottom: `1px solid ${T.border}`, background: T.bgAlt,
        padding: '0 28px', display: 'flex', alignItems: 'center', gap: 0,
        overflowX: 'auto', overflowY: 'hidden', scrollbarWidth: 'none',
      }} role="tablist">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(tab.id)}
              style={{
                padding: '12px 16px', fontSize: '0.64rem', fontWeight: isActive ? 600 : 500,
                color: isActive ? T.white : T.textDim,
                background: 'transparent', border: 'none', cursor: 'pointer',
                borderBottom: `2px solid ${isActive ? T.white : 'transparent'}`,
                transition: 'all 0.15s ease', whiteSpace: 'nowrap', flexShrink: 0,
                fontFamily: 'inherit', letterSpacing: isActive ? '0.02em' : '0',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = T.textMuted; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = T.textDim; }}
            >{tab.label}</button>
          );
        })}
      </nav>

      <main style={{ padding: '20px 28px', flex: 1, animation: 'fadeIn 0.15s ease' }}>
        {/* Processing Banner */}
        {data.status === 'processing' && (
          <div style={{ ...card, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, background: T.bgPanel }}>
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

        {/* Tab Content */}
        <div role="tabpanel">
          {activeTab === 'overview' && <OverviewTab data={data} />}
          {activeTab === 'email' && <EmailHeadersTab data={data} />}
          {activeTab === 'authentication' && <AuthenticationTab data={data} />}
          {activeTab === 'routing' && <RoutingTab data={data} />}
          {activeTab === 'threat-intelligence' && <ThreatIntelTab data={data} />}
          {activeTab === 'iocs' && <IOCsTab data={data} />}
          {activeTab === 'graph' && (
            <GraphTab
              graph={graph}
              loading={graphLoading}
              error={graphError}
              onRetry={() => {
                setGraphLoading(true);
                setGraphError(false);
                getInvestigationGraph(id).then(g => { setGraph(g?.data || null); setGraphLoading(false); }).catch(() => { setGraphError(true); setGraphLoading(false); });
              }}
            />
          )}
          {activeTab === 'ai-analysis' && <AIAnalysisTab data={data} />}
          {activeTab === 'report' && <ReportTab data={data} />}
        </div>
      </main>
    </AppShell>
  );
}

const card = {
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius,
};
