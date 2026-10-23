// Side panel for the selected token, connection, or (by default) the board's centre,
// plus the shared list of values. Every board edit has a form control here, so the
// activity can be done from the keyboard as well as by dragging.

import { useEffect, useRef, useState } from 'react';
import {
  CONTEXT_TYPES, RINGS, addImpact, addLink, allows, guide, hasLink, linkLabel, moveToRing, newId, patchContext,
  patchImpact, patchLink, patchToken, patchValue, removeImpact, removeLinks, removeTokens, removeValue,
  tagImpact, tokenLabel, untagImpact,
  type Impact, type Link, type Ring, type StakeholderTokensState, type Token, type Wording,
} from './model';

type Board = StakeholderTokensState;
export type Selection = { kind: 'token' | 'link' | 'context'; id: string } | null;

interface Props {
  board: Board;
  step: number;
  /** The lesson's words for the board's parts, the same the AI reads. */
  wording: Wording;
  selection: Selection;
  update: (fn: (b: Board) => Board) => void;
  select: (s: Selection) => void;
  /** Showing a worked example: fields are read-only and edit actions are hidden. */
  readOnly?: boolean;
  /** Id of a token that was just added and needs a name; its Name field takes focus. */
  nameRequest?: string | null;
  onNameFocused?: () => void;
}

export function Inspector({ board, step, wording, selection, update, select, readOnly, nameRequest, onNameFocused }: Props) {
  const token = selection?.kind === 'token' ? board.tokens.find((t) => t.id === selection.id) : undefined;
  const link = selection?.kind === 'link' ? board.links.find((l) => l.id === selection.id) : undefined;
  const common = { board, step, wording, update, select };

  return (
    <aside className={readOnly ? 'token-inspector read-only' : 'token-inspector'} aria-label="Inspector">
      <fieldset className="inspector-fields" disabled={readOnly}>
      {token ? (
        <TokenForm
          key={token.id}
          token={token}
          {...common}
          focusName={nameRequest === token.id}
          onNameFocused={onNameFocused}
        />
      ) : link ? <LinkForm link={link} {...common} /> : <ContextForm {...common} />}
      {allows(step, 'values') && <ValuesList {...common} />}
      </fieldset>
    </aside>
  );
}

type FormProps = Omit<Props, 'selection' | 'readOnly' | 'nameRequest' | 'onNameFocused'>;

