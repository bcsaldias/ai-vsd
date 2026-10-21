// Chooses which lesson's prompts the Prompts and Versions tabs work on (each lesson has its own).
// Looks like the lesson switcher in the workspace: the active lesson is filled with its color.

import type { CSSProperties } from 'react';
import type { LessonSummary } from '../types/contracts';

interface Props {
  lessons: LessonSummary[];
  value: string | null;
  onChange: (id: string) => void;
}

export function LessonPicker({ lessons, value, onChange }: Props) {
  return (
    <nav className="lesson-switch lesson-picker" aria-label="Lesson">
      {lessons.map((l) => (
        <button
          key={l.id}
          className={l.id === value ? 'lesson-tab active' : 'lesson-tab'}
          style={{ '--tab-accent': l.accent } as CSSProperties}
          aria-current={l.id === value ? 'page' : undefined}
          onClick={() => l.id !== value && onChange(l.id)}
        >
          <span className="lesson-mark" aria-hidden="true">{l.symbol}</span> {l.title}
        </button>
      ))}
    </nav>
  );
}

/** The lesson's accent as a CSS variable, for a page that shows one lesson's prompts. */
export const lessonAccent = (lessons: LessonSummary[], id: string | null) =>
  ({ '--lesson': lessons.find((l) => l.id === id)?.accent } as CSSProperties);
