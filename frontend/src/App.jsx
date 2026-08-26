import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import NewInvestigation from './pages/NewInvestigation';
import InvestigationDetail from './pages/InvestigationDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investigations/new" element={<NewInvestigation />} />
        <Route path="/investigations/:id" element={<InvestigationDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
