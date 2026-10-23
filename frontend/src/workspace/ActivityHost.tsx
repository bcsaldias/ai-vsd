// Renders the activity for a definition and wraps its state in the standard
// ActivityReport envelope. Knows nothing about how any activity works inside.
// Checking work is coordinated by WorkspaceTab, so it can also be triggered from elsewhere.

import type { ReactNode } from 'react';
import type { ActivityDefinition, ActivityReport, StakeholderRef } from '../types/contracts';
import { DiagramActivity, type DiagramState } from '../activities/diagram/DiagramActivity';
import { AnnotationActivity, type AnnotationState } from '../activities/annotation/AnnotationActivity';
import {
  StakeholderTokensActivity, type StakeholderTokensState,
} from '../activities/stakeholder-tokens/StakeholderTokensActivity';
import { ValueScenariosActivity, type ValueScenariosState } from '../activities/value-scenarios/ValueScenariosActivity';

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

  const common = { prompt: definition.prompt, config: definition.config, onChange, example, importStakeholders, wording: definition.wording ?? {} };

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
