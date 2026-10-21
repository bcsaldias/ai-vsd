// Shared data contracts. Panels, activities, and services depend on these
// shapes only — never on each other's internals.

// ---------- Lessons & activities ----------

export type ActivityKind = 'diagram' | 'annotation';

export interface ActivityDefinition {
  id: string;
  kind: ActivityKind;
  title: string;
  prompt: string;
  /** What the student should demonstrate; also given to the AI as rubric context. */
  objectives: string[];
}

export interface Lesson {
  id: string;
  title: string;
  intro: string;
  activities: ActivityDefinition[];
}

export type ActivityStatus = 'in-progress' | 'submitted';

/** What every activity component receives. */
export interface ActivityProps<S> {
  prompt: string;
  savedState: S | null;
  onChange: (state: S) => void;
}

/** Standard envelope ActivityHost builds from an activity's state. Persisted and sent for feedback. */
export interface ActivityReport<S = unknown> {
  activityId: string;
  kind: ActivityKind;
  status: ActivityStatus;
  state: S;
  updatedAt: string;
}

// ---------- Feedback ----------

export interface FeedbackItem {
  id: string;
  tone: 'praise' | 'suggestion' | 'issue';
  message: string;
  /** Optional id of a node / region in the activity this item refers to. */
  targetId?: string;
}

export interface Feedback {
  activityId: string;
  source: 'mock' | 'ai';
  /** Which prompt version produced this feedback (for reproducibility). */
  promptVersionId: string | null;
  generatedAt: string;
  summary: string;
  items: FeedbackItem[];
}

// ---------- Prompts & versions ----------

export type PromptRole = 'system' | 'user' | 'assistant';

/** One editable template per chat role. `user` supports {{variables}}. */
export type PromptSet = Record<PromptRole, string>;

export interface PromptVersion {
  id: string;
  number: number;
  author: string;
  note: string;
  createdAt: string;
  prompts: PromptSet;
}
