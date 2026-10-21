// Coordinates the three panels. Holds which activity is current and routes
// reports to persistence and feedback; implements no activity behavior itself.

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { ActivityReport, ActivityStatus, Feedback, Lesson } from '../types/contracts';
import { clearWork, exportWork, getLesson, importWork, loadReport, saveReport } from '../services/activityService';
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
  // The current activity's latest report — what "Check my work" submits — and its status
  // (null until there is work to check).
  const latest = useRef<ActivityReport | null>(null);
  const [status, setStatus] = useState<ActivityStatus | null>(null);
  // Bumped to remount the activity with new saved state (after Import or Start over).
  const [hostVersion, setHostVersion] = useState(0);
  const importInput = useRef<HTMLInputElement>(null);
  // Expanded = activity panel fills the visible area; Restore returns to the previous height.
  const [expanded, setExpanded] = useState(false);
  const restoreActivityTo = useRef<number>(LAYOUT_LIMITS.activityHeight.default);
  // Rendered height of the top panels, so the divider above the activity panel can start
  // a drag from "fit content" (topHeight null).
  const [measuredTop, setMeasuredTop] = useState<number>(LAYOUT_LIMITS.topHeight.min);

  useEffect(() => {
    const top = gridRef.current?.querySelector<HTMLElement>('.workspace-panel');
    if (!top) return;
    const observer = new ResizeObserver(() => setMeasuredTop(Math.round(top.getBoundingClientRect().height)));
    observer.observe(top);
    return () => observer.disconnect();
  }, [lesson]);

  useEffect(() => {
    getLesson().then((l) => {
      setLesson(l);
      setActivityId(l.activities[0]?.id ?? null);
    });
  }, []);

  useEffect(() => {
    currentId.current = activityId;
    const definition = lesson?.activities.find((a) => a.id === activityId);
    if (!activityId || !definition) return;
    setFeedback(null);
    latest.current = null;
    setStatus(null);
    loadReport(definition).then((report) => {
      if (currentId.current !== activityId) return;
      setSaved({ activityId, report });
      latest.current = report;
      setStatus(report?.status ?? null);
    });
  }, [activityId, lesson]);

  const handleReport = async (report: ActivityReport) => {
    const definition = lesson?.activities.find((a) => a.id === report.activityId);
    if (!definition) return;
    if (report.activityId === currentId.current) {
      latest.current = report;
      setStatus(report.status);
    }
    await saveReport(definition, report);
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
  const index = lesson.activities.findIndex((a) => a.id === activityId);
  const definition = lesson.activities[index];
  const next = lesson.activities[index + 1];

  // Submits the latest work for the current activity (from the activity panel or the Next prompt).
  const checkWork = () => {
    if (!latest.current) return;
    handleReport({
      ...latest.current,
      activityId: definition.id,
      kind: definition.kind,
      status: 'submitted',
      updatedAt: new Date().toISOString(),
    });
  };
  // Activities sharing this one's state (all steps of one board), or just this activity.
  const group = definition.stateKey ? lesson.activities.filter((a) => a.stateKey === definition.stateKey) : [definition];

  const exportBoard = () => {
    if (!latest.current) return;
    const { filename, text } = exportWork(definition, latest.current.state);
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: filename });
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBoard = async (file: File) => {
    const result = importWork(definition, await file.text());
    if ('error' in result) {
      window.alert(result.error);
      return;
    }
    if (latest.current && !window.confirm('Replace your current work with the imported file?')) return;
    const report: ActivityReport = {
      activityId: definition.id,
      kind: definition.kind,
      status: 'in-progress',
      state: result.state,
      updatedAt: new Date().toISOString(),
    };
    setFeedback(null);
    await handleReport(report);
    setSaved({ activityId: definition.id, report });
    setHostVersion((v) => v + 1);
  };

  const startOver = async () => {
    const what = group.length > 1 ? `your work for all ${group.length} steps` : 'your work on this activity';
    if (!window.confirm(`This clears ${what}. Start over?`)) return;
    await clearWork(group);
    const first = group[0];
    latest.current = null;
    setStatus(null);
    setFeedback(null);
    setSaved({ activityId: first.id, report: null });
    setActivityId(first.id);
    setHostVersion((v) => v + 1);
  };

  // Activities that share state (the steps of one board) share one host, so the board
  // stays mounted — with its zoom and selection — when the student moves between steps.
  const hostKey = (id: string) => lesson.activities.find((a) => a.id === id)?.stateKey ?? id;
  const hostReady = saved !== null && hostKey(saved.activityId) === hostKey(activityId);

  const gridStyle = {
    '--feedback-size': layout.feedback,
    '--activity-height': `${layout.activityHeight}px`,
    ...(layout.topHeight != null && { '--top-height': `${layout.topHeight}px` }),
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

  const hasWork = status !== null;
  const headerActions = (
    <>
      <div className="work-actions" role="group" aria-label="Your work">
        <button className="small" onClick={exportBoard} disabled={!hasWork} title="Download your work as a file">Export</button>
        <button className="small" onClick={() => importInput.current?.click()} title="Load work from an exported file">Import</button>
        <button className="small" onClick={startOver} disabled={!hasWork}>Start over</button>
        <input
          ref={importInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = ''; // so choosing the same file again still fires
            if (file) importBoard(file);
          }}
        />
      </div>
      <button className="expand-toggle" onClick={toggleExpanded} aria-controls="activity-panel">
        {expanded ? 'Restore' : 'Expand'}
      </button>
    </>
  );

  return (
    <div className="workspace-grid" ref={gridRef} style={gridStyle}>
      <LearningWorkspace
        lesson={lesson}
        currentActivityId={activityId}
        onSelectActivity={setActivityId}
        checked={status === 'submitted'}
        canCheck={status !== null}
        onCheck={checkWork}
        onNext={next ? () => setActivityId(next.id) : undefined}
      />
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
      <ResizeHandle
        orientation="horizontal"
        label="Resize top panels"
        controls="workspace-panel feedback-panel"
        pane="before"
        unit="px"
        value={layout.topHeight ?? measuredTop}
        min={LAYOUT_LIMITS.topHeight.min}
        max={LAYOUT_LIMITS.topHeight.max}
        defaultValue={measuredTop}
        onChange={(topHeight) => setLayout((l) => ({ ...l, topHeight }))}
        onReset={() => setLayout((l) => ({ ...l, topHeight: null }))}
        className="top-split"
      />
      {hostReady ? (
        <ActivityHost
          key={`${hostKey(activityId)}#${hostVersion}`}
          definition={definition}
          number={index + 1}
          onCheck={checkWork}
          canCheck={status !== null}
          savedReport={saved.report}
          onReport={handleReport}
          headerActions={headerActions}
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
