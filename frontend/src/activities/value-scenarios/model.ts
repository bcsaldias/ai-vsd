// Value scenarios (Nathan, Klasnja & Friedman, 2007): short stories about how a technology plays
// out for different stakeholders, pushed forward in time and across society, with their systemic
// effects and value implications. Plain data and pure updates; the component only renders them.

import type { StakeholderRef } from '../../types/contracts';
import { filled, patchIn, section, stepTools } from '../shared';

export { newId } from '../shared';

export interface ScenarioStakeholder {
  id: string;
  name: string;
  kind: 'direct' | 'indirect';
}

/** How far ahead the scenario is pushed in step 4. */
export type Horizon = 'years' | 'decades';

export interface ValueNote {
  id: string;
  name: string;
  effect: 'harm' | 'benefit';
}

export interface Scenario {
  id: string;
  /** Whose story it is. */
  stakeholderId: string;
  title: string;
  /** The story today. */
  story: string;
  horizon: Horizon;
  /** The same story years later. */
  later: string;
  /** If everyone had it. */
  widespread: string;
  /** Knock-on effects on institutions, norms, relationships. */
  systemic: string;
  values: ValueNote[];
}

/** Two scenarios whose values pull against each other. */
export interface ScenarioTension {
  id: string;
  a: string;
  b: string;
  note: string;
}

export interface ValueScenariosState {
  technology: string;
  stakeholders: ScenarioStakeholder[];
  scenarios: Scenario[];
  tensions: ScenarioTension[];
}

// ---------- Steps ----------

/** The step at which each part becomes available. Earlier parts stay available later. */
export const STEP = {
  technology: 1,
  stakeholders: 2,
  story: 3,
  time: 4,
  widespread: 5,
  systemic: 6,
  values: 7,
  tensions: 8,
} as const;
export const LAST_STEP = 8;

export type Tool = keyof typeof STEP;
export const { allows, guide } = stepTools<Tool>(STEP);

/** How far ahead a scenario can be pushed, in order. Their words come from the lesson's wording (see Words). */
export const HORIZONS: Horizon[] = ['years', 'decades'];

// ---------- Construction ----------

export function normalize(saved: Partial<ValueScenariosState> | null): ValueScenariosState {
  return {
    technology: saved?.technology ?? '',
    stakeholders: saved?.stakeholders ?? [],
    scenarios: (saved?.scenarios ?? []).map((s) => ({ ...emptyScenario(s.id, s.stakeholderId), ...s })),
    tensions: saved?.tensions ?? [],
  };
}

const emptyScenario = (id: string, stakeholderId = ''): Scenario => ({
  id, stakeholderId, title: '', story: '', horizon: 'years', later: '', widespread: '', systemic: '', values: [],
});

/** The parts that exist by a given step — for showing the worked example step by step. */
export function forStep(s: ValueScenariosState, step: number): ValueScenariosState {
  return {
    technology: s.technology,
    stakeholders: allows(step, 'stakeholders') ? s.stakeholders : [],
    scenarios: allows(step, 'story')
      ? s.scenarios.map((sc) => ({
          ...sc,
          later: allows(step, 'time') ? sc.later : '',
          widespread: allows(step, 'widespread') ? sc.widespread : '',
          systemic: allows(step, 'systemic') ? sc.systemic : '',
          values: allows(step, 'values') ? sc.values : [],
        }))
      : [],
    tensions: allows(step, 'tensions') ? s.tensions : [],
  };
}

// ---------- Updates (pure) ----------

type State = ValueScenariosState;

export const setTechnology = (s: State, technology: string): State => ({ ...s, technology });

export const addStakeholder = (s: State, id: string, kind: ScenarioStakeholder['kind'] = 'direct', name = ''): State => ({
  ...s,
  stakeholders: [...s.stakeholders, { id, name, kind }],
});

export const patchStakeholder = (s: State, id: string, patch: Partial<ScenarioStakeholder>): State => ({
  ...s,
  stakeholders: patchIn(s.stakeholders, id, patch),
});

/** Removes a stakeholder; their scenarios stay, without a stakeholder, so no writing is lost. */
export const removeStakeholder = (s: State, id: string): State => ({
  ...s,
  stakeholders: s.stakeholders.filter((st) => st.id !== id),
  scenarios: s.scenarios.map((sc) => (sc.stakeholderId === id ? { ...sc, stakeholderId: '' } : sc)),
});

/** Adds stakeholders from elsewhere, skipping names already in the list (case-insensitive). */
export function importStakeholders(s: State, refs: StakeholderRef[], makeId: () => string): { state: State; added: number } {
  const have = new Set(s.stakeholders.map((st) => st.name.trim().toLowerCase()));
  const fresh = refs.filter((r) => r.name.trim() && !have.has(r.name.trim().toLowerCase()));
  return {
    state: { ...s, stakeholders: [...s.stakeholders, ...fresh.map((r) => ({ id: makeId(), name: r.name.trim(), kind: r.kind }))] },
    added: fresh.length,
  };
}

