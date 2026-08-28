import { T } from '../../theme';
import InfoTip from '../InfoTip';
import { SectionBlock } from '../Explanation';

function HopNode({ hop, index, total }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 28 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.5rem', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          background: index === 0 ? T.surfaceActive : T.bgPanel,
          border: `1.5px solid ${index === 0 ? T.borderHover : T.border}`,
          color: T.textMuted,
        }}>{index + 1}</div>
        {index < total - 1 && <div style={{ width: 1, height: 24, background: T.border }} />}
      </div>
      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.68rem', color: T.white, fontFamily: '"SF Mono", ui-monospace, monospace' }}>
            {hop.source_hostname || hop.source_ip || '?'}
          </span>
          <span style={{ fontSize: '0.58rem', color: T.textFaint }}>→</span>
          <span style={{ fontSize: '0.68rem', color: T.textMuted, fontFamily: '"SF Mono", ui-monospace, monospace' }}>
            {hop.destination_hostname || hop.destination_ip || '?'}
          </span>
        </div>
        {hop.timestamp && (
          <div style={{ fontSize: '0.53rem', color: T.textFaint, marginTop: 3 }}>
            {new Date(hop.timestamp).toLocaleString()}
          </div>
        )}
        {hop.source_ip && hop.source_hostname && hop.source_ip !== hop.source_hostname && (
          <div style={{ fontSize: '0.5rem', color: T.textFaint, marginTop: 2, fontFamily: '"SF Mono", ui-monospace, monospace' }}>
            IP: {hop.source_ip}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoutingTab({ data }) {
  if (!data) return null;

  const hops = data.received_hops || [];
  const ips = data.ip_enrichments || [];

  return (
    <div style={{ animation: 'fadeIn 0.2s ease' }}>
      {/* Section intro */}
      <div style={{ padding: '12px 16px', borderRadius: T.radius, background: T.bgPanel, border: `1px solid ${T.border}`, marginBottom: 20 }}>
        <p style={{ fontSize: '0.68rem', color: T.textMuted, lineHeight: 1.6, margin: 0 }}>
          <strong>Email routing</strong> shows the journey this email took from the sender's infrastructure to the recipient's mail server.
          Each "hop" represents a server that handled the message along the way.
        </p>
      </div>

      {/* Received Hops */}
      <SectionBlock title="Email Routing Path" description="Each hop represents a mail server the email passed through before reaching its destination." count={hops.length}>
        {hops.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: '0.72rem', color: T.textFaint, fontStyle: 'italic' }}>No routing information available.</p>
          </div>
        ) : (
          <div style={{ padding: '16px 12px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            {hops.map((h, i) => <HopNode key={i} hop={h} index={i} total={hops.length} />)}
          </div>
        )}
      </SectionBlock>

      {/* IP Geolocation */}
      <SectionBlock title="IP Geolocation" description="This shows where the servers involved in sending this email are registered geographically. IP location shows infrastructure placement, not the physical location of a person.">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
          <InfoTip text="IP geolocation shows where a server or network is registered. It does NOT identify the physical location of the person who sent the email. A server in one country can be controlled by someone in another country entirely." />
          <span style={{ fontSize: '0.58rem', color: T.textFaint }}>Important: IP location ≠ sender location</span>
        </div>

        {ips.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
            <p style={{ fontSize: '0.72rem', color: T.textFaint, fontStyle: 'italic' }}>No public IP enrichment available for this investigation.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {ips.map((ip, i) => (
              <div key={i} style={{ padding: '14px 16px', borderRadius: T.radius, background: T.surface, border: `1px solid ${T.border}` }}>
                <div style={{ fontSize: '0.78rem', color: T.white, fontFamily: '"SF Mono", ui-monospace, monospace', fontWeight: 600, marginBottom: 6 }}>{ip.ip_address}</div>
                <div style={{ fontSize: '0.64rem', color: T.textMuted, lineHeight: 1.5 }}>
                  {[ip.city, ip.region, ip.country].filter(Boolean).join(', ') || 'Location unknown'}
                </div>
                {ip.isp && <div style={{ fontSize: '0.58rem', color: T.textDim, marginTop: 3 }}>ISP: {ip.isp}</div>}
                {ip.asn && <div style={{ fontSize: '0.58rem', color: T.textDim, marginTop: 2 }}>ASN: {ip.asn}</div>}
                {ip.org && <div style={{ fontSize: '0.58rem', color: T.textDim, marginTop: 2 }}>Org: {ip.org}</div>}
                <div style={{ display: 'flex', gap: 5, marginTop: 6, flexWrap: 'wrap' }}>
                  {ip.is_hosting && (
                    <span style={{ fontSize: '0.48rem', padding: '2px 7px', borderRadius: 3, background: `${T.warning}10`, color: T.warning, border: `1px solid ${T.warning}20`, fontWeight: 600, letterSpacing: '0.04em' }}>
                      HOSTING
                    </span>
                  )}
                  {ip.is_datacenter && (
                    <span style={{ fontSize: '0.48rem', padding: '2px 7px', borderRadius: 3, background: `${T.warning}10`, color: T.warning, border: `1px solid ${T.warning}20`, fontWeight: 600, letterSpacing: '0.04em' }}>
                      DATACENTER
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  );
}
