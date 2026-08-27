import { useMemo } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { T, riskColor, statusColor } from '../theme';

const TYPES = {
  sender: '#FFF', domain: '#CCC', ip: '#AAA', url: '#DDD', asn: '#999', country: '#BBB',
};

function Node({ data }) {
  const bg = TYPES[data.nodeType] || '#888';
  const rc = data.risk === 'malicious' ? '#F87171' : data.risk === 'suspicious' ? '#FBBF24' : data.risk === 'safe' || data.risk === 'clean' ? '#4ADE80' : null;
  return (
    <div style={{
      padding: '6px 10px', borderRadius: T.radius, background: '#0A0A0A',
      border: `1px solid ${rc || '#333'}`, fontSize: '0.6rem', color: T.text,
      fontFamily: '"SF Mono", ui-monospace, monospace', maxWidth: 170,
      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    }}>
      <div style={{ fontSize: '0.5rem', color: bg, marginBottom: 2 }}>{data.nodeType}</div>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{data.label}</div>
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
        position: { x: (i % 4) * 190, y: Math.floor(i / 4) * 100 },
        data: { label: n.label || 'Unknown', nodeType: n.type || 'unknown', risk: n.risk || 'unknown' },
      })),
      edges: (graph.edges || []).filter(e => e?.source && e?.target).map(e => ({
        id: e.id || `${e.source}-${e.target}`,
        source: e.source,
        target: e.target,
        label: e.relationship || '',
        style: { stroke: '#333', strokeWidth: 1.5 },
        labelStyle: { fill: '#666', fontSize: 8 },
        labelBgStyle: { fill: '#0A0A0A', fillOpacity: 0.9 },
      })),
    };
  }, [graph]);

  if (loading) {
    return (
      <div style={{ height: 380, borderRadius: T.radius, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textDim, fontSize: '0.7rem' }}>
        Loading graph...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ height: 380, borderRadius: T.radius, border: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <p style={{ fontSize: '0.72rem', color: T.textMuted }}>Unable to load investigation graph</p>
        {onRetry && <button onClick={onRetry} style={{ padding: '4px 10px', borderRadius: T.radius, background: 'transparent', color: T.textDim, border: `1px solid ${T.border}`, cursor: 'pointer', fontSize: '0.65rem' }}>Retry</button>}
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div style={{ height: 380, borderRadius: T.radius, border: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontSize: '0.72rem', color: T.textFaint, fontStyle: 'italic' }}>No relationship data available for this investigation.</p>
      </div>
    );
  }

  return (
    <div style={{ height: 380, borderRadius: T.radius, overflow: 'hidden', border: `1px solid ${T.border}` }}>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView proOptions={{ hideAttribution: true }} style={{ background: '#050505' }}>
        <Background color="#222" gap={18} size={1} />
        <Controls style={{ background: '#111', borderColor: T.border }} />
        <MiniMap
          nodeColor={n => {
            const risk = n.data?.risk;
            if (risk === 'malicious') return '#F87171';
            if (risk === 'suspicious') return '#FBBF24';
            if (risk === 'safe' || risk === 'clean') return '#4ADE80';
            return TYPES[n.data?.nodeType] || '#888';
          }}
          maskColor="rgba(0,0,0,0.55)"
          style={{
            background: '#0A0A0A',
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
