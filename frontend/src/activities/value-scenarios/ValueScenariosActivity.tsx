// Value scenarios as a simple list: the technology and whose stories to tell on the left,
// scenario cards on the right. Each step adds fields to every card (see STEP in model.ts).
// One state is shared by every step of the lesson; `config.step` decides what's available.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ActivityProps } from '../../types/contracts';
import {
  HORIZON_LABEL, LAST_STEP, addScenario, addStakeholder, addTension, addValue, allows, forStep, guide,
  importStakeholders as mergeStakeholders, newId, normalize, patchScenario, patchStakeholder, patchTension,
  removeScenario, removeStakeholder, removeTension, removeValue, scenarioName, setTechnology, storyOf,
  type Horizon, type Scenario, type ValueNote, type ValueScenariosState,
} from './model';

export type { ValueScenariosState } from './model';

type State = ValueScenariosState;

export function ValueScenariosActivity({ savedState, onChange, config, example, importStakeholders }: ActivityProps<State>) {
  const step = typeof config?.step === 'number' ? config.step : LAST_STEP;
  const [stored, setStored] = useState<State>(() => normalize(savedState));
  const state = useMemo(() => (example ? forStep(stored, step) : stored), [stored, step, example]);
  const [importNote, setImportNote] = useState('');

  // Report after edits settle, like the stakeholder board.
  const pendingReport = useRef(false);
  const update = (fn: (s: State) => State) => {
    if (example) return;
    pendingReport.current = true;
    setStored(fn);
  };
  useEffect(() => {
    if (pendingReport.current) {
      pendingReport.current = false;
      onChange(stored);
    }
  }, [stored]);

  const bringIn = async () => {
    if (!importStakeholders) return;
    const refs = await importStakeholders.load();
    const { added } = mergeStakeholders(stored, refs, () => '');
    update((s) => mergeStakeholders(s, refs, () => newId('p')).state);
    setImportNote(
      refs.length === 0
        ? `Nothing to bring in yet: ${importStakeholders.label} has no named stakeholders.`
        : added === 0 ? 'Everyone from there is already on your list.' : `Added ${added} from ${importStakeholders.label}.`,
    );
  };

  return (
    <div className="activity">
      <fieldset className={example ? 'scenarios-layout read-only' : 'scenarios-layout'} disabled={example}>
        <aside className="scenario-setup">
          <section {...guide(step, 'technology')}>
            <label className="field">
              <span>Technology</span>
              <textarea
                rows={2}
                value={state.technology}
                onChange={(e) => update((s) => setTechnology(s, e.target.value))}
                placeholder="What is it, and what does it do?"
              />
            </label>
          </section>

          {allows(step, 'stakeholders') && (
            <section {...guide(step, 'stakeholders')}>
              <h3>Whose stories?</h3>
              {state.stakeholders.length === 0 && <p className="hint">Add the people your scenarios will follow.</p>}
              <ul className="stakeholder-rows">
                {state.stakeholders.map((st) => (
                  <li key={st.id}>
                    <input
                      value={st.name}
                      onChange={(e) => update((s) => patchStakeholder(s, st.id, { name: e.target.value }))}
                      placeholder="Who? e.g. Teachers"
                      aria-label="Stakeholder name"
                    />
                    <select
                      value={st.kind}
                      onChange={(e) => update((s) => patchStakeholder(s, st.id, { kind: e.target.value as 'direct' | 'indirect' }))}
                      aria-label={`${st.name || 'Stakeholder'}: direct or indirect`}
                    >
                      <option value="direct">Direct</option>
                      <option value="indirect">Indirect</option>
                    </select>
                    <button className="icon" aria-label={`Remove ${st.name || 'stakeholder'}`} onClick={() => update((s) => removeStakeholder(s, st.id))}>×</button>
                  </li>
                ))}
              </ul>
              <div className="inline-buttons">
                <button className="small" onClick={() => { const id = newId('p'); update((s) => addStakeholder(s, id)); }}>+ Stakeholder</button>
                {importStakeholders && (
                  <button className="small" onClick={bringIn}>Add from {importStakeholders.label}</button>
                )}
              </div>
              {importNote && <p className="hint" role="status">{importNote}</p>}
            </section>
          )}
        </aside>

        <div className="scenario-list">
          {!allows(step, 'story') && (
            <p className="hint">Your scenarios will appear here from step 3. First, set up the technology and whose stories to tell.</p>
          )}
          {allows(step, 'story') && (
            <>
              {state.scenarios.map((sc) => (
                <ScenarioCard key={sc.id} scenario={sc} state={state} step={step} update={update} />
              ))}
              <button
                className="small add-scenario"
                {...guide(step, 'story')}
                onClick={() => { const id = newId('s'); update((s) => addScenario(s, id, s.stakeholders[0]?.id)); }}
              >
                + New scenario
              </button>
            </>
          )}

          {allows(step, 'tensions') && (
            <section className="scenario-tensions" {...guide(step, 'tensions')}>
              <h3>Tensions between scenarios</h3>
              {state.scenarios.length < 2 && <p className="hint">Write at least two scenarios to compare them.</p>}
              {state.tensions.map((t) => (
                <div key={t.id} className="tension-row">
                  <div className="tension-pair">
                    {(['a', 'b'] as const).map((side, i) => (
                      <span key={side} className="tension-side">
                        {i === 1 && <span aria-hidden="true">⚡</span>}
                        <select
                          value={t[side]}
                          onChange={(e) => update((s) => patchTension(s, t.id, { [side]: e.target.value }))}
                          aria-label={i === 0 ? 'First scenario' : 'Second scenario'}
                        >
                          <option value="">Choose a scenario</option>
                          {state.scenarios.map((sc) => <option key={sc.id} value={sc.id}>{scenarioName(state, sc)}</option>)}
                        </select>
                      </span>
                    ))}
                    <button className="icon" aria-label="Remove tension" onClick={() => update((s) => removeTension(s, t.id))}>×</button>
                  </div>
                  <textarea
                    rows={2}
                    value={t.note}
                    onChange={(e) => update((s) => patchTension(s, t.id, { note: e.target.value }))}
                    placeholder="Whose benefit is someone else’s cost? Which values conflict?"
                    aria-label="Why these scenarios conflict"
                  />
                </div>
              ))}
              {state.scenarios.length >= 2 && (
                <button className="small" onClick={() => { const id = newId('x'); update((s) => addTension(s, id)); }}>+ Tension</button>
              )}
            </section>
          )}
        </div>
      </fieldset>
    </div>
  );
}

