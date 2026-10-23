import { useEffect, useRef, useState } from 'react';
import type { Lesson } from '../types/contracts';

interface Props {
  lesson: Lesson;
  currentActivityId: string;
  onSelectActivity: (activityId: string) => void;
  /** The current activity's work has been checked and hasn't changed since. */
  checked: boolean;
  /** There is work to check. */
  canCheck: boolean;
  onCheck: () => void;
  /** Goes to the next activity; absent on the last one. */
  onNext?: () => void;
  hasExample: boolean;
  showingExample: boolean;
  onToggleExample: () => void;
}

/** Lesson intro, the current activity's card (what to do + objectives), and the activity list.
    Activities don't repeat their prompt; this card is where students read it. */
export function LearningWorkspace({
  lesson, currentActivityId, onSelectActivity, checked, canCheck, onCheck, onNext, hasExample, showingExample, onToggleExample,
}: Props) {
  const index = lesson.activities.findIndex((a) => a.id === currentActivityId);
  const current = lesson.activities[index];

  // "Next" on unchecked work first offers to check it. Keyed by activity, so it closes on any step change.
  const [offerFor, setOfferFor] = useState<string | null>(null);
  const offering = offerFor === currentActivityId;
  const offerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (offering) offerRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
  }, [offering]);

  // Spotlight the activity's elements for a guide item. Elements are found by their data-guide
  // attribute, so the card doesn't depend on how any activity is built.
  const spotlight = (target: string | null) => {
    document.querySelectorAll('[data-spotlight]').forEach((el) => el.removeAttribute('data-spotlight'));
    if (target) document.querySelectorAll(`[data-guide="${target}"]`).forEach((el) => el.setAttribute('data-spotlight', ''));
  };
  const showMe = (target: string) => {
    const el = document.querySelector(`[data-guide="${target}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    spotlight(target);
  };
  useEffect(() => () => spotlight(null), [currentActivityId]);

  const next = () => {
    if (!onNext) return;
    if (checked) onNext();
    else setOfferFor(currentActivityId);
  };

  return (
    <section id="workspace-panel" className="panel workspace-panel" aria-label="VSD Learning workspace">
      <header className="panel-header">
        <h2><span className="lesson-mark" aria-hidden="true">{lesson.symbol}</span> {lesson.title}</h2>
      </header>
      <div className="panel-body">
        <p>{lesson.intro}</p>

        <div className="lesson-steps">
          {current && (
            <article className="step-card" aria-labelledby="step-card-title">
              <span className="step-count">
                <span className="lesson-mark" aria-hidden="true">{lesson.symbol}</span> {lesson.title} · Step {index + 1} of {lesson.activities.length}
              </span>
              <h3 id="step-card-title" className="step-title">{current.title}</h3>
              <p>{current.prompt}</p>
              {current.guide && current.guide.length > 0 && (
                <>
                  <h4>New in this step</h4>
                  <ul className="guide-list">
                    {current.guide.map((g) => (
                      <li key={g.target}>
                        <button
                          className="guide-item"
                          onMouseEnter={() => spotlight(g.target)}
                          onMouseLeave={() => spotlight(null)}
                          onFocus={() => spotlight(g.target)}
                          onBlur={() => spotlight(null)}
                          onClick={() => showMe(g.target)}
                          title="Show me"
                        >
                          <span className="guide-label">{g.label}</span>
                          <span className="guide-where">{g.where}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <h4>What you're aiming for</h4>
              <ul>
                {current.objectives.map((o) => <li key={o}>{o}</li>)}
              </ul>
              {hasExample && (
                <button className="example-toggle" onClick={onToggleExample} aria-pressed={showingExample}>
                  {showingExample ? 'Back to my board' : 'See an example of this step'}
                </button>
              )}
            </article>
          )}

          <nav aria-label="Activities">
            <h3>Activities</h3>
            <ol className="activity-list">
              {lesson.activities.map((a) => (
                <li key={a.id} className={a.id === currentActivityId ? 'current' : undefined}>
                  <button
                    className={a.id === currentActivityId ? 'link active' : 'link'}
                    onClick={() => onSelectActivity(a.id)}
                    aria-current={a.id === currentActivityId ? 'step' : undefined}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
            </ol>

            {onNext && !offering && (
              <button className="primary next-step" onClick={next}>Next</button>
            )}
            {onNext && offering && (
              <div className="next-offer" ref={offerRef} role="group" aria-label="Before you move on">
                <p>Check your work before moving on? Feedback will appear in the Feedback panel.</p>
                {!canCheck && <p className="hint">Nothing to check yet: you haven’t changed anything in this step.</p>}
                <div className="inline-buttons">
                  <button className="primary" disabled={!canCheck} onClick={() => { setOfferFor(null); onCheck(); }}>
                    Check my work
                  </button>
                  <button onClick={() => { setOfferFor(null); onNext(); }}>Skip to next step</button>
                </div>
              </div>
            )}
          </nav>
        </div>
      </div>
    </section>
  );
}
