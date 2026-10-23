// Prompt templates and their version history, kept per lesson.
// Placeholder: each lesson's starting version (content/<lesson>/prompts.json), plus versions saved in this browser (localStorage).
// Later: FastAPI endpoints, shared by everyone.

import type { ActivityDefinition, PromptPart, PromptSet, PromptVersion } from '../types/contracts';
import { SEED_PROMPT_VERSIONS } from './lessonContent';

const KEY = 'prompt-versions';

/** Versions saved in this browser, numbered after the lesson's starting version (which stays in
    its content file, so edits to it still show up). Later the backend numbers versions. */
function loadSaved(): PromptVersion[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.map(upgrade) : [];
  } catch {
    return [];
  }
}

/** The third box was "Assistant", then "Example feedback", now "Questions to ask" (for every step,
    plus per-step lists). Older saved versions keep their text in the every-step list, so nothing
    written is lost. */
function upgrade(v: PromptVersion): PromptVersion {
  const { system, user, questions, stepQuestions, example, assistant } = v.prompts as Partial<PromptSet> & {
    example?: string;
    assistant?: string;
  };
  return {
    ...v,
    prompts: { system: system ?? '', user: user ?? '', questions: questions ?? example ?? assistant ?? '', stepQuestions: stepQuestions ?? {} },
  };
}

const saved = loadSaved();
const versions: PromptVersion[] = [...SEED_PROMPT_VERSIONS, ...saved];
const forLesson = (lessonId: string) => versions.filter((v) => v.lessonId === lessonId);

export async function listPromptVersions(lessonId: string): Promise<PromptVersion[]> {
  return forLesson(lessonId).reverse(); // newest first
}

export async function getLatestPromptVersion(lessonId: string): Promise<PromptVersion> {
  const list = forLesson(lessonId);
  if (!list.length) throw new Error(`No prompts for lesson: ${lessonId}`);
  return list[list.length - 1];
}

export async function savePromptVersion(lessonId: string, prompts: PromptSet, note: string): Promise<PromptVersion> {
  const number = forLesson(lessonId).length + 1;
  const version: PromptVersion = {
    id: `${lessonId}-v${number}`,
    lessonId,
    number,
    author: 'you',
    note: note.trim() || `Version ${number}`,
    createdAt: new Date().toISOString(),
    prompts: { ...prompts, stepQuestions: { ...prompts.stepQuestions } },
  };
  versions.push(version);
  saved.push(version);
  try {
    localStorage.setItem(KEY, JSON.stringify(saved));
  } catch {
    // Storage unavailable — the version stays in memory for this session.
  }
  return version;
}

/** The app's heading before the questions to ask. */
/** The app's headings before each list of questions. */
export const QUESTIONS_INTRO = 'Questions you can draw on at any step:';
export const STEP_QUESTIONS_INTRO = 'Questions for this step:';

/** The system prompt as sent for one activity, in pieces: the System text, then the questions for
    every step and the activity's own questions, each after the app's heading (`framing` marks the
    app's text). Other steps' questions are never sent. The backend sends the same text. */
export function systemPromptParts(prompts: PromptSet, activityId: string | null): { text: string; framing?: boolean }[] {
  const parts: { text: string; framing?: boolean }[] = [{ text: prompts.system }];
  const add = (heading: string, list: string) => {
    if (!list.trim()) return;
    const gap = parts.some((p) => p.text.trim()) ? '\n\n' : '';
    parts.push({ text: `${gap}${heading}\n`, framing: true }, { text: list.trim() });
  };
  add(QUESTIONS_INTRO, prompts.questions);
  add(STEP_QUESTIONS_INTRO, activityId ? (prompts.stepQuestions[activityId] ?? '') : '');
  return parts;
}

/** One part of a prompt set that differs between two versions. `activityId` is set for a step's own questions. */
export interface PromptChange {
  part: PromptPart;
  activityId?: string;
  label: string;
}

/** The names of the prompt's parts and question lists, wherever they are shown (Prompts tab,
    Versions tab, lists of changes), so each is written once. */
