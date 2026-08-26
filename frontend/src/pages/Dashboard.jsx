import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInvestigations } from '../api';
import { T, riskColor, card } from '../theme';
import AppShell from '../components/AppShell';

function Badge({ level, score }) {
  const c = riskColor(level);
  return (
    <span style={{ padding: '2px 7px', borderRadius: 3, fontSize: '0.58rem', fontWeight: 600, background: `${c}18`, color: c, border: `1px solid ${c}30`, whiteSpace: 'nowrap', letterSpacing: '0.03em' }}>
      {level || 'UNKNOWN'}{score != null ? ` (${score})` : ''}
    </span>
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
      setError(e.message?.includes('fetch') ? 'Backend unavailable' : e.message);
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
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 24px', display: 'flex', alignItems: 'center' }}>
        <h1 style={{ fontSize: '0.8rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.04em' }}>Dashboard</h1>
        <div style={{ flex: 1 }} />
        <button onClick={() => navigate('/investigations/new')} style={{ padding: '6px 14px', borderRadius: T.radius, background: T.white, color: T.bg, border: 'none', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', letterSpacing: '0.04em' }}>+ New</button>
      </header>

      <main style={{ padding: '20px 24px', flex: 1 }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[{ l: 'TOTAL', v: s.total, c: T.white }, { l: 'CRITICAL', v: s.critical, c: T.danger }, { l: 'HIGH', v: s.high, c: T.warning }, { l: 'PROCESSING', v: s.processing, c: T.textDim }].map(x => (
            <div key={x.l} style={{ ...card, padding: '12px 14px' }}>
              <div style={{ fontSize: '0.55rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>{x.l}</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, color: x.c }}>{x.v}</div>
            </div>
          ))}
        </div>

        {/* List */}
        <div style={card}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: '0.72rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Recent Investigations</h2>
            <span style={{ fontSize: '0.58rem', color: T.textFaint }}>{total} total</span>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.textDim, fontSize: '0.75rem' }}>Loading...</div>
          ) : error ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <p style={{ color: T.textMuted, fontSize: '0.78rem', marginBottom: 8 }}>{error}</p>
              <button onClick={load} style={{ padding: '5px 12px', borderRadius: T.radius, background: T.white, color: T.bg, border: 'none', cursor: 'pointer', fontSize: '0.68rem' }}>Retry</button>
            </div>
          ) : items.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <p style={{ color: T.textDim, fontSize: '0.78rem', marginBottom: 10 }}>No investigations yet</p>
              <button onClick={() => navigate('/investigations/new')} style={{ padding: '6px 16px', borderRadius: T.radius, background: T.white, color: T.bg, border: 'none', cursor: 'pointer', fontSize: '0.68rem' }}>Upload your first .eml file</button>
            </div>
          ) : (
            items.map((inv, i) => (
              <div key={inv.id} onClick={() => navigate(`/investigations/${inv.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: i < items.length - 1 ? `1px solid ${T.border}` : 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: riskColor(inv.risk_level), flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.75rem', color: T.white, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.subject || inv.filename || 'Untitled'}</div>
                  <div style={{ fontSize: '0.6rem', color: T.textDim, marginTop: 1 }}>
                    {inv.sender && <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block', verticalAlign: 'bottom' }}>{inv.sender}</span>}
                    {inv.sender && inv.created_at && <span style={{ margin: '0 3px', color: T.textFaint }}>·</span>}
                    {inv.created_at && <span>{new Date(inv.created_at).toLocaleDateString()}</span>}
                  </div>
                </div>
                <Badge level={inv.risk_level} score={inv.risk_score} />
                <span style={{ fontSize: '0.52rem', color: T.textFaint, textTransform: 'uppercase', minWidth: 55, textAlign: 'right' }}>{inv.status || '—'}</span>
              </div>
            ))
          )}
        </div>
      </main>
    </AppShell>
  );
}
