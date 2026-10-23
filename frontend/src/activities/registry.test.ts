// The work each activity sends the AI: limited to the step, in the lesson's words, never ahead.

import { describe, expect, it } from 'vitest';
import { LESSONS } from '../services/lessonContent';
import { describeWork, workUpToStep } from './registry';
import * as tokens from './stakeholder-tokens/model';
import * as scenarios from './value-scenarios/model';

/** Each lesson's steps, with the work as of each step: the worked example, as the Prompts preview shows it. */
const steps = LESSONS.flatMap((lesson) =>
  lesson.activities.map((activity, i) => {
    const work = workUpToStep(activity, activity.example);
    return { lesson, activity, n: i + 1, work, text: describeWork(activity, work) ?? '' };
  }),
);

describe('the work in plain language ({{student_work}})', () => {
  // Placeholder words (each word is its own name in capitals), so these check the format, not the
  // lesson's wording, and editing a lesson's content never breaks them.
  const placeholders = <K extends string>(keys: readonly K[]) => Object.fromEntries(keys.map((k) => [k, k.toUpperCase()])) as Record<K, string>;

  it('writes out a stakeholder board, part by part, in the lesson’s words', () => {
    const board = tokens.normalize({
      context: { type: 'technology', label: 'Doorbell' },
      tokens: [
        { id: 'a', label: 'Owners', kind: 'direct', ring: 'core', overlooked: false, x: 0, y: 0 },
        { id: 'b', label: '', kind: 'indirect', ring: 'excluded', overlooked: true, x: 0, y: 0 },
      ],
      links: [
        { id: 'r', source: 'a', target: 'b', type: 'relationship', label: 'films' },
        { id: 'm', source: 'b', target: 'a', type: 'relationship', label: '', mutual: true },
        { id: 't', source: 'a', target: 'b', type: 'tension', label: 'Safety vs privacy', sourceValueId: 'v', targetValueId: 'v', owner: 'Legal' },
      ],
      impacts: [{ id: 'i', tokenId: 'a', kind: 'benefit', text: 'Sees the door', valueIds: ['v'] }],
      values: [{ id: 'v', name: 'Safety', definition: 'Feeling protected', owner: 'Product', action: 'Blur the street' }],
    });
    expect(tokens.describeWork(board, 9, placeholders(tokens.WORDING_KEYS))).toBe([
      'STARTINGPOINT (TECHNOLOGY): Doorbell',
      'DIRECT STAKEHOLDERS:\n- Owners — CORE',
      'INDIRECT STAKEHOLDERS:\n- UNNAMED — EXCLUDED · OVERLOOKED',
      'RELATIONSHIPS:\n- Owners —films→ UNNAMED\n- UNNAMED ↔ Owners',
      'IMPACTS:\n- Owners:\n  - BENEFIT: Sees the door (Safety)',
      'VALUES:\n- Safety: Feeling protected\n  OWNER: Product\n  ACTION: Blur the street',
      'TENSIONS:\n- Safety FOR Owners VERSUS Safety FOR UNNAMED: Safety vs privacy\n  OWNER: Legal',
    ].join('\n\n'));
    // A reached part with nothing in it says so.
    expect(tokens.describeWork(tokens.normalize(null), 2, placeholders(tokens.WORDING_KEYS))).toBe(
      'STARTINGPOINT (TECHNOLOGY): BLANK\n\nDIRECT STAKEHOLDERS:\nNONE');
  });

  it('writes out value scenarios, numbered so tensions can refer to them', () => {
    const state = scenarios.normalize({
      technology: 'Doorbell',
      stakeholders: [{ id: 'p', name: 'Drivers', kind: 'indirect' }],
      scenarios: [
        { id: 's1', stakeholderId: 'p', title: 'Watched', story: 'Sam delivers.', horizon: 'decades', later: 'Rated by clips.',
          widespread: 'Every door films.', systemic: 'Employers lean on it.', values: [{ id: 'x', name: 'Dignity', effect: 'harm' }] },
        { id: 's2', stakeholderId: '', title: '', story: '', horizon: 'years', later: '', widespread: '', systemic: '', values: [] },
      ],
      tensions: [{ id: 't', a: 's1', b: 's2', note: 'Proof vs dignity' }],
    });
    expect(scenarios.describeWork(state, 8, placeholders(scenarios.WORDING_KEYS))).toBe([
      'TECHNOLOGY: Doorbell',
      'STAKEHOLDERS:\n- Drivers — INDIRECT',
      'SCENARIOS:\n1. Watched\n   WHOSE: Drivers\n   STORY: Sam delivers.\n   DECADES: Rated by clips.\n' +
        '   WIDESPREAD: Every door films.\n   SYSTEMIC: Employers lean on it.\n   VALUES: Dignity (HARM)\n' +
        '2. UNTITLED\n   WHOSE: UNNAMED\n   STORY: BLANK\n   YEARS: BLANK\n   WIDESPREAD: BLANK\n   SYSTEMIC: BLANK\n   VALUES: NONE',
      'TENSIONS:\n- 1. Watched VERSUS 2. UNTITLED: Proof vs dignity',
    ].join('\n\n'));
  });

  it('uses each lesson’s words and leaves out ids and board positions', () => {
    for (const { activity, text } of steps) {
      expect(text).not.toMatch(/\bex-|\bexs-|"x":|\{\w+\}/);
      expect(text).toContain(Object.values(activity.wording ?? {})[0]);
    }
  });
});