interface CardProps {
  scenario: Scenario;
  state: State;
  step: number;
  update: (fn: (s: State) => State) => void;
}

function ScenarioCard({ scenario: sc, state, step, update }: CardProps) {
  const set = (patch: Partial<Scenario>) => update((s) => patchScenario(s, sc.id, patch));
  const who = state.stakeholders.find((st) => st.id === sc.stakeholderId);

  return (
    <article className="scenario-card" aria-label={scenarioName(state, sc)}>
      <header className="scenario-head">
        <input
          className="scenario-title"
          value={sc.title}
          onChange={(e) => set({ title: e.target.value })}
          placeholder={who?.name ? storyOf(who.name) : 'Scenario title'}
          aria-label="Scenario title"
        />
        <select value={sc.stakeholderId} onChange={(e) => set({ stakeholderId: e.target.value })} aria-label="Whose story">
          <option value="">Whose story?</option>
          {state.stakeholders.map((st) => <option key={st.id} value={st.id}>{st.name || 'Unnamed'} ({st.kind})</option>)}
        </select>
        <button className="icon" aria-label="Remove scenario" onClick={() => update((s) => removeScenario(s, sc.id))}>×</button>
      </header>

      <label className="field">
        <span>Today</span>
        <textarea rows={3} value={sc.story} onChange={(e) => set({ story: e.target.value })} placeholder="A person, a place, a moment: what happens?" />
      </label>

      {allows(step, 'time') && (
        <div className="field" {...guide(step, 'time')}>
          <span className="scenario-later-head">
            Later:
            <select value={sc.horizon} onChange={(e) => set({ horizon: e.target.value as Horizon })} aria-label="How far ahead">
              {(Object.keys(HORIZON_LABEL) as Horizon[]).map((h) => <option key={h} value={h}>{HORIZON_LABEL[h]}</option>)}
            </select>
          </span>
          <textarea rows={2} value={sc.later} onChange={(e) => set({ later: e.target.value })} placeholder="What has changed for this person by then?" aria-label="Later" />
        </div>
      )}
      {allows(step, 'widespread') && (
        <label className="field" {...guide(step, 'widespread')}>
          <span>If everyone had it</span>
          <textarea rows={2} value={sc.widespread} onChange={(e) => set({ widespread: e.target.value })} placeholder="What if it were everywhere, not just here?" />
        </label>
      )}
      {allows(step, 'systemic') && (
        <label className="field" {...guide(step, 'systemic')}>
          <span>Knock-on effects</span>
          <textarea rows={2} value={sc.systemic} onChange={(e) => set({ systemic: e.target.value })} placeholder="How do institutions, norms, or relationships change?" />
        </label>
      )}
      {allows(step, 'values') && <ValueTags scenario={sc} step={step} update={update} />}
    </article>
  );
}

function ValueTags({ scenario: sc, step, update }: Omit<CardProps, 'state'>) {
  const [name, setName] = useState('');
  const [effect, setEffect] = useState<ValueNote['effect']>('harm');
  const add = () => {
    const id = newId('v');
    update((s) => addValue(s, sc.id, id, name, effect));
    setName('');
  };
  return (
    <div className="field" {...guide(step, 'values')}>
      <span>Values at stake</span>
      <div className="tags">
        {sc.values.map((v) => (
          <span key={v.id} className={`tag ${v.effect}`}>
            {v.effect === 'harm' ? '−' : '+'} {v.name}
            <button aria-label={`Remove ${v.name}`} onClick={() => update((s) => removeValue(s, sc.id, v.id))}>×</button>
          </span>
        ))}
        <span className="value-add edit-only">
          <select value={effect} onChange={(e) => setEffect(e.target.value as ValueNote['effect'])} aria-label="Harm or benefit">
            <option value="harm">− Harm</option>
            <option value="benefit">+ Benefit</option>
          </select>
          <input
            className="tag-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            placeholder="+ value (Enter)"
            aria-label="Add a value"
          />
        </span>
      </div>
    </div>
  );
}
