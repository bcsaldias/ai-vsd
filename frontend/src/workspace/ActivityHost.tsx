// Renders the activity for a definition and wraps its state in the standard
// ActivityReport envelope. Knows nothing about how any activity works inside.

import { useState, type ReactNode } from 'react';
import type { ActivityDefinition, ActivityReport, ActivityStatus } from '../types/contracts';
import { DiagramActivity, type DiagramState } from '../activities/diagram/DiagramActivity';
import { AnnotationActivity, type AnnotationState } from '../activities/annotation/AnnotationActivity';
import {
  StakeholderTokensActivity, type StakeholderTokensState,
} from '../activities/stakeholder-tokens/StakeholderTokensActivity';

interface Props {
  definition: ActivityDefinition;
  savedReport: ActivityReport | null;
  onReport: (report: ActivityReport) => void;
  /** Extra header controls supplied by the layout (e.g. expand). */
  headerActions?: ReactNode;
}

export function ActivityHost({ definition, savedReport, onReport, headerActions }: Props) {
  const [latestState, setLatestState] = useState<unknown>(savedReport?.state ?? null);

  const report = (state: unknown, status: ActivityStatus) => {
    setLatestState(state);
    onReport({
      activityId: definition.id,
      kind: definition.kind,
      status,
      state,
      updatedAt: new Date().toISOString(),
    });
  };
  const onChange = (state: unknown) => report(state, 'in-progress');

  const common = { prompt: definition.prompt, config: definition.config, onChange };

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
    <section id="activity-panel" className="panel activity-panel" aria-label="Activity">
      <header className="panel-header">
        <h2>{definition.title}</h2>
        <div className="actions">
          {headerActions}
          <button className="primary" onClick={() => report(latestState, 'submitted')} disabled={latestState == null}>
            Check my work
          </button>
        </div>
      </header>
      <div className="panel-body">{activity}</div>
    </section>
  );
}