export const addScenario = (s: State, id: string, stakeholderId = ''): State => ({
  ...s,
  scenarios: [...s.scenarios, emptyScenario(id, stakeholderId)],
});

export const patchScenario = (s: State, id: string, patch: Partial<Scenario>): State => ({
  ...s,
  scenarios: patchIn(s.scenarios, id, patch),
});

export const removeScenario = (s: State, id: string): State => ({
  ...s,
  scenarios: s.scenarios.filter((sc) => sc.id !== id),
  tensions: s.tensions.filter((t) => t.a !== id && t.b !== id),
});

/** Adds a value to a scenario, or updates its effect if the same name is already there. */
export function addValue(s: State, scenarioId: string, valueId: string, name: string, effect: ValueNote['effect']): State {
  const trimmed = name.trim();
  if (!trimmed) return s;
  return {
    ...s,
    scenarios: s.scenarios.map((sc) => {
      if (sc.id !== scenarioId) return sc;
      const existing = sc.values.find((v) => v.name.toLowerCase() === trimmed.toLowerCase());
      const values = existing
        ? sc.values.map((v) => (v.id === existing.id ? { ...v, effect } : v))
        : [...sc.values, { id: valueId, name: trimmed, effect }];
      return { ...sc, values };
    }),
  };
}

export const removeValue = (s: State, scenarioId: string, valueId: string): State => ({
  ...s,
  scenarios: s.scenarios.map((sc) => (sc.id === scenarioId ? { ...sc, values: sc.values.filter((v) => v.id !== valueId) } : sc)),
});

export const addTension = (s: State, id: string): State => ({
  ...s,
  tensions: [...s.tensions, { id, a: s.scenarios[0]?.id ?? '', b: s.scenarios[1]?.id ?? '', note: '' }],
});

export const patchTension = (s: State, id: string, patch: Partial<ScenarioTension>): State => ({
  ...s,
  tensions: patchIn(s.tensions, id, patch),
});

export const removeTension = (s: State, id: string): State => ({ ...s, tensions: s.tensions.filter((t) => t.id !== id) });

// ---------- Queries ----------

/** "Parents’ story", "Mia’s story". */
export const storyOf = (name: string) => `${name}${/s$/i.test(name) ? '’' : '’s'} story`;

export function scenarioName(s: State, sc: Scenario): string {
  const who = s.stakeholders.find((st) => st.id === sc.stakeholderId)?.name;
  return sc.title || (who ? storyOf(who) : 'Untitled scenario');
}

// ---------- Words ----------

/** The words for the scenarios' parts, used on screen and in the work as the AI reads it
    ({{student_work}}), so students see exactly the words the AI gets. Each lesson's
    content/<lesson>/wording.json gives every one. */
export const WORDING_KEYS = [
  'technology', 'stakeholders', 'direct', 'indirect', 'scenarios', 'whose', 'story', 'years', 'decades',
  'widespread', 'systemic', 'values', 'harm', 'benefit', 'tensions', 'versus', 'untitled', 'unnamed', 'blank', 'none',
] as const;
export type Wording = Record<(typeof WORDING_KEYS)[number], string>;

/** The scenarios as of a step, in plain language: the parts the step has reached, in the order the
    steps add them. Ids are left out; scenarios are numbered so tensions can refer to them. */
export function describeWork(s: ValueScenariosState, step: number, w: Wording): string {
  const title = (id: string) => {
    const i = s.scenarios.findIndex((sc) => sc.id === id);
    return i < 0 ? w.unnamed : `${i + 1}. ${filled(s.scenarios[i].title, w.untitled)}`;
  };
  const sections = [`${w.technology}: ${filled(s.technology, w.blank)}`];
  if (allows(step, 'stakeholders')) {
    sections.push(section(w.stakeholders, s.stakeholders.map((st) => `- ${filled(st.name, w.unnamed)} — ${w[st.kind]}`), w.none));
  }
  if (allows(step, 'story')) {
    sections.push(section(w.scenarios, s.scenarios.map((sc) => [
      title(sc.id),
      `   ${w.whose}: ${filled(s.stakeholders.find((st) => st.id === sc.stakeholderId)?.name, w.unnamed)}`,
      `   ${w.story}: ${filled(sc.story, w.blank)}`,
      allows(step, 'time') && `   ${w[sc.horizon]}: ${filled(sc.later, w.blank)}`,
      allows(step, 'widespread') && `   ${w.widespread}: ${filled(sc.widespread, w.blank)}`,
      allows(step, 'systemic') && `   ${w.systemic}: ${filled(sc.systemic, w.blank)}`,
      allows(step, 'values') &&
        `   ${w.values}: ${sc.values.length ? sc.values.map((v) => `${v.name} (${w[v.effect]})`).join(', ') : w.none}`,
    ].filter(Boolean).join('\n')), w.none));
  }
  if (allows(step, 'tensions')) {
    sections.push(section(w.tensions, s.tensions.map((x) =>
      `- ${title(x.a)} ${w.versus} ${title(x.b)}${x.note.trim() ? `: ${x.note.trim()}` : ''}`), w.none));
  }
  return sections.join('\n\n');
}
