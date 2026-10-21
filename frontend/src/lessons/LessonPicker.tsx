// Chooses which lesson's prompts the Prompts and Versions tabs work on (each lesson has its own).

import type { LessonSummary } from '../types/contracts';

interface Props {
  lessons: LessonSummary[];
  value: string | null;
  onChange: (id: string) => void;
}

export function LessonPicker({ lessons, value, onChange }: Props) {
  return (
    <label className="lesson-picker">
      <span>Lesson</span>
      <select value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {lessons.map((l) => <option key={l.id} value={l.id}>{l.title}</option>)}
      </select>
    </label>
  );
}
