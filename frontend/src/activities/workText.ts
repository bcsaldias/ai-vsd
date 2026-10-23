// How each activity writes a student's work out in plain language for the AI ({{student_work}}).
// The wording comes from the lesson's content/<lesson>/work-description.json; each activity's
// defaults fill in any label the file leaves out. Activities not listed here are sent as JSON.

import type { ActivityDefinition, ActivityKind } from '../types/contracts';
import * as tokens from './stakeholder-tokens/model';
import * as scenarios from './value-scenarios/model';

interface WorkText {
  /** Every label the activity uses, with its default wording. */
  labels: Record<string, string>;
  describe: (state: unknown, step: number, labels: Record<string, string>) => string;
}

export const WORK_TEXT: Partial<Record<ActivityKind, WorkText>> = {
  'stakeholder-tokens': {
    labels: tokens.WORK_LABELS,
    describe: (s, step, t) => tokens.describeWork(tokens.normalize(s as Partial<tokens.StakeholderTokensState> | null), step, t as tokens.WorkLabels),
  },
  'value-scenarios': {
    labels: scenarios.WORK_LABELS,
    describe: (s, step, t) =>
      scenarios.describeWork(scenarios.normalize(s as Partial<scenarios.ValueScenariosState> | null), step, t as scenarios.WorkLabels),
  },
};

/** The work (already limited to the activity's step) in plain language, or null when the activity
    has no plain-language form and is sent as JSON. */
export function describeWork(definition: ActivityDefinition, state: unknown): string | null {
  const entry = WORK_TEXT[definition.kind];
  if (!entry) return null;
  const step = typeof definition.config?.step === 'number' ? definition.config.step : Infinity;
  return entry.describe(state, step, { ...entry.labels, ...definition.workLabels });
}
