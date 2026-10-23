// Stakeholder Tokens (after Yoo, 2018): students place stakeholder tokens on rings
// around what they are designing (core, peripheral, excluded), connect them, and
// annotate them with harms, benefits, and values. One board is shared by every step of
// the lesson; `config.step` decides which tools are available (see STEP in model.ts).
// React Flow handles the canvas; the saved state is the plain board from model.ts.

import { useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  ReactFlow, Controls, ConnectionMode, ConnectionLineType, MarkerType, applyEdgeChanges, applyNodeChanges,
  type Connection, type Edge, type EdgeChange, type Node, type NodeChange, type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { ActivityProps } from '../../types/contracts';
import {
  CONTEXT_LABEL, CONTEXT_SIZE, LAST_STEP, RADIUS, RING_LABEL, TOKEN_SIZE, addLink, addToken, allows, guide, hasLink,
  forStep, linkLabel, moveToken, newId, normalize, removeLinks, removeTokens, tokenLabel,
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
/** How the board is framed: the whole rings, never zoomed past 100%. */
const FIT_VIEW = { padding: 0.04, maxZoom: 1 };

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
    `${t.label || 'Unnamed'}: ${t.kind} stakeholder, ${RING_LABEL[t.ring].toLowerCase()}${t.overlooked ? ', hidden or overlooked' : ''}`;

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
    // One-way relationships point at the stakeholder affected; mutual ones and tensions have no arrowhead.
    markerEnd: l.type === 'relationship' && !l.mutual ? { type: MarkerType.ArrowClosed } : undefined,
    ariaLabel: l.type === 'relationship' && !l.mutual
      ? `relationship from ${tokenLabel(board, l.source)} to ${tokenLabel(board, l.target)}`
      : `${l.mutual ? 'mutual relationship' : l.type} between ${tokenLabel(board, l.source)} and ${tokenLabel(board, l.target)}`,
  }));
}

export function StakeholderTokensActivity({ savedState, onChange, config, example }: ActivityProps<Board>) {
  const step = typeof config?.step === 'number' ? config.step : LAST_STEP;
  const [stored, setBoard] = useState<Board>(() => normalize(savedState));
  // A worked example is read-only and shows only what exists by the current step.
  const board = useMemo(() => (example ? forStep(stored, step) : stored), [stored, step, example]);
  const [selection, setSelection] = useState<Selection>(null);
  const [nodes, setNodes] = useState<BoardNode[]>(() => toNodes([], board, null));
  const [edges, setEdges] = useState<Edge[]>(() => toEdges(board, null));
  const [flow, setFlow] = useState<ReactFlowInstance<BoardNode, Edge> | null>(null);
  // A token just added from the palette: the inspector puts the cursor in its Name field.
  const [nameRequest, setNameRequest] = useState<string | null>(null);
  const [connectAs, setConnectAs] = useState<Link['type']>('relationship');

  // The board can mount while its tab is hidden (a refresh on Prompts, a lesson switch on Versions),
  // and fitView then frames the rings in a 0×0 box: tiny, in the top-left corner. Fit again once the
  // board is shown. Only on hidden → shown, so a student's own zoom survives panel resizing.
  const canvasRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = canvasRef.current;
    if (!el || !flow) return;
    let hidden = el.clientWidth === 0 || el.clientHeight === 0;
    const observer = new ResizeObserver(() => {
      const nowHidden = el.clientWidth === 0 || el.clientHeight === 0;
      // A frame later, so React Flow has measured the nodes at their real size.
      if (hidden && !nowHidden) requestAnimationFrame(() => flow.fitView(FIT_VIEW));
      hidden = nowHidden;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [flow]);

  // From the tensions step on, new connections default to tensions.
  useEffect(() => setConnectAs(allows(step, 'tensions') ? 'tension' : 'relationship'), [step]);

  // Report only after edits to the student's work settle — not selection or mid-drag movement.
  const pendingReport = useRef(false);
  const update = (fn: (b: Board) => Board) => {
    if (example) return;
    pendingReport.current = true;
    setBoard(fn);
  };
  useEffect(() => {
    if (pendingReport.current) {
      pendingReport.current = false;
      onChange(stored);
    }
  }, [stored]);

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

  // Add first, then name: like picking up a token and writing its label.
  const add = (kind: Token['kind'], at?: { x: number; y: number }) => {
    const id = newId('t');
    update((b) => addToken(b, { id, kind, label: '' }, at));
    setSelection({ kind: 'token', id });
    setNameRequest(id);
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
      {...guide(step, kind)}
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

  const canConnect = allows(step, 'relationships') && !example;

  return (
    <div className="activity">
      <div className="tokens-layout">
        <div className="token-palette">
          {example ? (
            <p className="example-note">
              <strong>Example</strong> (read only). Select tokens and connections to read the notes in the panel on the right.
            </p>
          ) : allows(step, 'direct') ? (
            <>
              <span className="palette-title">Add a stakeholder</span>
              {paletteToken('direct', 'Direct')}
              {allows(step, 'indirect') && paletteToken('indirect', 'Indirect')}
              <p className="hint">Drag a token onto the rings (or click it), then name it. Move it to change its ring.</p>
            </>
          ) : (
            <p className="hint">First, name what you’re designing: select the centre of the board.</p>
          )}
          {allows(step, 'tensions') && !example && (
            <fieldset className="field" {...guide(step, 'tensions')}>
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
            {allows(step, 'overlooked') && <li><span className="swatch overlooked" /> Hidden or overlooked</li>}
          </ul>
        </div>

        <div className="board-column">
          {/* The starting point in full, as the board's heading; the centre token has room for only a few words. */}
          <button className="board-heading" onClick={() => setSelection({ kind: 'context', id: CONTEXT_ID })} title="Edit the starting point">
            <span className="context-type">{CONTEXT_LABEL[board.context.type]}</span>
            <span className={board.context.label ? 'board-heading-label' : 'board-heading-label placeholder'}>
              {board.context.label || 'Name what you’re designing'}
            </span>
          </button>
        <div ref={canvasRef} className={`canvas tokens-board${canConnect ? ' can-connect' : ''}`} onDragOver={onDragOver} onDrop={onDrop}>
          <BoardContext.Provider value={{ board, step }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={example ? undefined : onConnect}
              onNodeDragStop={(_, __, dragged) =>
                update((b) => dragged.reduce((acc, n) => moveToken(acc, n.id, n.position.x + TOKEN_SIZE / 2, n.position.y + TOKEN_SIZE / 2), b))
              }
              onInit={setFlow}
              isValidConnection={isValidConnection}
              nodesConnectable={canConnect}
              nodesDraggable={!example}
              connectionMode={ConnectionMode.Loose}
              connectionLineType={ConnectionLineType.Straight}
              connectionRadius={40}
              deleteKeyCode={example ? null : ['Backspace', 'Delete']}
              multiSelectionKeyCode={null}
              selectionKeyCode={null}
              colorMode="light"
              zoomOnScroll={false}
              preventScrolling={false}
              minZoom={0.2}
              fitView
              fitViewOptions={FIT_VIEW}
            >
              <Controls showInteractive={false} />
            </ReactFlow>
          </BoardContext.Provider>
        </div>
        </div>

        <Inspector
          board={board}
          step={step}
          selection={selection}
          update={update}
          select={setSelection}
          readOnly={example}
          nameRequest={nameRequest}
          onNameFocused={() => setNameRequest(null)}
        />
      </div>
    </div>
  );
}
