// Shared data contracts. Panels, activities, and services depend on these
// shapes only — never on each other's internals.

// ---------- Lessons & activities ----------

export type ActivityKind = 'diagram' | 'annotation' | 'stakeholder-tokens' | 'value-scenarios';

/** Something an activity introduces, listed on the step card so students know where to look. */
export interface ActivityGuideItem {
  /** Matches data-guide="<target>" on the activity's elements; the card can spotlight them. */
  target: string;
  label: string;
  /** Where to find it, in the student's terms. */
  where: string;
}

export interface ActivityDefinition {
  id: string;
  kind: ActivityKind;
  title: string;
  prompt: string;
  /** What the student should demonstrate; also given to the AI as rubric context. */
  objectives: string[];
  /** Activities with the same stateKey work on one shared state (e.g. the steps of one board). */
  stateKey?: string;
  /** Activity-specific settings, passed through to the activity untouched (e.g. { step: 3 }). */
  config?: Record<string, unknown>;
  /** What is new in this activity and where to find it. */
  guide?: ActivityGuideItem[];
  /** A worked example in the activity's state shape, shown read-only on request. */
  example?: unknown;
  /** Wording for the student's work written out in plain language for the AI ({{student_work}}),
      from the lesson's work-description.json; the activity's defaults fill in the rest. */
  workLabels?: Record<string, string>;
  /** Where the student can optionally bring in stakeholders from (another lesson's saved work). */
  stakeholderSource?: { stateKey: string; kind: ActivityKind; label: string };
}

/** A stakeholder as passed between activities (e.g. from the stakeholder map into value scenarios). */
export interface StakeholderRef {
  name: string;
  kind: 'direct' | 'indirect';
}

export interface LessonSummary {
  id: string;
  title: string;
  /** Identifies the lesson in the workspace (lesson tab, step card band, activity header). Ink text must stay readable on it. */
  accent: string;
  /** A short symbol shown with the lesson name, so the lesson isn't told apart by color alone. */
  symbol: string;
}

export interface Lesson extends LessonSummary {
  intro: string;
  activities: ActivityDefinition[];
}

export type ActivityStatus = 'in-progress' | 'submitted';

/** What every activity component receives. The learning workspace shows the prompt to the
    student; activities get it too in case their behavior depends on it. */
export interface ActivityProps<S> {
  prompt: string;
  config?: Record<string, unknown>;
  savedState: S | null;
  /** Showing a worked example: read-only. Activities may show only what applies to the current step. */
  example?: boolean;
  /** Offered when the activity can bring in stakeholders from elsewhere (see stakeholderSource). */
  importStakeholders?: { label: string; load: () => Promise<StakeholderRef[]> };
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

/** The text parts of a lesson's prompts. */
export type PromptPart = 'system' | 'questions' | 'user';

/** A lesson's prompts. `user` is a template with {{variables}}. The questions to ask are sent inside
    the system prompt (see systemPromptParts): `questions` for every step, plus the checked step's
    entry in `stepQuestions` (by activity id). */
export type PromptSet = Record<PromptPart, string> & { stepQuestions: Record<string, string> };

/** Prompt versions are kept per lesson: each lesson has its own AI prompts and rubric. */
export interface PromptVersion {
  id: string;
  lessonId: string;
  /** Numbered within the lesson. */
  number: number;
  author: string;
  note: string;
  createdAt: string;
  prompts: PromptSet;
}
