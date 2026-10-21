// Placeholder diagram activity: plain SVG. State shape mirrors React Flow's
// nodes/edges so it can be swapped for React Flow without changing the contract.

import { useState } from 'react';
import type { ActivityProps } from '../../types/contracts';

export interface DiagramState {
  nodes: { id: string; label: string; x: number; y: number }[];
  edges: { id: string; source: string; target: string }[];
}

const EMPTY: DiagramState = { nodes: [], edges: [] };
const NODE_W = 120;
const NODE_H = 40;

export function DiagramActivity({ prompt, savedState, onChange }: ActivityProps<DiagramState>) {
  const [state, setState] = useState<DiagramState>(savedState ?? EMPTY);
  const [label, setLabel] = useState('');
  const [pendingSource, setPendingSource] = useState<string | null>(null);

  const update = (next: DiagramState) => {
    setState(next);
    onChange(next);
  };

  const addNode = () => {
    if (!label.trim()) return;
    const i = state.nodes.length;
    const node = { id: `n${Date.now()}`, label: label.trim(), x: 20 + (i % 4) * 160, y: 20 + Math.floor(i / 4) * 80 };
    update({ ...state, nodes: [...state.nodes, node] });
    setLabel('');
  };

  const clickNode = (id: string) => {
    if (!pendingSource) return setPendingSource(id);
    if (pendingSource !== id) {
      const edge = { id: `e${Date.now()}`, source: pendingSource, target: id };
      update({ ...state, edges: [...state.edges, edge] });
    }
    setPendingSource(null);
  };

  const byId = new Map(state.nodes.map((n) => [n.id, n]));

  return (
    <div className="activity">
      <p className="activity-prompt">{prompt}</p>
      <div className="toolbar">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNode()}
          placeholder="Stage name"
          aria-label="New node label"
        />
        <button onClick={addNode}>Add node</button>
        <button onClick={() => update(EMPTY)} disabled={!state.nodes.length}>Clear</button>
        <span className="hint">
          {pendingSource ? 'Click a second node to connect it.' : 'Click two nodes to connect them.'}
        </span>
      </div>
      <svg className="canvas" viewBox="0 0 660 260" role="img" aria-label="Diagram canvas">
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="8" markerHeight="8" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="currentColor" />
          </marker>
        </defs>
        {state.edges.map((e) => {
          const s = byId.get(e.source);
          const t = byId.get(e.target);
          if (!s || !t) return null;
          return (
            <line
              key={e.id}
              x1={s.x + NODE_W / 2} y1={s.y + NODE_H / 2}
              x2={t.x + NODE_W / 2} y2={t.y + NODE_H / 2}
              className="edge" markerEnd="url(#arrow)"
            />
          );
        })}
        {state.nodes.map((n) => (
          <g key={n.id} className={`node ${pendingSource === n.id ? 'selected' : ''}`} onClick={() => clickNode(n.id)}>
            <rect x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={8} />
            <text x={n.x + NODE_W / 2} y={n.y + NODE_H / 2} dominantBaseline="middle" textAnchor="middle">
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
