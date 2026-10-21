// Renders the activity for a definition and wraps its state in the standard
// ActivityReport envelope. Knows nothing about how any activity works inside.
// Checking work is coordinated by WorkspaceTab, so it can also be triggered from elsewhere.

import type { ReactNode } from 'react';
import type { ActivityDefinition, ActivityReport } from '../types/contracts';
import { DiagramActivity, type DiagramState } from '../activities/diagram/DiagramActivity';
import { AnnotationActivity, type AnnotationState } from '../activities/annotation/AnnotationActivity';
import {
  StakeholderTokensActivity, type StakeholderTokensState,
} from '../activities/stakeholder-tokens/StakeholderTokensActivity';

interface Props {
  definition: ActivityDefinition;
  /** 1-based position of the activity in the lesson, shown in the header. */
  number: number;
  savedReport: ActivityReport | null;
  onReport: (report: ActivityReport) => void;
  onCheck: () => void;
  canCheck: boolean;
  /** Show `savedReport` as a read-only worked example. */
  example?: boolean;
  /** Extra header controls supplied by the layout (e.g. expand). */
  headerActions?: ReactNode;
}

export function ActivityHost({ definition, number, savedReport, onReport, onCheck, canCheck, example, headerActions }: Props) {
  const onChange = (state: unknown) =>
    !example &&
    onReport({
      activityId: definition.id,
      kind: definition.kind,
      status: 'in-progress',
      state,
      updatedAt: new Date().toISOString(),
    });

  const common = { prompt: definition.prompt, config: definition.config, onChange, example };

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
  }

  return (
    <section id="activity-panel" className={example ? 'panel activity-panel showing-example' : 'panel activity-panel'} aria-label="Activity">
      <header className="panel-header">
        <h2>
          Step {number} · {definition.title}
          {example && <span className="badge">Example</span>}
        </h2>
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
