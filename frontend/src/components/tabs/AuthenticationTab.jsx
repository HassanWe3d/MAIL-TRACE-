import { T, statusColor } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

const AUTH_INFO = {
  SPF: {
    what: 'SPF (Sender Policy Framework) is a method that allows a domain to specify which mail servers are authorized to send email on its behalf.',
    whyPass: 'The sending server is listed in the domain\'s authorized senders. This means the email came from a server the domain owner trusts.',
    whyFail: 'The sending server is NOT listed in the domain\'s authorized senders. This could mean the email was sent from an unauthorized server, or the domain\'s SPF record is misconfigured.',
    whySoftfail: 'The sending server is not explicitly authorized, but the domain policy allows some flexibility. This is a warning, not a hard failure.',
    whyNeutral: 'The domain\'s SPF record does not make a definitive statement about whether the server is authorized.',
  },
  DKIM: {
    what: 'DKIM (DomainKeys Identified Mail) adds a digital signature to emails, allowing the recipient to verify that the message was actually sent by the claimed domain and was not modified in transit.',
    whyPass: 'The email\'s digital signature matches the domain\'s public key. This confirms the email was sent by an authorized server and was not tampered with.',
    whyFail: 'The signature verification failed. This could mean the email was forged, modified in transit, or sent from a server not configured for DKIM signing.',
    whyNeutral: 'No DKIM signature was found, or the domain does not publish a DKIM policy.',
  },
  DMARC: {
    what: 'DMARC (Domain-based Message Authentication, Reporting & Conformance) builds on SPF and DKIM to give domain owners control over how receivers handle unauthenticated mail.',
    whyPass: 'The email passed the domain\'s DMARC policy, meaning both SPF and/or DKIM aligned with the From domain as required.',
    whyFail: 'The email failed the domain\'s DMARC policy. This strongly suggests the email was not sent by an authorized server for this domain.',
    whyNone: 'The domain publishes a DMARC policy of "none," meaning it monitors but does not reject unauthenticated mail.',
  },
};

function AuthResult({ label, result, domain, reason, info }) {
  const c = statusColor(result);
  const isPass = (result || '').toLowerCase() === 'pass';
  const isFail = (result || '').toLowerCase() === 'fail';
  const isSoftfail = (result || '').toLowerCase() === 'softfail';

  let whyMatters = '';
  if (isPass) whyMatters = info.whyPass;
  else if (isFail) whyMatters = info.whyFail;
  else if (isSoftfail) whyMatters = info.whySoftfail || info.whyFail;
  else whyMatters = info.whyNeutral || '';

  return (
    <div style={{
      padding: '18px 20px', borderRadius: T.radius, background: T.surface,
      border: `1px solid ${isFail ? `${T.danger}30` : T.border}`, marginBottom: 12,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.white }}>{label}</span>
        <InfoTip text={info.what} />
        <span style={{
          fontSize: '0.56rem', padding: '3px 10px', borderRadius: 4, fontWeight: 700,
          background: `${c}14`, color: c,
          border: `1px solid ${c}30`, textTransform: 'uppercase', letterSpacing: '0.06em', marginLeft: 'auto',
        }}>{result || 'UNKNOWN'}</span>
      </div>

      {/* What is it? */}
      <p style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.55, marginBottom: 10 }}>{info.what}</p>

      {/* What did we find? */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>What did we find</div>
        <div style={{ fontSize: '0.66rem', color: T.textMuted, lineHeight: 1.5 }}>
          {label} result: <strong style={{ color: c }}>{(result || 'unknown').toUpperCase()}</strong>
          {domain && <> for domain <span style={{ fontFamily: '"SF Mono", ui-monospace, monospace', fontSize: '0.62rem' }}>{domain}</span></>}
        </div>
      </div>

      {/* Why does it matter? */}
      {whyMatters && (
        <div>
          <div style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 4 }}>Why this matters</div>
          <p style={{ fontSize: '0.64rem', color: isFail ? T.danger : T.textDim, lineHeight: 1.55, margin: 0 }}>{whyMatters}</p>
        </div>
      )}

      {/* Additional reason if present */}
      {reason && (
        <div style={{ marginTop: 8, padding: '8px 12px', borderRadius: T.radiusSm, background: T.bgPanel, border: `1px solid ${T.border}` }}>
          <span style={{ fontSize: '0.53rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Detail</span>
          <p style={{ fontSize: '0.6rem', color: T.textDim, marginTop: 3, lineHeight: 1.4, fontFamily: '"SF Mono", ui-monospace, monospace', wordBreak: 'break-all' }}>{reason}</p>
        </div>
      )}
    </div>
  );
}

export default function AuthenticationTab({ data }) {
  if (!data) return null;

  const auth = data.authentication_results || {};

  if (!auth || Object.keys(auth).length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ fontSize: '0.75rem', color: T.textFaint }}>Authentication results are not available for this investigation.</p>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Section intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Email authentication</strong> helps verify whether the sending infrastructure is authorized by the domain that appears in the sender address.
          These checks are critical for identifying spoofed or phishing emails.
        </p>
      </div>

      {/* SPF */}
      <AuthResult
        label="SPF"
        result={auth.spf_result}
        domain={auth.spf_domain}
        reason={auth.spf_reason}
        info={AUTH_INFO.SPF}
      />

      {/* DKIM */}
      <AuthResult
        label="DKIM"
        result={auth.dkim_result}
        domain={auth.dkim_domain}
        reason={auth.dkim_selector ? `Selector: ${auth.dkim_selector}` : null}
        info={AUTH_INFO.DKIM}
      />

      {/* DMARC */}
      <AuthResult
        label="DMARC"
        result={auth.dmarc_result}
        domain={auth.dmarc_policy}
        reason={auth.dmarc_reason}
        info={AUTH_INFO.DMARC}
      />

      {/* Mismatch warnings */}
      {(auth.domain_mismatch || auth.reply_to_mismatch) && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.56rem', color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>Additional Warnings</div>
          {auth.domain_mismatch && (
            <div style={{
              padding: '12px 16px', borderRadius: T.radius, background: '#0C0808',
              border: `1px solid ${T.warning}25`, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: T.warning, fontSize: '0.85rem' }}>⚠</span>
                <span style={{ fontSize: '0.72rem', color: T.warning, fontWeight: 600 }}>Sender Domain Mismatch</span>
              </div>
              <p style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>
                The From domain (<strong style={{ color: T.text }}>{auth.from_domain}</strong>) differs from the Return-Path domain (<strong style={{ color: T.text }}>{auth.return_path_domain}</strong>).
                This can indicate email forwarding, mailing list behavior, or a potential spoofing attempt.
              </p>
            </div>
          )}
          {auth.reply_to_mismatch && (
            <div style={{
              padding: '12px 16px', borderRadius: T.radius, background: '#0C0808',
              border: `1px solid ${T.warning}25`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span style={{ color: T.warning, fontSize: '0.85rem' }}>⚠</span>
                <span style={{ fontSize: '0.72rem', color: T.warning, fontWeight: 600 }}>Reply-To Mismatch</span>
              </div>
              <p style={{ fontSize: '0.64rem', color: T.textDim, lineHeight: 1.5, margin: 0 }}>
                The Reply-To address (<strong style={{ color: T.text }}>{auth.reply_to}</strong>) differs from the From address (<strong style={{ color: T.text }}>{auth.from_address}</strong>).
                This means replies would go to a different person than the apparent sender — a common phishing technique.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
