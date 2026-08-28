import { useState } from 'react';
import { T } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

function HeaderRow({ label, value, mono: isMono }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: `1px solid ${T.border}` }}>
      <span style={{ minWidth: 100, fontSize: '0.62rem', color: T.textFaint, fontWeight: 500, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.62rem', color: T.textMuted, wordBreak: 'break-all', lineHeight: 1.5, ...(isMono ? { fontFamily: '"SF Mono", ui-monospace, monospace' } : {}) }}>{value}</span>
    </div>
  );
}

export default function EmailHeadersTab({ data }) {
  const [showRaw, setShowRaw] = useState(false);
  if (!data) return null;

  const meta = data.email_metadata || {};
  const headers = data.headers || [];

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Explanation */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Email metadata</strong> tells us who sent the message, who received it, when it was sent, and which servers it passed through.
          Understanding these fields helps identify whether the sender information is consistent and trustworthy.
        </p>
      </div>

      {/* Core Metadata */}
      <SectionBlock title="Email Information">
        <div style={{ padding: '4px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
          <HeaderRow label="From" value={meta.from_address || data.sender} />
          <HeaderRow label="To" value={(meta.to_addresses || []).join(', ')} />
          {meta.cc_addresses?.length > 0 && <HeaderRow label="CC" value={meta.cc_addresses.join(', ')} />}
          <HeaderRow label="Subject" value={meta.subject || data.subject} />
          <HeaderRow label="Date" value={meta.date ? new Date(meta.date).toLocaleString() : data.date ? new Date(data.date).toLocaleString() : '—'} />
          <HeaderRow label="Reply-To" value={meta.reply_to} />
          <HeaderRow label="Return-Path" value={meta.return_path} />
          <HeaderRow label="Message-ID" value={meta.message_id} isMono />
        </div>
      </SectionBlock>

      {/* Key header explanations */}
      <SectionBlock title="Understanding These Fields">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div style={{ padding: '12px 14px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: T.white }}>From <InfoTip text="The 'From' address is what the recipient sees as the sender. Attackers can easily forge this — it alone does not prove who actually sent the email." /></span>
            </div>
            <p style={{ fontSize: '0.58rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>This is the sender address displayed to the recipient. It can be forged, so it should be verified against other authentication signals.</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: T.white }}>Reply-To <InfoTip text="If different from 'From', it means replies go to a different address. This can be legitimate but is also a common phishing technique." /></span>
            </div>
            <p style={{ fontSize: '0.58rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>Where replies are directed. If this differs from the From address, it may indicate forwarding, mailing list behavior, or spoofing.</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: T.white }}>Return-Path <InfoTip text="The Return-Path is where bounce messages go. A mismatch with From can indicate email spoofing or misconfiguration." /></span>
            </div>
            <p style={{ fontSize: '0.58rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>The address that receives bounced messages. A mismatch with the From domain may suggest spoofing or misconfiguration.</p>
          </div>
          <div style={{ padding: '12px 14px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 600, color: T.white }}>Message-ID <InfoTip text="A unique identifier assigned by the sending mail server. A valid Message-ID follows standard format and is usually globally unique." /></span>
            </div>
            <p style={{ fontSize: '0.58rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>A unique identifier for this email. Used for threading, tracking, and verifying the email's origin server.</p>
          </div>
        </div>
      </SectionBlock>

      {/* Raw Headers */}
      {headers.length > 0 && (
        <SectionBlock title="Raw Headers" count={headers.length}>
          <p style={{ fontSize: '0.62rem', color: T.textDim, lineHeight: 1.5, marginBottom: 10, maxWidth: 600 }}>
            Raw email headers contain the complete technical metadata. They include server information, timestamps, and authentication results.
          </p>
          <button
            onClick={() => setShowRaw(v => !v)}
            style={{
              fontSize: '0.62rem', color: T.textFaint, background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: 'inherit', marginBottom: showRaw ? 8 : 0,
            }}
          >
            <span style={{ transform: showRaw ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s', display: 'inline-block' }}>▸</span>
            {showRaw ? 'Hide' : 'Show'} {headers.length} raw header{headers.length > 1 ? 's' : ''}
          </button>
          {showRaw && (
            <div style={{ maxHeight: 300, overflow: 'auto', borderRadius: T.radius, border: `1px solid ${T.border}`, background: T.bgPanel }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.58rem' }}>
                <thead><tr style={{ background: T.surface }}>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em', width: 140 }}>Header</th>
                  <th style={{ padding: '6px 10px', textAlign: 'left', color: T.textFaint, fontWeight: 600, fontSize: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Value</th>
                </tr></thead>
                <tbody>{headers.map((h, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${T.border}` }}>
                    <td style={{ padding: '5px 10px', color: T.textMuted, fontWeight: 500 }}>{h.name}</td>
                    <td style={{ padding: '5px 10px', color: T.textDim, wordBreak: 'break-all', fontFamily: '"SF Mono", ui-monospace, monospace', lineHeight: 1.4 }}>{h.value}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </SectionBlock>
      )}
    </div>
  );
}
