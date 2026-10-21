// Diagram activity built on React Flow: drag nodes to move them, drag from a
// node's bottom handle to another node to connect, Backspace deletes the selection.
// Saved state stays library-agnostic (plain nodes/edges) and is mapped to React Flow here.

import { useEffect, useRef, useState } from 'react';
import {
  ReactFlow, Background, Controls, MarkerType, addEdge, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ActivityProps } from '../../types/contracts';

export interface DiagramState {
  nodes: { id: string; label: string; x: number; y: number }[];
  edges: { id: string; source: string; target: string }[];
}

type FlowNode = Node<{ label: string }>;

const toFlowNodes = (s: DiagramState): FlowNode[] =>
  s.nodes.map((n) => ({ id: n.id, position: { x: n.x, y: n.y }, data: { label: n.label } }));

const toFlowEdges = (s: DiagramState): Edge[] =>
  s.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }));

const toState = (nodes: FlowNode[], edges: Edge[]): DiagramState => ({
  nodes: nodes.map((n) => ({ id: n.id, label: n.data.label, x: Math.round(n.position.x), y: Math.round(n.position.y) })),
  edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
});

const EDGE_OPTIONS = { markerEnd: { type: MarkerType.ArrowClosed } };

export function DiagramActivity({ savedState, onChange }: ActivityProps<DiagramState>) {
  const [nodes, setNodes] = useState<FlowNode[]>(() => toFlowNodes(savedState ?? { nodes: [], edges: [] }));
  const [edges, setEdges] = useState<Edge[]>(() => toFlowEdges(savedState ?? { nodes: [], edges: [] }));
  const [label, setLabel] = useState('');

  // Report after state settles, and only for changes to the student's work —
  // not selection, measurement, or every pixel of an in-progress drag.
  const pendingReport = useRef(false);
  useEffect(() => {
    if (!pendingReport.current) return;
    pendingReport.current = false;
    onChange(toState(nodes, edges));
  }, [nodes, edges]);

  const onNodesChange = (changes: NodeChange<FlowNode>[]) => {
    if (changes.some((c) => c.type === 'remove' || (c.type === 'position' && c.dragging === false))) {
      pendingReport.current = true;
    }
    setNodes((ns) => applyNodeChanges(changes, ns));
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    if (changes.some((c) => c.type === 'remove')) pendingReport.current = true;
    setEdges((es) => applyEdgeChanges(changes, es));
  };

  const onConnect = (connection: Connection) => {
    pendingReport.current = true;
    setEdges((es) => addEdge({ ...connection, id: `e${Date.now()}` }, es));
  };

  const addNode = () => {
    if (!label.trim()) return;
    const i = nodes.length;
    pendingReport.current = true;
    setNodes((ns) => [
      ...ns,
      { id: `n${Date.now()}`, position: { x: 40 + (i % 4) * 180, y: 40 + Math.floor(i / 4) * 100 }, data: { label: label.trim() } },
    ]);
    setLabel('');
  };

  const clear = () => {
    pendingReport.current = true;
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="activity">
      <div className="toolbar">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addNode()}
          placeholder="Stage name"
          aria-label="New node label"
        />
        <button onClick={addNode}>Add node</button>
        <button onClick={clear} disabled={!nodes.length}>Clear</button>
        <span className="hint">
          Drag nodes to move them. Drag from a node’s bottom dot to another node to connect. Select + Backspace deletes. Zoom with + / − or pinch.
        </span>
      </div>
      <div className="canvas diagram-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          isValidConnection={(c) => c.source !== c.target}
          defaultEdgeOptions={EDGE_OPTIONS}
          colorMode="light"
          zoomOnScroll={false}
          preventScrolling={false}
          fitView
          fitViewOptions={{ maxZoom: 1 }}
        >
          <Background />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
