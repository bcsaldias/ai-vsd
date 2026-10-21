// Stakeholder Tokens (after Yoo, 2018): students place stakeholder tokens on rings
// around what they are designing (core, peripheral, excluded), connect them, and
// annotate them with harms, benefits, and values. One board is shared by every step of
// the lesson; `config.step` decides which tools are available (see STEP in model.ts).
// React Flow handles the canvas; the saved state is the plain board from model.ts.

import { useEffect, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow, Controls, ConnectionMode, ConnectionLineType, MarkerType, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ActivityProps } from '../../types/contracts';
import {
  CONTEXT_LABEL, CONTEXT_SIZE, LAST_STEP, RADIUS, RING_LABEL, TOKEN_SIZE, addLink, addToken, allows, hasLink,
  linkLabel, moveToken, newId, normalize, removeLinks, removeTokens,
  type Link, type StakeholderTokensState, type Token,
} from './model';
import { BoardContext, ContextNode, LinkEdge, RingsNode, TokenNode } from './BoardNodes';
import { Inspector, type Selection } from './Inspector';

export type { StakeholderTokensState } from './model';

type Board = StakeholderTokensState;
type BoardNode = Node<Record<string, never>>;

const RINGS_ID = '__rings';
const CONTEXT_ID = '__context';
const DRAG_TYPE = 'application/x-stakeholder-token';

const nodeTypes = { rings: RingsNode, context: ContextNode, token: TokenNode };
const edgeTypes = { link: LinkEdge };

/** Builds React Flow nodes from the board, keeping what React Flow tracks itself (size, drag state). */
function toNodes(prev: BoardNode[], board: Board, selection: Selection): BoardNode[] {
  const byId = new Map(prev.map((n) => [n.id, n]));
  const keep = (next: BoardNode): BoardNode => {
    const old = byId.get(next.id);
    return old ? { ...old, ...next, position: old.dragging ? old.position : next.position } : next;
  };
  const describe = (t: Token) =>
    `${t.label || 'Unnamed'}: ${t.kind} stakeholder, ${RING_LABEL[t.ring].toLowerCase()}${t.difficult ? ', difficult' : ''}`;

  return [
    keep({
      id: RINGS_ID, type: 'rings', data: {}, position: { x: -RADIUS.board, y: -RADIUS.board }, zIndex: -1,
      draggable: false, selectable: false, connectable: false, deletable: false, focusable: false,
    }),
    keep({
      id: CONTEXT_ID, type: 'context', data: {}, position: { x: -CONTEXT_SIZE / 2, y: -CONTEXT_SIZE / 2 },
      draggable: false, connectable: false, deletable: false, selected: selection?.id === CONTEXT_ID,
      ariaLabel: `${CONTEXT_LABEL[board.context.type]}: ${board.context.label || 'not named yet'}`,
    }),
    ...board.tokens.map((t) => keep({
      id: t.id, type: 'token', data: {}, position: { x: t.x - TOKEN_SIZE / 2, y: t.y - TOKEN_SIZE / 2 },
      selected: selection?.id === t.id, ariaLabel: describe(t),
    })),
  ];
}

function toEdges(board: Board, selection: Selection): Edge[] {
  return board.links.map((l) => ({
    id: l.id,
    source: l.source,
    target: l.target,
    type: 'link',
    className: l.type,
    data: { type: l.type },
    label: linkLabel(board, l),
    selected: selection?.id === l.id,
    markerEnd: l.type === 'relationship' ? { type: MarkerType.ArrowClosed } : undefined,
    ariaLabel: `${l.type} between ${board.tokens.find((t) => t.id === l.source)?.label || 'Unnamed'} and ${board.tokens.find((t) => t.id === l.target)?.label || 'Unnamed'}`,
  }));
}

