import type { Lesson } from '../types/contracts';

interface Props {
  lesson: Lesson;
  currentActivityId: string;
  onSelectActivity: (activityId: string) => void;
}

export function LearningWorkspace({ lesson, currentActivityId, onSelectActivity }: Props) {
  const current = lesson.activities.find((a) => a.id === currentActivityId);

  return (
    <section className="panel workspace-panel" aria-label="VSD Learning workspace">
      <header className="panel-header">
        <h2>{lesson.title}</h2>
      </header>
      <div className="panel-body">
        <p>{lesson.intro}</p>

        <h3>Activities</h3>
        <ol className="activity-list">
          {lesson.activities.map((a) => (
            <li key={a.id}>
              <button
                className={a.id === currentActivityId ? 'link active' : 'link'}
                onClick={() => onSelectActivity(a.id)}
                aria-current={a.id === currentActivityId}
              >
                {a.title}
              </button>
            </li>
          ))}
        </ol>

        {current && (
          <>
            <h3>What you're aiming for</h3>
            <ul>
              {current.objectives.map((o) => <li key={o}>{o}</li>)}
            </ul>
          </>
        )}
      </div>
    </section>
  );
}
