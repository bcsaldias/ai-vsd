// Prompt templates and their version history, kept per lesson.
// Placeholder: in-memory store seeded from mock data. Later: FastAPI endpoints.

import type { PromptSet, PromptVersion } from '../types/contracts';
import { SEED_PROMPT_VERSIONS } from './mockData';

const versions: PromptVersion[] = [...SEED_PROMPT_VERSIONS];
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
  return version;
}

/** Fills {{name}} placeholders; unknown names are left as-is so gaps are visible. */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => vars[name] ?? match);
}

export const TEMPLATE_VARIABLES = ['activity_title', 'activity_prompt', 'objectives', 'student_work'];
