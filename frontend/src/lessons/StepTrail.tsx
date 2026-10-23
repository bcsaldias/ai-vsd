// The lesson's steps as a trail of dots (o → o → o) under its sections, on Workspace and Prompts.
// The current step is filled with the lesson's color; clicking a dot opens that step everywhere.

import type { CSSProperties } from 'react';
import type { Lesson } from '../types/contracts';

interface Props {
  lesson: Lesson;
  currentId: string;
  onSelect: (activityId: string) => void;
}

export function StepTrail({ lesson, currentId, onSelect }: Props) {
  const index = Math.max(0, lesson.activities.findIndex((a) => a.id === currentId));
  const total = lesson.activities.length;
  return (
    <nav className="step-trail" aria-label={`Steps in ${lesson.title}`} style={{ '--lesson': lesson.accent } as CSSProperties}>
      <ol>
        {lesson.activities.map((a, i) => (
          <li key={a.id}>
            {i > 0 && <span className="step-arrow" aria-hidden="true" />}
            <button
              className="step-dot"
              aria-label={`Step ${i + 1} of ${total}: ${a.title}`}
              aria-current={i === index ? 'step' : undefined}
              data-tip={`Step ${i + 1} · ${a.title}`}
              onClick={() => onSelect(a.id)}
            />
          </li>
        ))}
      </ol>
      <span className="step-trail-label">
        Step {index + 1} of {total} · {lesson.activities[index]?.title}
      </span>
    </nav>
  );
}
