// Board model for the Stakeholder Tokens activity: plain data and pure updates,
// with no React Flow types, so the saved state stays library-independent.

export type Ring = 'core' | 'peripheral' | 'excluded';
export type ContextType = 'technology' | 'value' | 'context';

export interface Token {
  id: string;
  label: string;
  /** Direct stakeholders interact with the technology or its outputs; indirect ones are affected without using it. */
  kind: 'direct' | 'indirect';
  /** Which ring the token sits in; follows from its position on the board. */
  ring: Ring;
  /** Easy to miss: hidden, overlooked, or neglected (Yoo 2018). */
  overlooked: boolean;
  /** Centre of the token in board coordinates. The board's centre is (0, 0). */
  x: number;
  y: number;
}

/** A harm or benefit a stakeholder could experience, traced to the values it touches. */
export interface Impact {
  id: string;
  tokenId: string;
  kind: 'harm' | 'benefit';
  text: string;
  valueIds: string[];
}

export interface Value {
  id: string;
  name: string;
  /** What the value means in this context (conceptual investigation). */
  definition: string;
  /** Who in the organization takes responsibility for it, and what they will do. */
  owner: string;
  action: string;
}

export interface Link {
  id: string;
  source: string;
  target: string;
  /** relationship: how two stakeholders affect each other. tension: their values pull against each other. */
  type: 'relationship' | 'tension';
  /** Relationship: how they relate ("cares for"). Tension: a short description. */
  label: string;
  /** Tension only: the value at stake on each side. */
  sourceValueId?: string;
  targetValueId?: string;
  owner?: string;
  action?: string;
}

export interface StakeholderTokensState {
  context: { type: ContextType; label: string };
  tokens: Token[];
  links: Link[];
  impacts: Impact[];
  values: Value[];
}

// ---------- Steps ----------

/** The step at which each tool becomes available. Earlier tools stay available in later steps. */
export const STEP = {
  context: 1,
  direct: 2,
  indirect: 3,
  excluded: 3,
  overlooked: 3,
  relationships: 4,
  impacts: 5,
  values: 6,
  definitions: 7,
  tensions: 8,
  organization: 9,
} as const;
export const LAST_STEP = 9;

export type Tool = keyof typeof STEP;
export const allows = (step: number, tool: Tool) => step >= STEP[tool];

/** Marks where a tool lives: data-guide names it (the learning workspace can spotlight it from the
    step card), and data-new flags it in the step that introduces it. */
export const guide = (step: number, tool: Tool) => ({
  'data-guide': tool,
  'data-new': STEP[tool] === step ? '' : undefined,
});

// ---------- Geometry ----------

/** Outer radius of each ring. Anything beyond `peripheral` is excluded; `board` is where the drawing stops. */
export const RADIUS = { core: 150, peripheral: 265, board: 355 };
export const TOKEN_SIZE = 88;
export const CONTEXT_SIZE = 112;
// Token and centre sizes must match .token and .context-token in styles.css.

export const RING_LABEL: Record<Ring, string> = { core: 'Core', peripheral: 'Peripheral', excluded: 'Excluded' };
export const CONTEXT_LABEL: Record<ContextType, string> = { technology: 'Technology', value: 'Value', context: 'Context of use' };

export function ringAt(x: number, y: number): Ring {
  const d = Math.hypot(x, y);
  return d <= RADIUS.core ? 'core' : d <= RADIUS.peripheral ? 'peripheral' : 'excluded';
}

/** Distance from the centre at which a token sits in the middle of each ring. */
const RING_MIDDLE: Record<Ring, number> = {
  core: (CONTEXT_SIZE / 2 + TOKEN_SIZE / 2 + RADIUS.core) / 2,
  peripheral: (RADIUS.core + RADIUS.peripheral) / 2,
  excluded: (RADIUS.peripheral + RADIUS.board) / 2,
};

function pointInRing(angle: number, ring: Ring) {
  const r = RING_MIDDLE[ring];
  return { x: Math.round(Math.cos(angle) * r), y: Math.round(Math.sin(angle) * r) };
}

// ---------- Construction ----------

export const emptyBoard = (): StakeholderTokensState => ({
  context: { type: 'technology', label: '' },
  tokens: [],
  links: [],
  impacts: [],
  values: [],
});

/** Fills in anything missing from saved state, so older or partial saves still load. */
export function normalize(saved: Partial<StakeholderTokensState> | null): StakeholderTokensState {
  const base = emptyBoard();
  return {
    context: { ...base.context, ...saved?.context },
    // `overlooked` was called `difficult` in earlier saves.
    tokens: (saved?.tokens ?? []).map((t) => ({ ...t, overlooked: t.overlooked ?? (t as { difficult?: boolean }).difficult ?? false })),
    links: saved?.links ?? [],
    impacts: saved?.impacts ?? [],
    values: saved?.values ?? [],
  };
}

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

// ---------- Updates (pure: board in, board out) ----------

type Board = StakeholderTokensState;

function patchIn<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

