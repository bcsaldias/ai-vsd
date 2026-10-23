// Renders the activity for a definition and wraps its state in the standard
// ActivityReport envelope. Knows nothing about how any activity works inside.
// Checking work is coordinated by WorkspaceTab, so it can also be triggered from elsewhere.

import type { ReactNode } from 'react';
import type { ActivityDefinition, ActivityKind, ActivityReport, StakeholderRef } from '../types/contracts';
import { DiagramActivity, type DiagramState } from '../activities/diagram/DiagramActivity';
import { AnnotationActivity, type AnnotationState } from '../activities/annotation/AnnotationActivity';
import {
  StakeholderTokensActivity, type StakeholderTokensState,
} from '../activities/stakeholder-tokens/StakeholderTokensActivity';
import * as tokens from '../activities/stakeholder-tokens/model';
import { ValueScenariosActivity, type ValueScenariosState } from '../activities/value-scenarios/ValueScenariosActivity';
import * as scenarios from '../activities/value-scenarios/model';

/** Activities whose saved state can list stakeholders for other activities (see stakeholderSource). */
export const STAKEHOLDER_EXPORTERS: Partial<Record<ActivityKind, (state: unknown) => StakeholderRef[]>> = {
  'stakeholder-tokens': tokens.stakeholderRefs,
};

/** Activities whose steps share one state: the part of it that exists by a step (config.step). */
const STEP_VIEWS: Partial<Record<ActivityKind, (state: unknown, step: number) => unknown>> = {
  'stakeholder-tokens': (s, step) => tokens.forStep(tokens.normalize(s as Partial<StakeholderTokensState> | null), step),
  'value-scenarios': (s, step) => scenarios.forStep(scenarios.normalize(s as Partial<ValueScenariosState> | null), step),
};

/** Work on a shared board as of this activity's step, without anything from later steps. */
export function workUpToStep(definition: ActivityDefinition, state: unknown): unknown {
  const view = STEP_VIEWS[definition.kind];
  const step = definition.config?.step;
  return view && typeof step === 'number' ? view(state, step) : state;
}

interface Props {
  definition: ActivityDefinition;
  savedReport: ActivityReport | null;
  onReport: (report: ActivityReport) => void;
  onCheck: () => void;
  canCheck: boolean;
  /** Show `savedReport` as a read-only worked example. */
  example?: boolean;
  /** Leaves the example (shown next to the Example badge). */
  onExitExample?: () => void;
  importStakeholders?: { label: string; load: () => Promise<StakeholderRef[]> };
  /** Extra header controls supplied by the layout (e.g. expand). */
  headerActions?: ReactNode;
}

export function ActivityHost({
  definition, savedReport, onReport, onCheck, canCheck, example, onExitExample, importStakeholders, headerActions,
}: Props) {
  const onChange = (state: unknown) =>
    !example &&
    onReport({
      activityId: definition.id,
      kind: definition.kind,
      status: 'in-progress',
      state,
      updatedAt: new Date().toISOString(),
    });

  const common = { prompt: definition.prompt, config: definition.config, onChange, example, importStakeholders };

  let activity;
  switch (definition.kind) {
    case 'diagram':
      activity = <DiagramActivity {...common} savedState={savedReport?.state as DiagramState | null} />;
      break;
    case 'annotation':
      activity = <AnnotationActivity {...common} savedState={savedReport?.state as AnnotationState | null} />;
      break;
    case 'stakeholder-tokens':
      activity = <StakeholderTokensActivity {...common} savedState={savedReport?.state as StakeholderTokensState | null} />;
      break;
    case 'value-scenarios':
      activity = <ValueScenariosActivity {...common} savedState={savedReport?.state as ValueScenariosState | null} />;
      break;
  }

  return (
    <section id="activity-panel" className={example ? 'panel activity-panel showing-example' : 'panel activity-panel'} aria-label="Activity">
      <header className="panel-header">
        <div className="panel-title">
          {/* Named by its role: the lesson is in the top bar and the step in the trail, both always in view. */}
          <h2>{example ? 'Worked example' : 'Your work'}</h2>
          {example && onExitExample && <button className="small primary" onClick={onExitExample}>← Back to my board</button>}
        </div>
        <div className="actions">
          {headerActions}
          {!example && (
            <button className="primary" onClick={onCheck} disabled={!canCheck}>
              Check my work
            </button>
          )}
        </div>
      </header>
      <div className="panel-body">{activity}</div>
    </section>
  );
}
