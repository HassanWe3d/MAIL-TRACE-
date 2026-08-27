import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { T } from '../theme';

const nav = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/investigations/new', label: 'New Investigation' },
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
        <div onClick={() => navigate('/')} role="button" tabIndex={0} style={{ padding: '16px 16px', cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: T.white, letterSpacing: '0.06em' }}>MAIL TRACE</div>
          <div style={{ fontSize: '0.48rem', color: T.textFaint, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 2 }}>Threat Intelligence</div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {nav.map(item => {
            const active = item.to === '/dashboard'
              ? location.pathname === '/dashboard'
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: T.radius,
                  fontSize: '0.72rem', fontWeight: 500, textDecoration: 'none',
                  color: active ? T.white : T.textDim,
                  background: active ? '#111' : 'transparent',
                  border: active ? `1px solid ${T.border}` : '1px solid transparent',
                  transition: 'all 0.12s',
                }}
              >
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}`, fontSize: '0.45rem', color: T.textFaint, letterSpacing: '0.08em' }}>
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
