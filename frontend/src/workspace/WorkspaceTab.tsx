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

  const gridStyle = { '--feedback-size': layout.feedback, '--activity-size': layout.activity } as CSSProperties;

  return (
    <div className="workspace-grid" ref={gridRef} style={gridStyle}>
      <LearningWorkspace lesson={lesson} currentActivityId={activityId} onSelectActivity={setActivityId} />
      <ResizeHandle
        orientation="vertical"
        label="Resize feedback panel"
        controls="feedback-panel"
        value={layout.feedback}
        min={LAYOUT_LIMITS.feedback.min}
        max={LAYOUT_LIMITS.feedback.max}
        minPx={LAYOUT_LIMITS.feedback.minPx}
        defaultValue={LAYOUT_LIMITS.feedback.default}
        containerRef={gridRef}
        onChange={(feedback) => setLayout((l) => ({ ...l, feedback }))}
      />
      <FeedbackPanel feedback={feedback} loading={loadingFeedback} />
      <ResizeHandle
        orientation="horizontal"
        label="Resize activity panel"
        controls="activity-panel"
        value={layout.activity}
        min={LAYOUT_LIMITS.activity.min}
        max={LAYOUT_LIMITS.activity.max}
        minPx={LAYOUT_LIMITS.activity.minPx}
        defaultValue={LAYOUT_LIMITS.activity.default}
        containerRef={gridRef}
        onChange={(activity) => setLayout((l) => ({ ...l, activity }))}
      />
      {saved?.activityId === activityId ? (
        <ActivityHost key={activityId} definition={definition} savedReport={saved.report} onReport={handleReport} />
      ) : (
        <section id="activity-panel" className="panel activity-panel" aria-label="Activity">
          <p className="panel-body hint">Loading activity…</p>
        </section>
      )}
    </div>
  );
}
