// React Flow node and edge components for the token board. They read the board
// from context, so node data only needs an id.

import { createContext, useContext } from 'react';
import {
  BaseEdge, Handle, Position, useInternalNode,
  type Edge, type EdgeProps, type InternalNode, type NodeProps,
} from '@xyflow/react';
import {
  CONTEXT_LABEL, RADIUS, allows, tokenValueIds, valueName,
  type Link, type StakeholderTokensState,
} from './model';

export const BoardContext = createContext<{ board: StakeholderTokensState; step: number } | null>(null);

function useBoard() {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error('Board nodes must render inside BoardContext');
  return ctx;
}

/** The rings themselves: a non-interactive node, so fitView frames the whole board. */
export function RingsNode() {
  const r = RADIUS.board;
  return (
    <svg className="rings" width={r * 2} height={r * 2} viewBox={`${-r} ${-r} ${r * 2} ${r * 2}`} aria-hidden="true">
      <circle className="ring excluded" r={RADIUS.board - 1} />
      <circle className="ring peripheral" r={RADIUS.peripheral} />
      <circle className="ring core" r={RADIUS.core} />
      <text y={-RADIUS.board + 32}>Excluded</text>
      <text y={-RADIUS.peripheral + 28}>Peripheral</text>
      <text y={-RADIUS.core + 26}>Core</text>
    </svg>
  );
}

/** What is being designed, fixed at the centre of the board. */
export function ContextNode() {
  const { board } = useBoard();
  return (
    <div className="context-token">
      <span className="context-type">{CONTEXT_LABEL[board.context.type]}</span>
      <span className={board.context.label ? undefined : 'placeholder'}>{board.context.label || 'Name what you’re designing'}</span>
    </div>
  );
}

export function TokenNode({ id }: NodeProps) {
  const { board, step } = useBoard();
  const token = board.tokens.find((t) => t.id === id);
  if (!token) return null;

  const impacts = board.impacts.filter((i) => i.tokenId === id);
  const harms = impacts.filter((i) => i.kind === 'harm').length;
  const benefits = impacts.length - harms;
  const values = tokenValueIds(board, id).map((v) => valueName(board, v)).filter(Boolean);

  return (
    <div className={`token ${token.kind}${token.overlooked ? ' overlooked' : ''}`} title={token.label || undefined}>
      <span className="token-label">{token.label || 'Unnamed'}</span>
      {token.overlooked && <span className="token-flag" aria-hidden="true">?</span>}
      {(impacts.length > 0 || values.length > 0) && (
        <div className="token-notes" aria-hidden="true">
          {harms > 0 && <span className="chip harm">−{harms}</span>}
          {benefits > 0 && <span className="chip benefit">+{benefits}</span>}
          {values.slice(0, 2).map((v) => <span key={v} className="chip value">{v}</span>)}
          {values.length > 2 && <span className="chip value">+{values.length - 2}</span>}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={allows(step, 'relationships')} />
    </div>
  );
}

const centre = (n: InternalNode) => ({
  x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
  y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
});

const TENSION_BEND = 36;

/** Line between token centres, trimmed to the token edges so arrowheads stay visible.
    Relationships are straight; tensions bow to one side so both can join the same pair. */
export function LinkEdge({ id, source, target, markerEnd, label, data }: EdgeProps<Edge<{ type: Link['type'] }>>) {
  const s = useInternalNode(source);
  const t = useInternalNode(target);
  if (!s || !t) return null;

  const a = centre(s);
  const b = centre(t);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const [ux, uy] = [(b.x - a.x) / len, (b.y - a.y) / len];
  const ra = (s.measured.width ?? 0) / 2 + 2;
  const rb = (t.measured.width ?? 0) / 2 + 4;
  const bend = data?.type === 'tension' ? TENSION_BEND : 0;
  // Bending pulls the ends slightly off-centre; rotate them toward the bend so they still meet the disc edge.
  const tilt = Math.atan2(bend, len / 2);
  const rot = (x: number, y: number, ang: number) => [x * Math.cos(ang) - y * Math.sin(ang), x * Math.sin(ang) + y * Math.cos(ang)];
  const [sx, sy] = rot(ux, uy, -tilt);
  const [tx, ty] = rot(-ux, -uy, tilt);
  const start = { x: a.x + sx * ra, y: a.y + sy * ra };
  const end = { x: b.x + tx * rb, y: b.y + ty * rb };
  // Quadratic curve whose control point sits off the midpoint, perpendicular to the line.
  const ctrl = { x: (a.x + b.x) / 2 + uy * bend * 2, y: (a.y + b.y) / 2 - ux * bend * 2 };
  const path = `M ${start.x},${start.y} Q ${ctrl.x},${ctrl.y} ${end.x},${end.y}`;
  const labelX = (start.x + 2 * ctrl.x + end.x) / 4;
  const labelY = (start.y + 2 * ctrl.y + end.y) / 4;

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      label={label}
      labelX={labelX}
      labelY={labelY}
      labelShowBg
      labelBgPadding={[6, 3]}
      labelBgBorderRadius={0}
    />
  );
}