export function StakeholderTokensActivity({ prompt, savedState, onChange, config }: ActivityProps<Board>) {
  const step = typeof config?.step === 'number' ? config.step : LAST_STEP;
  const [board, setBoard] = useState<Board>(() => normalize(savedState));
  const [selection, setSelection] = useState<Selection>(null);
  const [nodes, setNodes] = useState<BoardNode[]>(() => toNodes([], board, null));
  const [edges, setEdges] = useState<Edge[]>(() => toEdges(board, null));
  const [flow, setFlow] = useState<ReactFlowInstance<BoardNode, Edge> | null>(null);
  const [newName, setNewName] = useState('');
  const [connectAs, setConnectAs] = useState<Link['type']>('relationship');

  // From the tensions step on, new connections default to tensions.
  useEffect(() => setConnectAs(allows(step, 'tensions') ? 'tension' : 'relationship'), [step]);

  // Report only after edits to the student's work settle — not selection or mid-drag movement.
  const pendingReport = useRef(false);
  const update = (fn: (b: Board) => Board) => {
    pendingReport.current = true;
    setBoard(fn);
  };
  useEffect(() => {
    if (pendingReport.current) {
      pendingReport.current = false;
      onChange(board);
    }
  }, [board]);

  useEffect(() => {
    setNodes((ns) => toNodes(ns, board, selection));
    setEdges(toEdges(board, selection));
  }, [board, selection]);

  const trackSelection = (changes: (NodeChange<BoardNode> | EdgeChange)[], kind: 'node' | 'link') => {
    for (const c of changes) {
      if (c.type !== 'select') continue;
      const next: Selection = kind === 'link' ? { kind: 'link', id: c.id } : { kind: c.id === CONTEXT_ID ? 'context' : 'token', id: c.id };
      setSelection((s) => (c.selected ? next : s?.id === c.id ? null : s));
    }
  };

  const onNodesChange = (changes: NodeChange<BoardNode>[]) => {
    const removed = new Set(changes.flatMap((c) => (c.type === 'remove' ? [c.id] : [])));
    if (removed.size) update((b) => removeTokens(b, removed));
    trackSelection(changes, 'node');
    setNodes((ns) => applyNodeChanges(changes, ns));
  };

  const onEdgesChange = (changes: EdgeChange[]) => {
    const removed = new Set(changes.flatMap((c) => (c.type === 'remove' ? [c.id] : [])));
    if (removed.size) update((b) => removeLinks(b, removed));
    trackSelection(changes, 'link');
    setEdges((es) => applyEdgeChanges(changes, es));
  };

  const isToken = (id: string | null) => !!id && board.tokens.some((t) => t.id === id);
  const isValidConnection = (c: Connection | Edge) =>
    c.source !== c.target && isToken(c.source) && isToken(c.target) && !hasLink(board, c.source, c.target, connectAs);

  const onConnect = (c: Connection) => {
    const id = newId('l');
    update((b) => addLink(b, id, c.source, c.target, connectAs));
    setSelection({ kind: 'link', id });
  };

  const add = (kind: Token['kind'], at?: { x: number; y: number }) => {
    const id = newId('t');
    update((b) => addToken(b, { id, kind, label: newName.trim() }, at));
    setSelection({ kind: 'token', id });
    setNewName('');
  };

  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: DragEvent) => {
    const kind = e.dataTransfer.getData(DRAG_TYPE);
    if (!flow || (kind !== 'direct' && kind !== 'indirect')) return;
    e.preventDefault();
    add(kind, flow.screenToFlowPosition({ x: e.clientX, y: e.clientY }));
  };

  const paletteToken = (kind: Token['kind'], label: string) => (
    // A div, not a <button>: browsers don't reliably start drags on buttons.
    <div
      role="button"
      tabIndex={0}
      className={`palette-token ${kind}`}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_TYPE, kind);
        e.dataTransfer.effectAllowed = 'copy';
      }}
      onClick={() => add(kind)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          add(kind);
        }
      }}
      title="Drag onto the rings, or click to add"
    >
      {label}
    </div>
  );

  const canConnect = allows(step, 'relationships');

  return (
    <div className="activity">
      <p className="activity-prompt">{prompt}</p>
      <div className="tokens-layout">
        <div className="token-palette">
          {allows(step, 'direct') ? (
            <>
              <label className="field">
                <span>New stakeholder</span>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && add(allows(step, 'indirect') ? 'indirect' : 'direct')}
                  placeholder="A role, e.g. Teachers"
                />
              </label>
              {paletteToken('direct', 'Direct')}
              {allows(step, 'indirect') && paletteToken('indirect', 'Indirect')}
              <p className="hint">Drag a token onto the rings, or click to add it. Move it to change its ring.</p>
            </>
          ) : (
            <p className="hint">First, name what you’re designing: select the centre of the board.</p>
          )}
          {allows(step, 'tensions') && (
            <fieldset className="field">
              <legend>Dragging between tokens adds a…</legend>
              <div className="choices">
                <label><input type="radio" name="connect-as" checked={connectAs === 'relationship'} onChange={() => setConnectAs('relationship')} /> Relationship</label>
                <label><input type="radio" name="connect-as" checked={connectAs === 'tension'} onChange={() => setConnectAs('tension')} /> Tension ⚡</label>
              </div>
            </fieldset>
          )}
          {canConnect && !allows(step, 'tensions') && (
            <p className="hint">Drag from a token’s dot to another token to connect them.</p>
          )}
          <ul className="token-legend" aria-label="Legend">
            <li><span className="swatch direct" /> Direct</li>
            <li><span className="swatch indirect" /> Indirect</li>
            {allows(step, 'difficult') && <li><span className="swatch difficult" /> Difficult</li>}
          </ul>
        </div>

        <div className={`canvas tokens-board${canConnect ? ' can-connect' : ''}`} onDragOver={onDragOver} onDrop={onDrop}>
          <BoardContext.Provider value={{ board, step }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStop={(_, __, dragged) =>
                update((b) => dragged.reduce((acc, n) => moveToken(acc, n.id, n.position.x + TOKEN_SIZE / 2, n.position.y + TOKEN_SIZE / 2), b))
              }
              onInit={setFlow}
              isValidConnection={isValidConnection}
              nodesConnectable={canConnect}
              connectionMode={ConnectionMode.Loose}
              connectionLineType={ConnectionLineType.Straight}
              connectionRadius={40}
              deleteKeyCode={['Backspace', 'Delete']}
              multiSelectionKeyCode={null}
              selectionKeyCode={null}
              colorMode="light"
              zoomOnScroll={false}
              preventScrolling={false}
              minZoom={0.2}
              fitView
              fitViewOptions={{ padding: 0.04, maxZoom: 1 }}
            >
              <Controls showInteractive={false} />
            </ReactFlow>
          </BoardContext.Provider>
        </div>

        <Inspector board={board} step={step} selection={selection} update={update} select={setSelection} />
      </div>
    </div>
  );
}
