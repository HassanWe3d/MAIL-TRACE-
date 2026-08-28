import { useState } from 'react';
import { T, statusColor } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

const TYPE_LABELS = {
  ip: 'IP Address',
  domain: 'Domain',
  url: 'URL',
  hash_sha256: 'SHA-256 Hash',
  hash_sha1: 'SHA-1 Hash',
  hash_md5: 'MD5 Hash',
  email: 'Email Address',
};

const TYPE_EXPLANATIONS = {
  ip: 'An IP address is a unique number assigned to a device on a network. Suspicious IPs may be associated with known threat infrastructure.',
  domain: 'A domain name is a human-readable address (like example.com). Malicious domains are often used for phishing or malware distribution.',
  url: 'A URL is a web address found in the email. Malicious URLs may lead to phishing pages or malware downloads.',
  hash_sha256: 'A SHA-256 hash is a unique digital fingerprint of a file. If this hash matches a known malware sample, the file is likely malicious.',
  hash_sha1: 'A SHA-1 hash is a shorter fingerprint of a file. It is used for file identification and cross-referencing with security databases.',
  hash_md5: 'An MD5 hash is an older fingerprinting method. While less collision-resistant than SHA-256, it is still used for quick file identification.',
  email: 'An email address extracted from the message. It may indicate the true sender or be used for further investigation.',
};

function IOCRow({ ioc, copied, onCopy }) {
  const c = statusColor(ioc.risk);
  const isHighRisk = ioc.risk === 'malicious' || ioc.risk === 'high' || ioc.risk === 'critical';
  const value = ioc.value || '';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
      borderRadius: T.radiusSm, background: T.surface,
      border: `1px solid ${isHighRisk ? `${T.danger}20` : T.border}`,
      marginBottom: 4,
    }}>
      <span style={{
        fontSize: '0.48rem', padding: '2px 6px', borderRadius: 3,
        background: T.surfaceActive, color: T.textDim, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0, minWidth: 54, textAlign: 'center',
      }}>{ioc.ioc_type}</span>
      <span style={{
        fontSize: '0.62rem', color: T.textMuted, flex: 1,
        fontFamily: '"SF Mono", ui-monospace, monospace',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }} title={value}>{value}</span>
      {ioc.source && <span style={{ fontSize: '0.48rem', color: T.textFaint, flexShrink: 0 }}>{ioc.source}</span>}
      <span style={{
        fontSize: '0.5rem', padding: '2px 7px', borderRadius: 4,
        background: `${c}12`, color: c, fontWeight: 600,
        textTransform: 'uppercase', flexShrink: 0,
      }}>{ioc.risk || 'unknown'}</span>
      <button
        onClick={() => onCopy(value)}
        style={{
          fontSize: '0.5rem', padding: '2px 6px', borderRadius: 3,
          background: 'transparent', border: `1px solid ${T.border}`,
          color: T.textFaint, cursor: 'pointer', flexShrink: 0,
          fontFamily: 'inherit', transition: 'border-color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = T.borderHover}
        onMouseLeave={e => e.currentTarget.style.borderColor = T.border}
        title="Copy to clipboard"
      >{copied === value ? '✓' : '⧉'}</button>
    </div>
  );
}

export default function IOCsTab({ data }) {
  if (!data) return null;

  const iocs = data.iocs || [];
  const [copied, setCopied] = useState(null);

  const handleCopy = (val) => {
    navigator.clipboard?.writeText(val).then(() => {
      setCopied(val);
      setTimeout(() => setCopied(null), 1500);
    }).catch(() => {});
  };

  // Group by type
  const grouped = {};
  iocs.forEach(ioc => {
    const t = ioc.ioc_type || 'other';
    if (!grouped[t]) grouped[t] = [];
    grouped[t].push(ioc);
  });

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Indicators of Compromise (IOCs)</strong> are pieces of technical information extracted from the email that can help identify
          potentially suspicious activity — such as IP addresses, domains, URLs, or file hashes.
        </p>
      </div>

      {/* Total count */}
      {iocs.length > 0 && (
        <div style={{ padding: '10px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}`, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: T.white }}>{iocs.length}</span>
          <span style={{ fontSize: '0.64rem', color: T.textDim }}>indicator{iocs.length !== 1 ? 's' : ''} extracted from this email</span>
        </div>
      )}

      {iocs.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
          <p style={{ fontSize: '0.72rem', color: T.textFaint, fontStyle: 'italic', margin: 0 }}>No indicators of compromise were detected in this email.</p>
        </div>
      ) : (
        Object.entries(grouped).map(([type, items]) => (
          <SectionBlock key={type} title={TYPE_LABELS[type] || type.toUpperCase()} description={TYPE_EXPLANATIONS[type]} count={items.length}>
            {items.map((ioc, i) => <IOCRow key={i} ioc={ioc} copied={copied} onCopy={handleCopy} />)}
          </SectionBlock>
        ))
      )}
    </div>
  );
}
