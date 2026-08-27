import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { T, riskColor, statusColor } from '../theme';

const TYPES = {
  sender: '#E8E8EC', domain: '#B8B8C0', ip: '#9898A0',
  url: '#C0C0C8', asn: '#808088', country: '#A8A8B0',
};

function Node({ data }) {
  const bg = TYPES[data.nodeType] || '#888890';
  const rc = data.risk === 'malicious' ? '#F87171'
    : data.risk === 'suspicious' ? '#FBBF24'
    : data.risk === 'safe' || data.risk === 'clean' ? '#4ADE80'
    : null;
  return (
    <div style={{
      padding: '7px 12px', borderRadius: T.radius, background: '#0A0A0C',
      border: `1px solid ${rc || '#2A2A2F'}`,
      fontSize: '0.6rem', color: T.text,
      fontFamily: '"SF Mono", ui-monospace, monospace',
      maxWidth: 180, minWidth: 80,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      boxShadow: rc ? `0 0 8px ${rc}15` : '0 1px 3px rgba(0,0,0,0.3)',
      transition: 'box-shadow 0.15s ease',
    }}>
      <div style={{ fontSize: '0.48rem', color: bg, marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{data.nodeType}</div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', color: rc ? '#FFF' : T.textMuted }}>{data.label}</div>
    </div>
  );
}

const nodeTypes = { custom: Node };

export default function InvestigationGraph({ graph, loading, error, onRetry }) {
  const { nodes, edges } = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    return {
      nodes: (graph.nodes || []).filter(n => n?.id).map((n, i) => ({
        id: n.id, type: 'custom',
        position: { x: (i % 4) * 200, y: Math.floor(i / 4) * 110 },
        data: { label: n.label || 'Unknown', nodeType: n.type || 'unknown', risk: n.risk || 'unknown' },
      })),
      edges: (graph.edges || []).filter(e => e?.source && e?.target).map(e => ({
        id: e.id || `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.relationship || '',
        style: { stroke: '#2A2A30', strokeWidth: 1.5 },
        labelStyle: { fill: '#555560', fontSize: 8, fontFamily: '"SF Mono", ui-monospace, monospace' },
        labelBgStyle: { fill: '#0A0A0C', fillOpacity: 0.95 },
        animated: false,
      })),
    };
  }, [graph]);

  if (loading) {
    return (
      <div style={{ height: 400, borderRadius: T.radius, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: '0.72rem', flexDirection: 'column', gap: 8 }}>
        <div style={{ width: 18, height: 18, border: `2px solid ${T.border}`, borderTopColor: T.white, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: 400, borderRadius: T.radius, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <p style={{ fontSize: '0.72rem', color: T.textMuted }}>Unable to load investigation graph</p>
        {onRetry && <button onClick={onRetry} style={{ padding: '5px 14px', borderRadius: T.radius, background: T.white, color: T.bg, border: 'none', cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}>Retry</button>}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div style={{ height: 400, borderRadius: T.radius, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.72rem', color: T.textFaint, fontStyle: 'italic' }}>No relationship data available for this investigation.</p>
      </div>
    );
  }

  return (
    <div style={{ height: 400, borderRadius: T.radius, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }} style={{ background: '#050508' }}>
        <Background color="#1A1A1F" gap={20} size={1} />
        <Controls style={{ background: '#111113', borderColor: T.border, borderRadius: T.radius }} />
        <MiniMap
          nodeColor={n => {
            const risk = n.data?.risk;
            if (risk === 'malicious') return '#F87171';
            if (risk === 'suspicious') return '#FBBF24';
            if (risk === 'safe' || risk === 'clean') return '#4ADE80';
            return TYPES[n.data?.nodeType] || '#888890';
          }}
          maskColor="rgba(0,0,0,0.6)"
          style={{
            background: '#0A0A0C',
            border: `1px solid ${T.border}`,
            borderRadius: T.radius,
          }}
          pannable={false}
          zoomable={false}
        />
      </ReactFlow>
    </div>
  );
}
