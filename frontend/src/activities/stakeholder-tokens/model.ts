import type { StakeholderRef } from '../../types/contracts';
import { filled, patchIn, section, stepTools } from '../shared';

export { newId } from '../shared';

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
  /** Relationship only: it goes both ways (no arrowhead), rather than from source to target. */
  mutual?: boolean;
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
export const { allows, guide } = stepTools<Tool>(STEP);

// ---------- Geometry ----------

/** Outer radius of each ring. Anything beyond `peripheral` is excluded; `board` is where the drawing stops. */
export const RADIUS = { core: 150, peripheral: 265, board: 355 };
export const TOKEN_SIZE = 88;
export const CONTEXT_SIZE = 112;
// Token and centre sizes must match .token and .context-token in styles.css.

/** The rings and starting-point types, in order. Their words come from the lesson's wording (see Words). */
export const RINGS: Ring[] = ['core', 'peripheral', 'excluded'];
export const CONTEXT_TYPES: ContextType[] = ['technology', 'value', 'context'];

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

// ---------- Updates (pure: board in, board out) ----------

type Board = StakeholderTokensState;

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

/** The parts of a board that exist by a given step — used to show a worked example step by step,
    so students see a model of the current step without the answers to later ones. */
export function forStep(b: Board, step: number): Board {
  const tokens = b.tokens
    .filter((t) => allows(step, 'direct') && (t.kind === 'direct' || allows(step, 'indirect')))
    .map((t) => (allows(step, 'overlooked') ? t : { ...t, overlooked: false }));
  const ids = new Set(tokens.map((t) => t.id));
  const links = b.links
    .filter((l) => ids.has(l.source) && ids.has(l.target))
    .filter((l) => allows(step, l.type === 'tension' ? 'tensions' : 'relationships'))
    .map((l) => (allows(step, 'organization') ? l : { ...l, owner: undefined, action: undefined }));
  const impacts = allows(step, 'impacts')
    ? b.impacts.filter((i) => ids.has(i.tokenId)).map((i) => (allows(step, 'values') ? i : { ...i, valueIds: [] }))
    : [];
  const values = allows(step, 'values')
    ? b.values.map((v) => ({
        ...v,
        definition: allows(step, 'definitions') ? v.definition : '',
        owner: allows(step, 'organization') ? v.owner : '',
        action: allows(step, 'organization') ? v.action : '',
      }))
    : [];
  return { context: b.context, tokens, links, impacts, values };
}

/** The board's stakeholders in the shared StakeholderRef shape, for other activities to bring in. */
export function stakeholderRefs(saved: unknown): StakeholderRef[] {
  return normalize(saved as Partial<Board> | null).tokens
    .filter((t) => t.label.trim())
    .map((t) => ({ name: t.label.trim(), kind: t.kind }));
}

// ---------- Queries ----------

export const valueName = (b: Board, id?: string) => b.values.find((v) => v.id === id)?.name;
export const tokenLabel = (b: Board, id: string, unnamed: string) => b.tokens.find((t) => t.id === id)?.label || unnamed;

/** Values touched by a token's harms and benefits, in first-use order. */
export function tokenValueIds(b: Board, tokenId: string): string[] {
  return [...new Set(b.impacts.filter((i) => i.tokenId === tokenId).flatMap((i) => i.valueIds))];
}

export function linkLabel(b: Board, l: Link): string {
  if (l.type === 'relationship') return l.label;
  const values = [valueName(b, l.sourceValueId), valueName(b, l.targetValueId)].filter(Boolean).join(' vs ');
  return `⚡ ${values || l.label || 'Tension'}`;
}

// ---------- Words ----------

/** The words for the board's parts, used on screen and in the work as the AI reads it
    ({{student_work}}), so students see exactly the words the AI gets. Each lesson's
    content/<lesson>/wording.json gives every one. */
export const WORDING_KEYS = [
  'startingPoint', 'technology', 'value', 'context',
  'direct', 'indirect', 'stakeholders', 'core', 'peripheral', 'excluded', 'overlooked',
  'relationships', 'impacts', 'harm', 'benefit', 'values', 'tensions', 'for', 'versus', 'owner', 'action',
  'unnamed', 'blank', 'none',
] as const;
export type Wording = Record<(typeof WORDING_KEYS)[number], string>;

/** The board as of a step, in plain language: one section per part the step has reached, in the
    order the steps add them. Ids and board positions are left out; only what they mean stays. */
export function describeWork(b: Board, step: number, w: Wording): string {
  const name = (id: string) => filled(b.tokens.find((tk) => tk.id === id)?.label, w.unnamed);
  const value = (id?: string) => filled(valueName(b, id), w.unnamed);
  const organization = (x: { owner?: string; action?: string }) =>
    allows(step, 'organization')
      ? [x.owner?.trim() && `  ${w.owner}: ${x.owner.trim()}`, x.action?.trim() && `  ${w.action}: ${x.action.trim()}`].filter(Boolean)
      : [];
  const people = (kind: Token['kind']) =>
    b.tokens
      .filter((tk) => tk.kind === kind)
      .map((tk) => `- ${filled(tk.label, w.unnamed)} — ${[w[tk.ring], tk.overlooked && w.overlooked].filter(Boolean).join(' · ')}`);

  const sections = [`${w.startingPoint} (${w[b.context.type]}): ${filled(b.context.label, w.blank)}`];
  if (allows(step, 'direct')) sections.push(section(`${w.direct} ${w.stakeholders}`, people('direct'), w.none));
  if (allows(step, 'indirect')) sections.push(section(`${w.indirect} ${w.stakeholders}`, people('indirect'), w.none));
  if (allows(step, 'relationships')) {
    // Read in the arrow's direction: "Homeowners —shares footage with→ Police". Mutual ones point
    // both ways: "Homeowners ←share a home→ Household members".
    sections.push(section(w.relationships, b.links.filter((l) => l.type === 'relationship').map((l) => {
      const label = l.label.trim();
      const arrow = l.mutual ? (label ? `←${label}→` : '↔') : label ? `—${label}→` : '→';
      return `- ${name(l.source)} ${arrow} ${name(l.target)}`;
    }), w.none));
  }
  if (allows(step, 'impacts')) {
    sections.push(section(w.impacts, b.tokens.flatMap((tk) => {
      const impacts = b.impacts.filter((i) => i.tokenId === tk.id);
      if (!impacts.length) return [];
      return [`- ${name(tk.id)}:`, ...impacts.map((i) =>
        `  - ${w[i.kind]}: ${filled(i.text, w.blank)}${i.valueIds.length ? ` (${i.valueIds.map(value).join(', ')})` : ''}`)];
    }), w.none));
  }
  if (allows(step, 'values')) {
    sections.push(section(w.values, b.values.map((v) =>
      [`- ${filled(v.name, w.unnamed)}${v.definition.trim() ? `: ${v.definition.trim()}` : ''}`, ...organization(v)].join('\n')), w.none));
  }
  if (allows(step, 'tensions')) {
    sections.push(section(w.tensions, b.links.filter((l) => l.type === 'tension').map((l) =>
      [`- ${value(l.sourceValueId)} ${w.for} ${name(l.source)} ${w.versus} ${value(l.targetValueId)} ${w.for} ${name(l.target)}` +
        `${l.label.trim() ? `: ${l.label.trim()}` : ''}`, ...organization(l)].join('\n')), w.none));
  }
  return sections.join('\n\n');
}
