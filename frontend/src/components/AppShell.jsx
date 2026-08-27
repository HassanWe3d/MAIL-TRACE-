import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { T, btnPrimary } from '../theme';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: '◉' },
  { to: '/investigations/new', label: 'New Investigation', icon: '⊕' },
];

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Sidebar */}
      <aside className="hide-mobile" style={{
        width: T.sidebarWidth, position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 100,
        background: T.bgAlt, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Brand */}
        <div onClick={() => navigate('/')} role="button" tabIndex={0} style={{
          padding: '18px 18px', cursor: 'pointer', borderBottom: `1px solid ${T.border}`,
          transition: 'background 0.12s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = T.surfaceHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: T.white, letterSpacing: '0.08em' }}>MAIL TRACE</div>
          <div style={{ fontSize: '0.44rem', color: T.textFaint, letterSpacing: '0.18em', textTransform: 'uppercase', marginTop: 3 }}>Threat Intelligence</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(item => {
            const active = item.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 14px', borderRadius: T.radius,
                  fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none',
                  color: active ? T.white : T.textDim,
                  background: active ? T.surfaceActive : 'transparent',
                  border: active ? `1px solid ${T.border}` : '1px solid transparent',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.background = T.surfaceHover; e.currentTarget.style.color = T.textMuted; }}}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textDim; }}}
              >
                <span style={{ fontSize: '0.6rem', opacity: active ? 0.8 : 0.4 }}>{item.icon}</span>
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '12px 18px', borderTop: `1px solid ${T.border}`, fontSize: '0.42rem', color: T.textFaint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Email Forensic Platform
        </div>
      </aside>

      <div className="hide-mobile" style={{ flex: 1, marginLeft: T.sidebarWidth, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {children}
      </div>
      {/* Mobile layout — no sidebar */}
      <div className="show-mobile" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {children}
      </div>
    </div>
  );
}
