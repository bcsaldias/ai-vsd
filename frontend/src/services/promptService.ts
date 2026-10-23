// Prompt templates and their version history, kept per lesson.
// Placeholder: the seeded versions from mock data, plus versions saved in this browser (localStorage).
// Later: FastAPI endpoints, shared by everyone.

import type { ActivityDefinition, PromptSet, PromptVersion } from '../types/contracts';
import { SEED_PROMPT_VERSIONS } from './mockData';

const KEY = 'prompt-versions';

/** Versions saved in this browser. The seeds stay in code, so changes to them still show up.
    Numbers continue after the seeds, so adding a seed later collides with saved versions (see
    SEED_PROMPT_VERSIONS). Goes away once the backend numbers versions. */
function loadSaved(): PromptVersion[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
    prompts: { ...prompts },
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
    leaving out the student's work, without which the tutor can't comment on it. */
export function checkTemplate(template: string): { unknown: string[]; missingWork: boolean } {
  const names = [...template.matchAll(PLACEHOLDER)].map((m) => m[1]);
  return {
    unknown: [...new Set(names.filter((n) => !isVariable(n)))],
    missingWork: !names.includes('student_work'),
  };
}

/** What each variable is filled with, for an activity and the student's work on it (already
    limited to the activity's step). The backend fills the same variables for real feedback. */
export function templateVariables(activity: ActivityDefinition, work: unknown): Record<(typeof TEMPLATE_VARIABLES)[number], string> {
  return {
    activity_title: activity.title,
    activity_prompt: activity.prompt,
    objectives: activity.objectives.map((o) => `- ${o}`).join('\n'),
    student_work: work != null ? JSON.stringify(work, null, 2) : '(no student work yet)',
  };
}
