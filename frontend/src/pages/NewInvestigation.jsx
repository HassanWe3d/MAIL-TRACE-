import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadEml, ApiError } from '../api';
import { T, card, sectionHead, btnSecondary } from '../theme';
import AppShell from '../components/AppShell';

const MAX_FILE_MB = 25;

export default function NewInvestigation() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [error, setError] = useState('');

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.eml')) { setError('Only .eml files are accepted.'); setPhase('error'); return; }
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum supported size is ${MAX_FILE_MB} MB.`);
      setPhase('error');
      return;
    }
    if (file.size === 0) { setError('File is empty.'); setPhase('error'); return; }
    setFileName(file.name); setFileSize(file.size); setPhase('uploading'); setError('');
    try {
      const res = await uploadEml(file);
      const id = res.data?.id;
      if (!id) throw new Error('No investigation ID returned');
      navigate(`/investigations/${id}`);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError(e.message || 'An unexpected error occurred.');
      }
      setPhase('error');
    }
  };

  const onDrop = (e) => { e.preventDefault(); if (phase !== 'idle' && phase !== 'error') return; handleFile(e.dataTransfer.files[0]); };
  const isActive = phase === 'uploading';
  const bc = phase === 'hover' ? T.borderHover : phase === 'error' ? `${T.danger}50` : phase === 'success' ? T.borderBright : T.border;

  return (
    <AppShell>
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/dashboard')} style={{ ...btnSecondary, padding: '5px 10px', fontSize: '0.68rem' }}>← Back</button>
        <div style={{ width: 1, height: 14, background: T.border }} />
        <h1 style={{ fontSize: '0.82rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.04em' }}>New Investigation</h1>
      </header>

      <main style={{ padding: '40px 28px', flex: 1, display: 'flex', justifyContent: 'center', animation: 'fadeIn 0.2s ease' }}>
        <div style={{ width: '100%', maxWidth: 500 }}>
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: T.white, marginBottom: 6, letterSpacing: '0.01em' }}>Upload Email for Analysis</h2>
            <p style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>Analyze an email for authentication, indicators, threat intelligence and AI-assisted risk assessment.</p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); if (!isActive) setPhase('hover'); }}
            onDragLeave={() => { if (phase === 'hover') setPhase('idle'); }}
            onDrop={onDrop}
            onClick={() => !isActive && inputRef.current?.click()}
            style={{
              ...card, padding: '48px 24px', textAlign: 'center',
              cursor: isActive ? 'default' : 'pointer',
              borderColor: bc,
              background: phase === 'hover' ? T.bgPanel : phase === 'error' ? '#0C0808' : T.surface,
              transition: 'all 0.2s ease',
            }}
          >
            <input ref={inputRef} type="file" accept=".eml" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

            {phase === 'uploading' ? (
              <>
                <div style={{ width: 48, height: 48, borderRadius: T.radiusLg, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <div style={{ width: 18, height: 18, border: `2px solid ${T.border}`, borderTopColor: T.white, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
                <p style={{ fontSize: '0.82rem', color: T.white, fontWeight: 500 }}>Uploading...</p>
                <p style={{ fontSize: '0.65rem', color: T.textFaint, marginTop: 6, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                {fileSize > 0 && <p style={{ fontSize: '0.58rem', color: T.textFaint, marginTop: 3 }}>{(fileSize / 1024).toFixed(1)} KB</p>}
              </>
            ) : (
              <>
                <div style={{
                  width: 48, height: 48, borderRadius: T.radiusLg,
                  border: `1px solid ${phase === 'error' ? `${T.danger}40` : T.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: phase === 'error' ? T.danger : T.textDim,
                  fontSize: '1.2rem', transition: 'all 0.2s',
                }}>
                  {phase === 'error' ? '✕' : '↑'}
                </div>
                <p style={{ fontSize: '0.85rem', color: T.white, marginBottom: 4 }}>Drop your <strong>.eml</strong> file here</p>
                <p style={{ fontSize: '0.65rem', color: T.textDim }}>or click to browse</p>
                <p style={{ fontSize: '0.52rem', color: T.textFaint, marginTop: 8, letterSpacing: '0.04em' }}>Max {MAX_FILE_MB} MB</p>
              </>
            )}
          </div>

          {phase === 'error' && error && (
            <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: T.radius, background: '#0C0808', border: `1px solid ${T.danger}30`, color: T.danger, fontSize: '0.7rem', lineHeight: 1.5 }}>{error}</div>
          )}

          <div style={{ marginTop: 28 }}>
            <div style={sectionHead}>Pipeline</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[['Email Parsing', 'Headers, body, attachments'], ['Authentication', 'SPF, DKIM, DMARC'], ['IOC Extraction', 'URLs, domains, IPs, hashes'], ['Threat Intel', 'VirusTotal + IP geolocation'], ['Risk Scoring', 'Deterministic engine'], ['AI Analysis', 'Multi-provider classification']].map(([l, d]) => (
                <div key={l} style={{ ...card, padding: '10px 12px', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
                  onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
                >
                  <div style={{ fontSize: '0.68rem', color: T.text, fontWeight: 500 }}>{l}</div>
                  <div style={{ fontSize: '0.54rem', color: T.textFaint, marginTop: 2 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
