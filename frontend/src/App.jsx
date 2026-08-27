import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewInvestigation from './pages/NewInvestigation';
import InvestigationDetail from './pages/InvestigationDetail';
import { T } from './theme';

function NotFound() {
  const navigate = useNavigate();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: T.bg, color: T.text }}>
      <div style={{ fontSize: '3rem', fontWeight: 800, color: T.white, marginBottom: 8 }}>404</div>
      <p style={{ fontSize: '0.85rem', color: T.textMuted, marginBottom: 20, textAlign: 'center', maxWidth: 400 }}>
        The page you're looking for doesn't exist.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        style={{ padding: '8px 20px', borderRadius: T.radius, background: T.white, color: T.bg, border: 'none', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investigations/new" element={<NewInvestigation />} />
        <Route path="/investigations/:id" element={<InvestigationDetail />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
