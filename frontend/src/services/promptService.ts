// Prompt templates and their version history.
// Placeholder: in-memory store seeded from mock data. Later: FastAPI endpoints.

import type { PromptSet, PromptVersion } from '../types/contracts';
import { SEED_PROMPT_VERSIONS } from './mockData';

const versions: PromptVersion[] = [...SEED_PROMPT_VERSIONS];

export async function listPromptVersions(): Promise<PromptVersion[]> {
  return [...versions].reverse(); // newest first
}

export async function getLatestPromptVersion(): Promise<PromptVersion> {
  return versions[versions.length - 1];
}

export async function savePromptVersion(prompts: PromptSet, note: string): Promise<PromptVersion> {
  const number = versions.length + 1;
  const version: PromptVersion = {
    id: `pv-${number}`,
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