export const PART_LABEL: Record<PromptPart, string> = { system: 'System', questions: 'Questions to ask', user: 'User' };
export const EVERY_STEP = 'For every step';
export const stepLabel = (index: number, title: string) => `Step ${index + 1} · ${title}`;

/** What differs from `before` to `after`, in the order the parts are sent, with steps in lesson order.
    Shown while editing; meant to be recorded with each saved version later, for the version history. */
export function promptChanges(before: PromptSet, after: PromptSet, activities: Pick<ActivityDefinition, 'id' | 'title'>[]): PromptChange[] {
  const changes: PromptChange[] = [];
  if (after.system !== before.system) changes.push({ part: 'system', label: PART_LABEL.system });
  if (after.questions !== before.questions) changes.push({ part: 'questions', label: `${PART_LABEL.questions} · ${EVERY_STEP}` });
  activities.forEach(({ id, title }, i) => {
    if ((after.stepQuestions[id] ?? '') !== (before.stepQuestions[id] ?? ''))
      changes.push({ part: 'questions', activityId: id, label: `${PART_LABEL.questions} · ${stepLabel(i, title)}` });
  });
  if (after.user !== before.user) changes.push({ part: 'user', label: PART_LABEL.user });
  return changes;
}

/** Whether two sets of per-step questions say the same (a missing step and an empty one are equal). */
export function sameStepQuestions(a: Record<string, string>, b: Record<string, string>): boolean {
  return [...new Set([...Object.keys(a), ...Object.keys(b)])].every((id) => (a[id] ?? '') === (b[id] ?? ''));
}

export const TEMPLATE_VARIABLES = ['activity_title', 'activity_prompt', 'objectives', 'student_work'] as const;

const PLACEHOLDER = /\{\{(\w+)\}\}/g;
const isVariable = (name: string) => (TEMPLATE_VARIABLES as readonly string[]).includes(name);

/** A piece of a filled template: plain template text, or what a {{name}} placeholder became. */
export interface TemplatePart {
  text: string;
  /** Set when the text came from a placeholder. */
  variable?: string;
  /** Not a known variable: left as typed, so the gap is visible. */
  unknown?: boolean;
}

/** Fills {{name}} placeholders, in pieces, so the preview can show which text came from which variable. */
export function templateParts(template: string, vars: Record<string, string>): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let last = 0;
  for (const m of template.matchAll(PLACEHOLDER)) {
    const at = m.index!;
    if (at > last) parts.push({ text: template.slice(last, at) });
    const name = m[1];
    parts.push(Object.hasOwn(vars, name) ? { text: vars[name], variable: name } : { text: m[0], variable: name, unknown: true });
    last = at + m[0].length;
  }
  if (last < template.length) parts.push({ text: template.slice(last) });
  return parts;
}

/** Mistakes worth flagging in a user template: names that aren't variables (usually typos), and
    leaving out the student's work, without which the AI can't comment on it. */
export function checkTemplate(template: string): { unknown: string[]; missingWork: boolean } {
  const names = [...template.matchAll(PLACEHOLDER)].map((m) => m[1]);
  return {
    unknown: [...new Set(names.filter((n) => !isVariable(n)))],
    missingWork: !names.includes('student_work'),
  };
}

/** The {{names}} in text that is sent exactly as typed (the System prompt, the questions to ask):
    variables are only filled in the User prompt. */
export function placeholdersIn(text: string): string[] {
  return [...new Set([...text.matchAll(PLACEHOLDER)].map((m) => `{{${m[1]}}}`))];
}

/** What each variable is filled with, for an activity and the student's work on it (already
    limited to the activity's step). {{student_work}} is the work in plain language (`workText`, from
    the activity; JSON when it has none). The work itself is always stored as JSON. The backend
    fills the same variables for real feedback, with the text the frontend sends. */
export function templateVariables(
  activity: ActivityDefinition,
  work: unknown,
  workText: string | null,
): Record<(typeof TEMPLATE_VARIABLES)[number], string> {
  const json = work != null ? JSON.stringify(work, null, 2) : '(no student work yet)';
  return {
    activity_title: activity.title,
    activity_prompt: activity.prompt,
    objectives: activity.objectives.map((o) => `- ${o}`).join('\n'),
    student_work: work != null ? (workText ?? json) : json,
  };
}
