import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Ferrofluid from '../components/Ferrofluid';
import { T } from '../theme';

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
        background: 'radial-gradient(ellipse at center, transparent 30%, #000 85%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', height: '100%',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>
        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(2.2rem, 7vw, 4.5rem)', fontWeight: 800, color: '#FFF',
          letterSpacing: '0.1em', textAlign: 'center', margin: 0, lineHeight: 1.05,
        }}>
          MAIL TRACE
        </h1>

        {/* Subtitle */}
        <p style={{
          color: '#666', fontSize: '0.65rem', letterSpacing: '0.3em',
          textTransform: 'uppercase', margin: '16px 0 0', textAlign: 'center',
        }}>
          Email Forensics &nbsp;·&nbsp; Threat Intelligence
        </p>

        {/* ENTER */}
        <button
          onClick={go}
          aria-label="Enter MAIL TRACE"
          style={{
            marginTop: 60, padding: '12px 36px', borderRadius: 4,
            background: 'transparent',
            border: '1px solid #333',
            color: '#FFF', fontSize: '0.72rem', fontWeight: 500,
            letterSpacing: '0.2em', textTransform: 'uppercase',
            cursor: 'pointer', transition: 'all 0.3s ease',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#888';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(255,255,255,0.06)';
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.querySelector('.arr').style.transform = 'translateX(3px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = '#333';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.querySelector('.arr').style.transform = 'translateX(0)';
          }}
        >
          Enter
          <span className="arr" style={{ transition: 'transform 0.3s ease', fontSize: '0.85rem' }}>→</span>
        </button>
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 2,
        padding: '16px 20px', textAlign: 'center',
        fontSize: '0.6rem', color: '#444', letterSpacing: '0.06em',
      }}>
        Made by Team - TRACEx
      </div>
    </div>
  );
}
