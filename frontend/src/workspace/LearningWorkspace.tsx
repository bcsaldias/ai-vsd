import type { Lesson } from '../types/contracts';

interface Props {
  lesson: Lesson;
  currentActivityId: string;
  onSelectActivity: (activityId: string) => void;
}

/** Lesson intro, the current activity's card (what to do + objectives), and the activity list.
    Activities don't repeat their prompt; this card is where students read it. */
export function LearningWorkspace({ lesson, currentActivityId, onSelectActivity }: Props) {
  const index = lesson.activities.findIndex((a) => a.id === currentActivityId);
  const current = lesson.activities[index];

  return (
    <section id="workspace-panel" className="panel workspace-panel" aria-label="VSD Learning workspace">
      <header className="panel-header">
        <h2>{lesson.title}</h2>
      </header>
      <div className="panel-body">
        <p>{lesson.intro}</p>

        <div className="lesson-steps">
          {current && (
            <article className="step-card" aria-labelledby="step-card-title">
              <span className="step-count">Step {index + 1} of {lesson.activities.length}</span>
              <h3 id="step-card-title" className="step-title">{current.title}</h3>
              <p>{current.prompt}</p>
              <h4>What you're aiming for</h4>
              <ul>
                {current.objectives.map((o) => <li key={o}>{o}</li>)}
              </ul>
            </article>
          )}

          <nav aria-label="Activities">
            <h3>Activities</h3>
            <ol className="activity-list">
              {lesson.activities.map((a) => (
                <li key={a.id}>
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
          </nav>
        </div>
      </div>
    </section>
  );
}
