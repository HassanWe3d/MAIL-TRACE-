import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadEml, ApiError } from '../api';
import { T, card, sectionHead } from '../theme';
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
      // Navigate directly to the investigation detail page
      // The detail page will show a processing banner and poll for completion
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
  const bc = phase === 'hover' ? '#555' : phase === 'error' ? '#F87171' : phase === 'success' ? '#AAA' : T.border;

  return (
    <AppShell>
      <header style={{ height: T.topbarHeight, borderBottom: `1px solid ${T.border}`, background: T.bgAlt, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => navigate('/dashboard')} style={{ background: 'none', border: 'none', color: T.textDim, cursor: 'pointer', fontSize: '0.72rem', fontWeight: 500 }}>← Back</button>
        <div style={{ width: 1, height: 16, background: T.border }} />
        <h1 style={{ fontSize: '0.8rem', fontWeight: 600, color: T.white, margin: 0, letterSpacing: '0.04em' }}>New Investigation</h1>
      </header>

      <main style={{ padding: '36px 24px', flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: 480 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 600, color: T.white, marginBottom: 5, letterSpacing: '0.02em' }}>Upload Email for Analysis</h2>
            <p style={{ fontSize: '0.7rem', color: T.textDim, lineHeight: 1.5 }}>Analyze an email for authentication, indicators, threat intelligence and AI-assisted risk assessment.</p>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); if (!isActive) setPhase('hover'); }}
            onDragLeave={() => { if (phase === 'hover') setPhase('idle'); }}
            onDrop={onDrop}
            onClick={() => !isActive && inputRef.current?.click()}
            style={{ ...card, padding: '44px 20px', textAlign: 'center', cursor: isActive ? 'default' : 'pointer', borderColor: bc, background: phase === 'hover' ? '#0A0A0A' : T.surface, transition: 'all 0.2s' }}
          >
            <input ref={inputRef} type="file" accept=".eml" style={{ display: 'none' }} onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

            {phase === 'uploading' ? (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 8, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: T.textDim }}>
                  <div style={{ width: 16, height: 16, border: `2px solid ${T.border}`, borderTopColor: T.white, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                </div>
                <p style={{ fontSize: '0.82rem', color: T.white, fontWeight: 500 }}>Uploading...</p>
                <p style={{ fontSize: '0.65rem', color: T.textFaint, marginTop: 4, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                {fileSize > 0 && <p style={{ fontSize: '0.6rem', color: T.textFaint, marginTop: 2 }}>{(fileSize / 1024).toFixed(1)} KB</p>}
              </>
            ) : (
              <>
                <div style={{ width: 44, height: 44, borderRadius: 8, border: `1px solid ${phase === 'error' ? `${T.danger}40` : T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: phase === 'error' ? T.danger : T.textDim, fontSize: '1.1rem' }}>
                  {phase === 'error' ? '✕' : '↑'}
                </div>
                <p style={{ fontSize: '0.82rem', color: T.white, marginBottom: 3 }}>Drop your <strong>.eml</strong> file here</p>
                <p style={{ fontSize: '0.65rem', color: T.textFaint }}>or click to browse</p>
                <p style={{ fontSize: '0.55rem', color: T.textDark, marginTop: 6 }}>Max {MAX_FILE_MB} MB</p>
              </>
            )}
          </div>

          {phase === 'error' && error && (
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: T.radius, background: '#111', border: `1px solid ${T.border}`, color: T.textMuted, fontSize: '0.7rem' }}>{error}</div>
          )}

          <div style={{ marginTop: 24 }}>
            <div style={sectionHead}>Pipeline</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[['Email Parsing', 'Headers, body, attachments'], ['Authentication', 'SPF, DKIM, DMARC'], ['IOC Extraction', 'URLs, domains, IPs, hashes'], ['Threat Intel', 'VirusTotal + IP geolocation'], ['Risk Scoring', 'Deterministic engine'], ['AI Analysis', 'Gemini classification']].map(([l, d]) => (
                <div key={l} style={{ ...card, padding: '8px 10px' }}>
                  <div style={{ fontSize: '0.68rem', color: T.text, fontWeight: 500 }}>{l}</div>
                  <div style={{ fontSize: '0.55rem', color: T.textFaint, marginTop: 1 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
