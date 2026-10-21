// Coordinates the three panels. Holds which activity is current and routes
// reports to persistence and feedback; implements no activity behavior itself.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ActivityReport, Feedback, Lesson } from '../types/contracts';
import { getLesson, loadReport, saveReport } from '../services/activityService';
import { requestFeedback } from '../services/feedbackService';
import { LearningWorkspace } from './LearningWorkspace';
import { FeedbackPanel } from './FeedbackPanel';
import { ActivityHost } from './ActivityHost';
import { ResizeHandle } from './ResizeHandle';
import { LAYOUT_LIMITS, useWorkspaceLayout } from './useWorkspaceLayout';

export function WorkspaceTab() {
  const [layout, setLayout] = useWorkspaceLayout();
  const gridRef = useRef<HTMLDivElement>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [saved, setSaved] = useState<{ activityId: string; report: ActivityReport | null } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const currentId = useRef<string | null>(null);
  // Expanded = activity panel fills the visible area; Restore returns to the previous height.
  const [expanded, setExpanded] = useState(false);
  const restoreActivityTo = useRef<number>(LAYOUT_LIMITS.activityHeight.default);

  useEffect(() => {
    getLesson().then((l) => {
      setLesson(l);
      setActivityId(l.activities[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    currentId.current = activityId;
    if (!activityId) return;
    setFeedback(null);
    loadReport(activityId).then((report) => setSaved({ activityId, report }));
  }, [activityId]);

  const handleReport = async (report: ActivityReport) => {
    await saveReport(report);
    if (report.status !== 'submitted') return;
    setLoadingFeedback(true);
    try {
      const result = await requestFeedback(report);
      // Ignore results for an activity the student has already left.
      if (result.activityId === currentId.current) setFeedback(result);
    } finally {
      setLoadingFeedback(false);
    }
  };

  if (!lesson || !activityId) return <p className="hint">Loading lesson…</p>;
  const definition = lesson.activities.find((a) => a.id === activityId)!;

  const gridStyle = {
    '--feedback-size': layout.feedback,
    '--activity-height': `${layout.activityHeight}px`,
  } as CSSProperties;

  const setActivityHeight = (activityHeight: number) => {
    setExpanded(false);
    setLayout((l) => ({ ...l, activityHeight }));
  };

  const toggleExpanded = () => {
    if (expanded) {
      setActivityHeight(restoreActivityTo.current);
      return;
    }
    restoreActivityTo.current = layout.activityHeight;
    setLayout((l) => ({ ...l, activityHeight: fillHeight(gridRef.current) }));
    setExpanded(true);
    requestAnimationFrame(() =>
      document.getElementById('activity-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' }),
    );
  };

  const expandButton = (
    <button className="expand-toggle" onClick={toggleExpanded} aria-controls="activity-panel">
      {expanded ? 'Restore' : 'Expand'}
    </button>
  );

  return (
    <div className="workspace-grid" ref={gridRef} style={gridStyle}>
      <LearningWorkspace lesson={lesson} currentActivityId={activityId} onSelectActivity={setActivityId} />
      <ResizeHandle
        orientation="vertical"
        label="Resize feedback panel"
        controls="feedback-panel"
        pane="after"
        unit="fraction"
        value={layout.feedback}
        min={LAYOUT_LIMITS.feedback.min}
        max={LAYOUT_LIMITS.feedback.max}
        minPx={LAYOUT_LIMITS.feedback.minPx}
        defaultValue={LAYOUT_LIMITS.feedback.default}
        containerRef={gridRef}
        onChange={(feedback) => setLayout((l) => ({ ...l, feedback }))}
      />
      <FeedbackPanel feedback={feedback} loading={loadingFeedback} />
      {saved?.activityId === activityId ? (
        <ActivityHost
          key={activityId}
          definition={definition}
          savedReport={saved.report}
          onReport={handleReport}
          headerActions={expandButton}
        />
      ) : (
        <section id="activity-panel" className="panel activity-panel" aria-label="Activity">
          <p className="panel-body hint">Loading activity…</p>
        </section>
      )}
      <ResizeHandle
        orientation="horizontal"
        label="Resize activity panel"
        controls="activity-panel"
        pane="before"
        unit="px"
        value={layout.activityHeight}
        min={LAYOUT_LIMITS.activityHeight.min}
        max={LAYOUT_LIMITS.activityHeight.max}
        defaultValue={LAYOUT_LIMITS.activityHeight.default}
        onChange={setActivityHeight}
      />
    </div>
  );
}

/** Activity height that fills the visible part of the page's scroll area. */
function fillHeight(grid: HTMLElement | null): number {
  const { min, max, default: fallback } = LAYOUT_LIMITS.activityHeight;
  if (!grid) return fallback;
  let scroller: HTMLElement | null = grid.parentElement;
  while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
  const viewport = scroller?.clientHeight ?? window.innerHeight;
  const s = getComputedStyle(grid);
  const handle = grid.querySelector<HTMLElement>('.resize-handle.horizontal')?.offsetHeight ?? 0;
  const height = viewport - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom) - handle;
  return Math.min(max, Math.max(min, Math.round(height)));
}
