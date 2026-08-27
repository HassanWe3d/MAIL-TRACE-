import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Ferrofluid from '../components/Ferrofluid';

export default function Landing() {
  const navigate = useNavigate();
  const go = useCallback(() => navigate('/investigations/new'), [navigate]);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000', overflow: 'hidden' }}>
      {/* White Ferrofluid */}
      <Ferrofluid />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse at center, transparent 25%, #000 80%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2.4rem, 8vw, 5rem)', fontWeight: 800, color: '#FFF',
          letterSpacing: '0.12em', textAlign: 'center', margin: 0, lineHeight: 1.05,
          textShadow: '0 0 40px rgba(255,255,255,0.04)',
        }}>
          MAIL TRACE
        </h1>

        {/* Subtitle */}
        <p style={{
          color: '#555', fontSize: '0.62rem', letterSpacing: '0.35em',
          textTransform: 'uppercase', margin: '18px 0 0', textAlign: 'center',
        }}>
          Email Forensics &nbsp;·&nbsp; Threat Intelligence
        </p>

        {/* ENTER */}
        <button
          onClick={go}
          aria-label="Enter MAIL TRACE"
          style={{
            marginTop: 64, padding: '14px 40px', borderRadius: 6,
            background: 'transparent',
            border: '1px solid #2A2A2F',
            color: '#FFF', fontSize: '0.7rem', fontWeight: 500,
            letterSpacing: '0.25em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#666';
            e.currentTarget.style.boxShadow = '0 0 30px rgba(255,255,255,0.05)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.querySelector('.arr').style.transform = 'translateX(4px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#2A2A2F';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.querySelector('.arr').style.transform = 'translateX(0)';
          }}
        >
          Enter
          <span className="arr" style={{ transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)', fontSize: '0.82rem' }}>→</span>
        </button>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
        padding: '18px 20px', textAlign: 'center',
        fontSize: '0.58rem', color: '#3A3A3F', letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Made by Team - TRACEx
      </div>
    </div>
  );
}
