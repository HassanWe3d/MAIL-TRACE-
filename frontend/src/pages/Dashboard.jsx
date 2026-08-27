import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInvestigations, ApiError } from '../api';
import { T, riskColor, card, btnPrimary } from '../theme';
import AppShell from '../components/AppShell';

function Badge({ level, score }) {
  const c = riskColor(level);
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.56rem', fontWeight: 600, background: `${c}14`, color: c, border: `1px solid ${c}25`, whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
      {level || 'UNKNOWN'}{score != null ? ` (${score})` : ''}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ ...card, padding: '14px 16px', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
      onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
    >
      <div style={{ fontSize: '0.52rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.3rem', fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const res = await listInvestigations();
      const d = res.data || {};
      setItems(d.items || []);
      setTotal(d.total || 0);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : (e.message?.includes('fetch') ? 'Backend unavailable. Check your connection and try again.' : e.message));
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = {
    total,
    critical: items.filter(i => i.risk_level === 'CRITICAL').length,
    high: items.filter(i => i.risk_level === 'HIGH').length,
    processing: items.filter(i => i.status === 'processing').length,
  };

  return (
    <AppShell>
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 28px', display: 'flex', alignItems: 'center' }}>
        <h1 style={{ fontSize: '0.82rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.04em' }}>Dashboard</h1>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/investigations/new')} style={btnPrimary}>+ New</button>
      </header>

      <main style={{ padding: '24px 28px', flex: 1, animation: 'fadeIn 0.2s ease' }}>
        {/* Stats */}
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Total" value={s.total} color={T.white} />
          <StatCard label="Critical" value={s.critical} color={T.danger} />
          <StatCard label="High" value={s.high} color={T.warning} />
          <StatCard label="Processing" value={s.processing} color={T.textDim} />
        </div>

        {/* List */}
        <div style={card}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '0.7rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Recent Investigations</h2>
            <span style={{ fontSize: '0.56rem', color: T.textFaint }}>{total} total</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: T.textDim, fontSize: '0.75rem' }}>
              <div style={{ width: 20, height: 20, border: `2px solid ${T.border}`, borderTopColor: T.white, borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 10px' }} />
              Loading investigations...
            </div>
          ) : error ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <p style={{ color: T.textMuted, fontSize: '0.78rem', marginBottom: 12 }}>{error}</p>
              <button onClick={load} style={btnPrimary}>Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: T.textDim, fontSize: '0.82rem', marginBottom: 12 }}>No investigations yet</p>
              <button onClick={() => navigate('/investigations/new')} style={btnPrimary}>Upload your first .eml file</button>
            </div>
          ) : (
            items.map((inv, i) => (
              <div key={inv.id} onClick={() => navigate(`/investigations/${inv.id}`)} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer',
                borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : 'none',
                transition: 'background 0.12s ease',
              }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: riskColor(inv.risk_level), flexShrink: 0, boxShadow: `0 0 6px ${riskColor(inv.risk_level)}30` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: T.white, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.subject || inv.filename || 'Untitled'}</div>
                  <div style={{ fontSize: '0.58rem', color: T.textDim, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {inv.sender && <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.sender}</span>}
                    {inv.sender && inv.created_at && <span style={{ color: T.textFaint }}>·</span>}
                    {inv.created_at && <span>{new Date(inv.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Badge level={inv.risk_level} score={inv.risk_score} />
                <span style={{ fontSize: '0.5rem', color: T.textFaint, textTransform: 'uppercase', minWidth: 58, textAlign: 'right', letterSpacing: '0.06em' }}>{inv.status || '—'}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </AppShell>
  );
}
