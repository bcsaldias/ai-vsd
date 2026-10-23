// Value scenarios (Nathan, Klasnja & Friedman, 2007): short stories about how a technology plays
// out for different stakeholders, pushed forward in time and across society, with their systemic
// effects and value implications. Plain data and pure updates; the component only renders them.

import type { StakeholderRef } from '../../types/contracts';

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
export const allows = (step: number, tool: Tool) => step >= STEP[tool];

/** Marks where a part lives (data-guide) and flags it in the step that introduces it (data-new). */
export const guide = (step: number, tool: Tool) => ({
  'data-guide': tool,
  'data-new': STEP[tool] === step ? '' : undefined,
});

export const HORIZON_LABEL: Record<Horizon, string> = { years: 'In 5 years', decades: 'In 20+ years' };

// ---------- Construction ----------

export const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

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

function patchIn<T extends { id: string }>(list: T[], id: string, patch: Partial<T>): T[] {
  return list.map((item) => (item.id === id ? { ...item, ...patch } : item));
}

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

// ---------- Work in plain language ----------

/** The wording of the scenarios written out for the AI ({{student_work}}). These are the defaults; a
    lesson's content/<lesson>/work-description.json can reword any of them. */
export const WORK_LABELS = {
  technology: 'Technology',
  stakeholders: 'Whose stories',
  direct: 'direct',
  indirect: 'indirect',
  scenarios: 'Scenarios',
  whose: 'Whose story',
  story: 'Today',
  years: 'In 5 years',
  decades: 'In 20+ years',
  widespread: 'If everyone had it',
  systemic: 'Knock-on effects',
  values: 'Values at stake',
  harm: 'harmed',
  benefit: 'supported',
  tensions: 'Tensions between scenarios',
  versus: 'vs',
  untitled: 'Untitled scenario',
  unnamed: '(unnamed)',
  blank: '(not written yet)',
  none: '(none yet)',
};
export type WorkLabels = Record<keyof typeof WORK_LABELS, string>;

/** The scenarios as of a step, in plain language: the parts the step has reached, in the order the
    steps add them. Ids are left out; scenarios are numbered so tensions can refer to them. */
export function describeWork(s: ValueScenariosState, step: number, t: WorkLabels): string {
  const text = (v: string | undefined, empty = t.blank) => v?.trim() || empty;
  const title = (id: string) => {
    const i = s.scenarios.findIndex((sc) => sc.id === id);
    return i < 0 ? t.unnamed : `${i + 1}. ${text(s.scenarios[i].title, t.untitled)}`;
  };
  const sections = [`${t.technology}: ${text(s.technology)}`];
  const section = (heading: string, lines: string[]) => sections.push([`${heading}:`, ...(lines.length ? lines : [t.none])].join('\n'));

  if (allows(step, 'stakeholders')) {
    section(t.stakeholders, s.stakeholders.map((st) => `- ${text(st.name, t.unnamed)} — ${t[st.kind]}`));
  }
  if (allows(step, 'story')) {
    section(t.scenarios, s.scenarios.map((sc) => [
      title(sc.id),
      `   ${t.whose}: ${text(s.stakeholders.find((st) => st.id === sc.stakeholderId)?.name, t.unnamed)}`,
      `   ${t.story}: ${text(sc.story)}`,
      allows(step, 'time') && `   ${t[sc.horizon]}: ${text(sc.later)}`,
      allows(step, 'widespread') && `   ${t.widespread}: ${text(sc.widespread)}`,
      allows(step, 'systemic') && `   ${t.systemic}: ${text(sc.systemic)}`,
      allows(step, 'values') &&
        `   ${t.values}: ${sc.values.length ? sc.values.map((v) => `${v.name} (${t[v.effect]})`).join(', ') : t.none}`,
    ].filter(Boolean).join('\n')));
  }
  if (allows(step, 'tensions')) {
    section(t.tensions, s.tensions.map((x) => `- ${title(x.a)} ${t.versus} ${title(x.b)}${x.note.trim() ? `: ${x.note.trim()}` : ''}`));
  }
  return sections.join('\n\n');
}