describe('never ahead of the step', () => {
  // Every part of the work a later step adds is empty before that step, so neither the text nor the
  // data sent with it can show it early (the worked example has every part filled in).
  const before = (unlocks: number, n: number) => n < unlocks;

  it.each(steps.filter((s) => s.activity.kind === 'stakeholder-tokens').map((s) => [`step ${s.n}`, s] as const))(
    'Stakeholder Analysis, %s', (_, { n, work }) => {
      const b = work as tokens.StakeholderTokensState;
      const { STEP } = tokens;
      if (before(STEP.direct, n)) expect(b.tokens).toEqual([]);
      if (before(STEP.indirect, n)) expect(b.tokens.filter((t) => t.kind === 'indirect')).toEqual([]);
      if (before(STEP.overlooked, n)) expect(b.tokens.some((t) => t.overlooked)).toBe(false);
      if (before(STEP.relationships, n)) expect(b.links.filter((l) => l.type === 'relationship')).toEqual([]);
      if (before(STEP.impacts, n)) expect(b.impacts).toEqual([]);
      if (before(STEP.values, n)) expect([b.values, b.impacts.flatMap((i) => i.valueIds)]).toEqual([[], []]);
      if (before(STEP.definitions, n)) expect(b.values.filter((v) => v.definition)).toEqual([]);
      if (before(STEP.tensions, n)) expect(b.links.filter((l) => l.type === 'tension')).toEqual([]);
      if (before(STEP.organization, n)) expect([...b.values, ...b.links].filter((x) => x.owner || x.action)).toEqual([]);
    });

  it.each(steps.filter((s) => s.activity.kind === 'value-scenarios').map((s) => [`step ${s.n}`, s] as const))(
    'Value Scenarios, %s', (_, { n, work }) => {
      const v = work as scenarios.ValueScenariosState;
      const { STEP } = scenarios;
      if (before(STEP.stakeholders, n)) expect(v.stakeholders).toEqual([]);
      if (before(STEP.story, n)) expect(v.scenarios).toEqual([]);
      if (before(STEP.time, n)) expect(v.scenarios.filter((sc) => sc.later)).toEqual([]);
      if (before(STEP.widespread, n)) expect(v.scenarios.filter((sc) => sc.widespread)).toEqual([]);
      if (before(STEP.systemic, n)) expect(v.scenarios.filter((sc) => sc.systemic)).toEqual([]);
      if (before(STEP.values, n)) expect(v.scenarios.flatMap((sc) => sc.values)).toEqual([]);
      if (before(STEP.tensions, n)) expect(v.tensions).toEqual([]);
    });
});

describe('connections around the centre token (linkBend)', () => {
  const left = { x: -110, y: 0 };
  const right = { x: 110, y: 0 };
  const below = { x: -100, y: 150 };

  it('keeps a relationship straight when it doesn’t cross the centre', () => {
    expect(tokens.linkBend(left, below, 'relationship')).toBe(0);
  });

  it('bends a relationship through the centre far enough to clear the centre token', () => {
    const bend = tokens.linkBend(left, right, 'relationship');
    // The curve's midpoint sits `bend` off the line, which here passes right through the centre.
    expect(Math.abs(bend)).toBeGreaterThan(tokens.CONTEXT_SIZE / 2);
  });

  it('bows a tension, and further out than a relationship on the same pair, on the same side', () => {
    expect(tokens.linkBend(left, below, 'tension')).toBe(tokens.TENSION_BEND);
    const relationship = tokens.linkBend(left, right, 'relationship');
    const tension = tokens.linkBend(left, right, 'tension');
    expect(Math.sign(tension)).toBe(Math.sign(relationship));
    expect(Math.abs(tension)).toBe(Math.abs(relationship) + tokens.TENSION_BEND);
  });
});
