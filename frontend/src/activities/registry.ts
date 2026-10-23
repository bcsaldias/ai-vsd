// What the app needs from each activity besides rendering it: its work as of a step, that work in
// plain language for the AI ({{student_work}}), the words it takes from the lesson's wording.json,
// and, optionally, its stakeholders for other activities. Plain functions, no React, so the
// Workspace, the Prompts tab, and the content loader all use the same ones. An activity not listed
// here keeps its whole state at every step and is sent to the AI as JSON.

import type { ActivityDefinition, ActivityKind, StakeholderRef } from '../types/contracts';
import * as tokens from './stakeholder-tokens/model';
import * as scenarios from './value-scenarios/model';

interface ActivityModel {
  /** The part of the state that exists by a step. */
  forStep: (state: unknown, step: number) => unknown;
  /** The state as of a step, in plain language, in the lesson's words. */
  describe: (state: unknown, step: number, wording: Record<string, string>) => string;
  /** Every word the activity takes from wording.json. */
  wordingKeys: readonly string[];
  /** The stakeholders in a saved state, for other activities to bring in (see stakeholderSource). */
  stakeholders?: (state: unknown) => StakeholderRef[];
}

const board = (s: unknown) => tokens.normalize(s as Partial<tokens.StakeholderTokensState> | null);
const stories = (s: unknown) => scenarios.normalize(s as Partial<scenarios.ValueScenariosState> | null);

const MODELS: Partial<Record<ActivityKind, ActivityModel>> = {
  'stakeholder-tokens': {
    forStep: (s, step) => tokens.forStep(board(s), step),
    describe: (s, step, w) => tokens.describeWork(board(s), step, w as tokens.Wording),
    wordingKeys: tokens.WORDING_KEYS,
    stakeholders: tokens.stakeholderRefs,
  },
  'value-scenarios': {
    forStep: (s, step) => scenarios.forStep(stories(s), step),
    describe: (s, step, w) => scenarios.describeWork(stories(s), step, w as scenarios.Wording),
    wordingKeys: scenarios.WORDING_KEYS,
  },
};

const stepOf = (definition: ActivityDefinition) => (typeof definition.config?.step === 'number' ? definition.config.step : Infinity);

/** Work on a shared board as of this activity's step, without anything from later steps. */
export function workUpToStep(definition: ActivityDefinition, state: unknown): unknown {
  const model = MODELS[definition.kind];
  return model ? model.forStep(state, stepOf(definition)) : state;
}

/** The work (already limited to the step) in plain language, or null when the activity has none. */
export function describeWork(definition: ActivityDefinition, state: unknown): string | null {
  const model = MODELS[definition.kind];
  return model ? model.describe(state, stepOf(definition), definition.wording ?? {}) : null;
}

/** The words an activity takes from wording.json (none for activities not listed here). */
export const wordingKeys = (kind: ActivityKind): readonly string[] => MODELS[kind]?.wordingKeys ?? [];

/** How to list the stakeholders in an activity's saved state, if it has any. */
export const stakeholdersFrom = (kind: ActivityKind) => MODELS[kind]?.stakeholders;