function ContextForm({ board, step, wording: w, update }: FormProps) {
  return (
    <section {...guide(step, 'context')}>
      <h3>{w.startingPoint}</h3>
      <fieldset className="field">
        <legend>Start from a…</legend>
        <div className="choices">
          {CONTEXT_TYPES.map((type) => (
            <label key={type}>
              <input
                type="radio"
                name="context-type"
                checked={board.context.type === type}
                onChange={() => update((b) => patchContext(b, { type }))}
              />
              {w[type]}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="field">
        <span>Name</span>
        <input
          value={board.context.label}
          onChange={(e) => update((b) => patchContext(b, { label: e.target.value }))}
          placeholder="e.g. a reading app that shares progress with parents"
        />
      </label>
      <p className="hint">Select a stakeholder or connection on the board to edit it.</p>
    </section>
  );
}

function TokenForm({ token, board, step, wording: w, update, select, focusName, onNameFocused }: FormProps & {
  token: Token;
  focusName?: boolean;
  onNameFocused?: () => void;
}) {
  const set = (patch: Partial<Token>) => update((b) => patchToken(b, token.id, patch));
  const nameRef = useRef<HTMLInputElement>(null);
  const [prompting, setPrompting] = useState(false);

  // A token the student just added: put the cursor in its Name field and highlight it briefly.
  useEffect(() => {
    if (!focusName || !nameRef.current) return;
    nameRef.current.focus({ preventScroll: true });
    nameRef.current.scrollIntoView({ block: 'nearest' });
    setPrompting(true);
    onNameFocused?.();
  }, [focusName]);

  // Enter (or Escape) finishes naming and returns to the token on the board.
  const finishNaming = () => document.querySelector<HTMLElement>(`.react-flow__node[data-id="${token.id}"]`)?.focus();
  const others = board.tokens.filter((t) => t.id !== token.id);
  // Only stakeholders not yet connected that way (one relationship and one tension per pair).
  const canConnect = (type: Link['type']) => others.filter((t) => !hasLink(board, token.id, t.id, type));
  const relationTargets = canConnect('relationship');
  const tensionTargets = canConnect('tension');
  const impacts = board.impacts.filter((i) => i.tokenId === token.id);

  const connect = (type: Link['type'], target: string) => {
    if (!target) return;
    const id = newId('l');
    update((b) => addLink(b, id, token.id, target, type));
    select({ kind: 'link', id });
  };

  return (
    <section>
      <h3>Stakeholder</h3>
      <label className="field">
        <span>Name</span>
        <input
          ref={nameRef}
          className={prompting ? 'name-prompt' : undefined}
          onAnimationEnd={() => setPrompting(false)}
          value={token.label}
          onChange={(e) => set({ label: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
              e.preventDefault();
              finishNaming();
            }
          }}
          placeholder="Who is this? e.g. Teachers"
        />
      </label>
      <fieldset className="field">
        <legend>Relationship to the technology</legend>
        <div className="choices">
          <label>
            <input type="radio" name={`kind-${token.id}`} checked={token.kind === 'direct'} onChange={() => set({ kind: 'direct' })} />
            {w.direct} <span className="hint">uses it</span>
          </label>
          <label>
            <input type="radio" name={`kind-${token.id}`} checked={token.kind === 'indirect'} onChange={() => set({ kind: 'indirect' })} />
            {w.indirect} <span className="hint">affected by it</span>
          </label>
        </div>
      </fieldset>
      <label className="field">
        <span>Ring</span>
        <select value={token.ring} onChange={(e) => update((b) => moveToRing(b, token.id, e.target.value as Ring))}>
          {RINGS.map((r) => <option key={r} value={r}>{w[r]}</option>)}
        </select>
      </label>
      {allows(step, 'overlooked') && (
        <label className="check" {...guide(step, 'overlooked')}>
          <input type="checkbox" checked={token.overlooked} onChange={(e) => set({ overlooked: e.target.checked })} />
          {w.overlooked} <span className="hint">easy to miss; you only found them by looking hard</span>
        </label>
      )}

      {allows(step, 'relationships') && relationTargets.length > 0 && (
        <label className="field edit-only" {...guide(step, 'relationships')}>
          <span>Connect to…</span>
          <select value="" onChange={(e) => connect('relationship', e.target.value)}>
            <option value="">Choose a stakeholder</option>
            {relationTargets.map((t) => <option key={t.id} value={t.id}>{t.label || w.unnamed}</option>)}
          </select>
        </label>
      )}
      {allows(step, 'tensions') && tensionTargets.length > 0 && (
        <label className="field edit-only" {...guide(step, 'tensions')}>
          <span>Tension with…</span>
          <select value="" onChange={(e) => connect('tension', e.target.value)}>
            <option value="">Choose a stakeholder</option>
            {tensionTargets.map((t) => <option key={t.id} value={t.id}>{t.label || w.unnamed}</option>)}
          </select>
        </label>
      )}

      {allows(step, 'impacts') && (
        <>
          <h3>{w.impacts}</h3>
          {impacts.length === 0 && <p className="hint">What could this stakeholder gain or lose?</p>}
          {impacts.map((impact) => <ImpactEditor key={impact.id} impact={impact} board={board} step={step} wording={w} update={update} />)}
          <div className="inline-buttons" {...guide(step, 'impacts')}>
            <button className="small" onClick={() => { const id = newId('i'); update((b) => addImpact(b, id, token.id, 'harm')); }}>+ {w.harm}</button>
            <button className="small" onClick={() => { const id = newId('i'); update((b) => addImpact(b, id, token.id, 'benefit')); }}>+ {w.benefit}</button>
          </div>
        </>
      )}

      <button className="small danger" onClick={() => { update((b) => removeTokens(b, new Set([token.id]))); select(null); }}>
        Remove stakeholder
      </button>
    </section>
  );
}

function ImpactEditor({ impact, board, step, wording: w, update }: Omit<FormProps, 'select'> & { impact: Impact }) {
  const [draft, setDraft] = useState('');
  const listId = `values-${impact.id}`;
  const addTag = () => {
    const id = newId('v');
    update((b) => tagImpact(b, impact.id, draft, id));
    setDraft('');
  };

  return (
    <div className={`impact ${impact.kind}`}>
      <div className="impact-row">
        <span className="impact-kind">{impact.kind === 'harm' ? `− ${w.harm}` : `+ ${w.benefit}`}</span>
        <button className="icon" aria-label={`Remove ${impact.kind}`} onClick={() => update((b) => removeImpact(b, impact.id))}>×</button>
      </div>
      <textarea
        rows={2}
        value={impact.text}
        onChange={(e) => update((b) => patchImpact(b, impact.id, { text: e.target.value }))}
        placeholder={impact.kind === 'harm' ? 'What could go wrong for them?' : 'What could they gain?'}
        aria-label={`${impact.kind} description`}
      />
      {allows(step, 'values') && (
        <div className="tags" {...guide(step, 'values')}>
          {impact.valueIds.map((vid) => {
            const name = board.values.find((v) => v.id === vid)?.name ?? '';
            return (
              <span key={vid} className="tag">
                {name}
                <button aria-label={`Remove value ${name}`} onClick={() => update((b) => untagImpact(b, impact.id, vid))}>×</button>
              </span>
            );
          })}
          <input
            className="tag-input edit-only"
            list={listId}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            onBlur={() => draft.trim() && addTag()}
            placeholder="+ value (Enter)"
            aria-label="Add a value this touches"
          />
          <datalist id={listId}>
            {board.values.map((v) => <option key={v.id} value={v.name} />)}
          </datalist>
        </div>
      )}
    </div>
  );
}

function LinkForm({ link, board, step, wording: w, update, select }: FormProps & { link: Link }) {
  const set = (patch: Partial<Link>) => update((b) => patchLink(b, link.id, patch));
  const from = tokenLabel(board, link.source, w.unnamed);
  const to = tokenLabel(board, link.target, w.unnamed);
  const remove = () => { update((b) => removeLinks(b, new Set([link.id]))); select(null); };

  if (link.type === 'relationship') {
    return (
      <section>
        <h3>Relationship</h3>
        <p className="link-ends">{from} {link.mutual ? '↔' : '→'} {to}</p>
        {/* One way (either direction) or both ways. "back" swaps the ends, so it then reads as the
            first option with the names in the new order. */}
        <label className="field">
          <span>Direction</span>
          <select
            value={link.mutual ? 'mutual' : 'forward'}
            onChange={(e) =>
              set(e.target.value === 'back' ? { source: link.target, target: link.source, mutual: false } : { mutual: e.target.value === 'mutual' })
            }
          >
            <option value="forward">One way: {from} → {to}</option>
            <option value="back">One way: {to} → {from}</option>
            <option value="mutual">Both ways (mutual)</option>
          </select>
        </label>
        <label className="field">
          <span>{link.mutual ? `How are ${from} and ${to} related?` : `How does ${from} affect ${to}?`}</span>
          <input
            value={link.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder={link.mutual ? 'e.g. share a home, work together' : 'e.g. reports to, cares for, pays for'}
          />
        </label>
        <div className="inline-buttons">
          <button className="small danger" onClick={remove}>Remove</button>
        </div>
      </section>
    );
  }

  const valueSelect = (side: 'sourceValueId' | 'targetValueId', who: string) => (
    <label className="field">
      <span>{who}’s value at stake</span>
      <select value={link[side] ?? ''} onChange={(e) => set({ [side]: e.target.value || undefined })}>
        <option value="">Choose a value</option>
        {board.values.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
    </label>
  );

  return (
    <section>
      <h3>Value tension</h3>
      <p className="link-ends">{from} ⚡ {to}</p>
      <p className="meta">{linkLabel(board, link)}</p>
      {board.values.length === 0 && <p className="hint">Tag harms and benefits with values first, then choose them here.</p>}
      {valueSelect('sourceValueId', from)}
      {valueSelect('targetValueId', to)}
      <label className="field">
        <span>Why do they pull against each other?</span>
        <textarea rows={3} value={link.label} onChange={(e) => set({ label: e.target.value })} />
      </label>
      {allows(step, 'organization') && (
        <OwnerFields step={step} wording={w} owner={link.owner ?? ''} action={link.action ?? ''} onChange={set} />
      )}
      <button className="small danger" onClick={remove}>Remove</button>
    </section>
  );
}

function ValuesList({ board, step, wording: w, update }: FormProps) {
  const usedBy = (valueId: string) => {
    const ids = new Set(board.impacts.filter((i) => i.valueIds.includes(valueId)).map((i) => i.tokenId));
    return board.tokens.filter((t) => ids.has(t.id)).map((t) => t.label || w.unnamed);
  };

  return (
    <section {...guide(step, 'values')}>
      <h3>{w.values}</h3>
      {board.values.length === 0 && <p className="hint">Values appear here once you tag harms and benefits with them.</p>}
      {board.values.map((v) => {
        const users = usedBy(v.id);
        return (
          <div key={v.id} className="value-entry">
            <div className="impact-row">
              <input
                className="value-name"
                value={v.name}
                onChange={(e) => update((b) => patchValue(b, v.id, { name: e.target.value }))}
                aria-label="Value name"
              />
              <button className="icon" aria-label={`Remove value ${v.name}`} onClick={() => update((b) => removeValue(b, v.id))}>×</button>
            </div>
            <span className="meta">{users.length ? `At stake for ${users.join(', ')}` : 'Not linked to any stakeholder'}</span>
            {allows(step, 'definitions') && (
              <textarea
                {...guide(step, 'definitions')}
                rows={2}
                value={v.definition}
                onChange={(e) => update((b) => patchValue(b, v.id, { definition: e.target.value }))}
                placeholder={`What does ${v.name || 'this value'} mean here?`}
                aria-label={`Definition of ${v.name}`}
              />
            )}
            {allows(step, 'organization') && (
              <OwnerFields step={step} wording={w} owner={v.owner} action={v.action} onChange={(patch) => update((b) => patchValue(b, v.id, patch))} />
            )}
          </div>
        );
      })}
    </section>
  );
}

function OwnerFields({ step, wording: w, owner, action, onChange }: {
  step: number;
  wording: Wording;
  owner: string;
  action: string;
  onChange: (p: { owner?: string; action?: string }) => void;
}) {
  return (
    <div className="owner-fields" {...guide(step, 'organization')}>
      <label className="field">
        <span>{w.owner}</span>
        <input value={owner} onChange={(e) => onChange({ owner: e.target.value })} placeholder="Who is responsible?" />
      </label>
      <label className="field">
        <span>{w.action}</span>
        <input value={action} onChange={(e) => onChange({ action: e.target.value })} placeholder="What will they do?" />
      </label>
    </div>
  );
}