export const patchContext = (b: Board, patch: Partial<Board['context']>): Board => ({ ...b, context: { ...b.context, ...patch } });
export const patchToken = (b: Board, id: string, patch: Partial<Token>): Board => ({ ...b, tokens: patchIn(b.tokens, id, patch) });
export const patchLink = (b: Board, id: string, patch: Partial<Link>): Board => ({ ...b, links: patchIn(b.links, id, patch) });
export const patchImpact = (b: Board, id: string, patch: Partial<Impact>): Board => ({ ...b, impacts: patchIn(b.impacts, id, patch) });
export const patchValue = (b: Board, id: string, patch: Partial<Value>): Board => ({ ...b, values: patchIn(b.values, id, patch) });

/** Adds a token at `at`, or (without a position) spread around the peripheral ring. */
export function addToken(b: Board, token: Pick<Token, 'id' | 'label' | 'kind'>, at?: { x: number; y: number }): Board {
  // Golden-angle spacing keeps successive tokens apart; the offset keeps them clear of the ring labels at the top.
  const p = at ?? pointInRing(-Math.PI / 2 + 0.6 + b.tokens.length * 2.39996, 'peripheral');
  return { ...b, tokens: [...b.tokens, { ...token, overlooked: false, x: Math.round(p.x), y: Math.round(p.y), ring: ringAt(p.x, p.y) }] };
}

export function moveToken(b: Board, id: string, x: number, y: number): Board {
  return patchToken(b, id, { x: Math.round(x), y: Math.round(y), ring: ringAt(x, y) });
}

/** Moves a token into the middle of another ring, keeping its direction from the centre. */
export function moveToRing(b: Board, id: string, ring: Ring): Board {
  const t = b.tokens.find((tk) => tk.id === id);
  if (!t) return b;
  const angle = t.x === 0 && t.y === 0 ? -Math.PI / 2 : Math.atan2(t.y, t.x);
  return patchToken(b, id, { ...pointInRing(angle, ring), ring });
}

export function removeTokens(b: Board, ids: Set<string>): Board {
  return {
    ...b,
    tokens: b.tokens.filter((t) => !ids.has(t.id)),
    links: b.links.filter((l) => !ids.has(l.source) && !ids.has(l.target)),
    impacts: b.impacts.filter((i) => !ids.has(i.tokenId)),
  };
}

export function hasLink(b: Board, source: string, target: string, type: Link['type']): boolean {
  return b.links.some(
    (l) => l.type === type && ((l.source === source && l.target === target) || (l.source === target && l.target === source)),
  );
}

export function addLink(b: Board, id: string, source: string, target: string, type: Link['type']): Board {
  if (source === target || hasLink(b, source, target, type)) return b;
  return { ...b, links: [...b.links, { id, source, target, type, label: '' }] };
}

export const removeLinks = (b: Board, ids: Set<string>): Board => ({ ...b, links: b.links.filter((l) => !ids.has(l.id)) });

export function addImpact(b: Board, id: string, tokenId: string, kind: Impact['kind']): Board {
  return { ...b, impacts: [...b.impacts, { id, tokenId, kind, text: '', valueIds: [] }] };
}

export const removeImpact = (b: Board, id: string): Board => ({ ...b, impacts: b.impacts.filter((i) => i.id !== id) });

/** Tags an impact with a value by name, reusing an existing value with the same name (case-insensitive). */
export function tagImpact(b: Board, impactId: string, name: string, newValueId: string): Board {
  const trimmed = name.trim();
  if (!trimmed) return b;
  const existing = b.values.find((v) => v.name.trim().toLowerCase() === trimmed.toLowerCase());
  const value = existing ?? { id: newValueId, name: trimmed, definition: '', owner: '', action: '' };
  const values = existing ? b.values : [...b.values, value];
  const impacts = b.impacts.map((i) =>
    i.id === impactId && !i.valueIds.includes(value.id) ? { ...i, valueIds: [...i.valueIds, value.id] } : i,
  );
  return { ...b, values, impacts };
}

export function untagImpact(b: Board, impactId: string, valueId: string): Board {
  return { ...b, impacts: b.impacts.map((i) => (i.id === impactId ? { ...i, valueIds: i.valueIds.filter((v) => v !== valueId) } : i)) };
}

export function removeValue(b: Board, id: string): Board {
  const clear = (v?: string) => (v === id ? undefined : v);
  return {
    ...b,
    values: b.values.filter((v) => v.id !== id),
    impacts: b.impacts.map((i) => ({ ...i, valueIds: i.valueIds.filter((v) => v !== id) })),
    links: b.links.map((l) => ({ ...l, sourceValueId: clear(l.sourceValueId), targetValueId: clear(l.targetValueId) })),
  };
}

// ---------- Queries ----------

export const valueName = (b: Board, id?: string) => b.values.find((v) => v.id === id)?.name;
export const tokenLabel = (b: Board, id: string) => b.tokens.find((t) => t.id === id)?.label || 'Unnamed';

/** Values touched by a token's harms and benefits, in first-use order. */
export function tokenValueIds(b: Board, tokenId: string): string[] {
  return [...new Set(b.impacts.filter((i) => i.tokenId === tokenId).flatMap((i) => i.valueIds))];
}

export function linkLabel(b: Board, l: Link): string {
  if (l.type === 'relationship') return l.label;
  const values = [valueName(b, l.sourceValueId), valueName(b, l.targetValueId)].filter(Boolean).join(' vs ');
  return `⚡ ${values || l.label || 'Tension'}`;
}
