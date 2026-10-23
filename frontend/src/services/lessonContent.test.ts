// The lesson content files: the real ones load, and a mistake names the file and the field.

import { describe, expect, it } from 'vitest';
import { LESSONS, SEED_PROMPT_VERSIONS, readLesson, type LessonFiles } from './lessonContent';
import lesson from '../../content/stakeholder-analysis/lesson.json';
import example from '../../content/stakeholder-analysis/worked-example.json';
import prompts from '../../content/stakeholder-analysis/prompts.json';
import wording from '../../content/stakeholder-analysis/wording.json';

describe('the lessons in content/', () => {
  it('load, with one starting prompt version each', () => {
    expect(LESSONS.map((l) => l.activities.length)).toEqual([9, 8]);
    expect(SEED_PROMPT_VERSIONS.map((v) => [v.lessonId, v.number])).toEqual(LESSONS.map((l) => [l.id, 1]));
  });

  it('fill every {word} in the step texts from wording.json', () => {
    for (const { activities } of LESSONS) {
      for (const a of activities) {
        const texts = [a.title, a.prompt, ...a.objectives, ...(a.guide ?? []).flatMap((g) => [g.label, g.where])];
        for (const t of texts) expect(t).not.toMatch(/\{\w+\}/);
      }
    }
    const impacts = LESSONS[0].activities.find((a) => a.id === 'stakeholders-impacts')!;
    expect(impacts.guide?.[0].label).toBe(`+ ${wording.harm} / + ${wording.benefit}`);
  });
});

describe('a mistake in a lesson file', () => {
  const good: LessonFiles = { lesson, example, prompts, wording };
  // A deep copy of the good files with one change, so each test breaks one thing.
  const broken = (change: (f: { lesson: any; prompts: any; wording: any }) => void): LessonFiles => {
    const f = structuredClone({ lesson, prompts, wording });
    change(f);
    return { ...f, example };
  };
  const error = (files: LessonFiles) => {
    try {
      readLesson('stakeholder-analysis', files);
    } catch (e) {
      return (e as Error).message;
    }
    return 'no error';
  };

  it('is not reported when there is none', () => {
    expect(error(good)).toBe('no error');
  });

  it.each([
    ['a missing word', (f: any) => delete f.wording.core,
      'content/stakeholder-analysis/wording.json → core: is missing'],
    ['an unknown word', (f: any) => (f.wording.cor = 'Core'),
      'content/stakeholder-analysis/wording.json → cor: is not a word this activity uses'],
    ['an unknown {word} in a step text', (f: any) => (f.lesson.steps[4].guide[0].label = '+ {harms}'),
      'content/stakeholder-analysis/lesson.json → steps[5].guide[1].label: {harms} is not a word in wording.json'],
    ['questions for a step that doesn’t exist', (f: any) => (f.prompts.questionsForEachStep['stakeholders-strat'] = ['?']),
      'content/stakeholder-analysis/prompts.json → questionsForEachStep → "stakeholders-strat": is not the id of a step in lesson.json'],
    ['two steps with the same id', (f: any) => (f.lesson.steps[1].id = f.lesson.steps[0].id),
      'content/stakeholder-analysis/lesson.json → steps[2].id: "stakeholders-start" is used by another step'],
    ['an empty task', (f: any) => (f.lesson.steps[0].task = ' '),
      'content/stakeholder-analysis/lesson.json → steps[1].task: should be some text in quotes'],
    ['an unknown activity', (f: any) => (f.lesson.activity = 'stakeholder-token'),
      'content/stakeholder-analysis/lesson.json → activity: should be one of'],
  ])('names the file and field: %s', (_, change, message) => {
    expect(error(broken(change))).toContain(message);
  });

  it('reports a missing file', () => {
    expect(error({ ...good, prompts: undefined })).toBe('content/stakeholder-analysis/prompts.json: missing');
  });
});
