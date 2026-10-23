// How the prompts are put together for the AI, and the checks shown while editing them.

import { describe, expect, it } from 'vitest';
import type { PromptSet } from '../types/contracts';
import {
  QUESTIONS_INTRO, STEP_QUESTIONS_INTRO, checkTemplate, placeholdersIn, systemPromptParts, templateParts,
} from './promptService';

const prompts: PromptSet = {
  system: 'Ask questions.',
  questions: '- Who else?',
  stepQuestions: { a: '- Only for step a?', b: '- Only for step b?' },
  user: 'Work:\n{{student_work}}',
};
const sent = (parts: { text: string }[]) => parts.map((p) => p.text).join('');

describe('the system prompt (systemPromptParts)', () => {
  it('adds the questions for every step and for the checked step, under the app’s headings', () => {
    const parts = systemPromptParts(prompts, 'a');
    expect(sent(parts)).toBe(`Ask questions.\n\n${QUESTIONS_INTRO}\n- Who else?\n\n${STEP_QUESTIONS_INTRO}\n- Only for step a?`);
    expect(parts.filter((p) => p.framing).map((p) => p.text.trim())).toEqual([QUESTIONS_INTRO, STEP_QUESTIONS_INTRO]);
  });

  it('never sends another step’s questions', () => {
    expect(sent(systemPromptParts(prompts, 'a'))).not.toContain('step b');
    expect(sent(systemPromptParts(prompts, null))).not.toContain(STEP_QUESTIONS_INTRO);
  });

  it('adds nothing for an empty list', () => {
    expect(sent(systemPromptParts({ ...prompts, questions: '  ', stepQuestions: {} }, 'a'))).toBe('Ask questions.');
  });
});

describe('the user template', () => {
  it('fills known variables and leaves unknown names as typed, marked', () => {
    const parts = templateParts('{{student_work}} and {{student_wrok}}', { student_work: 'MY WORK' });
    expect(parts).toEqual([
      { text: 'MY WORK', variable: 'student_work' },
      { text: ' and ' },
      { text: '{{student_wrok}}', variable: 'student_wrok', unknown: true },
    ]);
  });

  it('flags unknown names and a missing {{student_work}}', () => {
    expect(checkTemplate('{{objective}} {{objective}}')).toEqual({ unknown: ['objective'], missingWork: true });
    expect(checkTemplate('{{student_work}}')).toEqual({ unknown: [], missingWork: false });
  });

  it('finds variables typed where they are never filled (the System prompt, the questions)', () => {
    expect(placeholdersIn('Look at {{student_work}} and {{objectives}}, {{student_work}}.')).toEqual(['{{student_work}}', '{{objectives}}']);
  });
});
