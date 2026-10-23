// The lesson switcher at the top of the app. The lesson is the outer choice: Workspace, Prompts, and
// Versions all show the selected lesson. The active lesson is filled with its color.

import type { CSSProperties } from 'react';
import type { LessonSummary } from '../types/contracts';

interface Props {
  lessons: LessonSummary[];
  value: string | null;
  onChange: (id: string) => void;
  /** Lessons with unsaved prompt edits, marked with a dot. */
  unsaved?: string[];
}

export function LessonPicker({ lessons, value, onChange, unsaved = [] }: Props) {
  return (
    <nav className="lesson-switch" aria-label="Lesson">
      {lessons.map((l) => {
        const hasUnsaved = unsaved.includes(l.id);
        return (
          <button
            key={l.id}
            className={l.id === value ? 'lesson-tab active' : 'lesson-tab'}
            style={{ '--tab-accent': l.accent } as CSSProperties}
            aria-current={l.id === value ? 'page' : undefined}
            data-tip={hasUnsaved ? 'Unsaved prompt changes' : undefined}
            onClick={() => l.id !== value && onChange(l.id)}
          >
            <span className="lesson-mark" aria-hidden="true">{l.symbol}</span> {l.title}
            {hasUnsaved && (
              <>
                <span className="unsaved-dot" aria-hidden="true" />
                <span className="sr-only"> (unsaved prompt changes)</span>
              </>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** The lesson's accent as a CSS variable, for anything that shows one lesson. */
export const lessonAccent = (lessons: LessonSummary[], id: string | null) =>
  ({ '--lesson': lessons.find((l) => l.id === id)?.accent } as CSSProperties);
