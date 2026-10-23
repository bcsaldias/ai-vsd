// Lessons and their starting prompts, read from the plain content files in frontend/content/ (one
// folder per lesson; see content/README.md), so they can be edited without touching code. Each file
// is checked here, and a mistake names the file and the field.
// Later: the backend serves the same content (GET /lessons/{id}).

import type { ActivityDefinition, ActivityKind, Lesson, PromptVersion } from '../types/contracts';
import { WORK_TEXT } from '../activities/workText';
import order from '../../content/lessons.json';

const lessonFiles = import.meta.glob('../../content/*/lesson.json', { eager: true, import: 'default' });
const exampleFiles = import.meta.glob('../../content/*/worked-example.json', { eager: true, import: 'default' });
const promptFiles = import.meta.glob('../../content/*/prompts.json', { eager: true, import: 'default' });
const workTextFiles = import.meta.glob('../../content/*/work-description.json', { eager: true, import: 'default' });

const ACTIVITY_KINDS = ['diagram', 'annotation', 'stakeholder-tokens', 'value-scenarios'] as const satisfies readonly ActivityKind[];

/** A mistake in a content file, reported with the file and field it is in. */
export class ContentError extends Error {}

/** Field checks: each returns the value or throws a ContentError naming `where`. */
type Obj = Record<string, unknown>;
const fail = (where: string, problem: string): never => {
  throw new ContentError(`${where}: ${problem}`);
};
const obj = (v: unknown, where: string): Obj => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Obj) : fail(where, 'should be an object { … }'));
const text = (v: unknown, where: string): string => (typeof v === 'string' && v.trim() ? v : fail(where, 'should be some text in quotes'));
const texts = (v: unknown, where: string): string[] =>
  Array.isArray(v) ? v.map((t, i) => (typeof t === 'string' ? t : fail(`${where}[${i + 1}]`, 'should be text in quotes'))) : fail(where, 'should be a list [ … ]');

function readLesson(folder: string): { lesson: Lesson; prompts: PromptVersion } {
  const at = (file: string) => `content/${folder}/${file}`;
  const file = (files: Record<string, unknown>, name: string) => files[`../../content/${folder}/${name}`];
  const raw = file(lessonFiles, 'lesson.json');
  if (raw === undefined) fail(at('lesson.json'), 'missing (the folder is listed in content/lessons.json)');
  const l = obj(raw, at('lesson.json'));
  const where = (field: string) => `${at('lesson.json')} → ${field}`;

  const activity = text(l.activity, where('activity'));
  if (!(ACTIVITY_KINDS as readonly string[]).includes(activity)) fail(where('activity'), `should be one of ${ACTIVITY_KINDS.join(', ')}`);
  const sharedBoard = l.sharedBoard === undefined ? undefined : text(l.sharedBoard, where('sharedBoard'));
  const source = l.bringStakeholdersFrom === undefined ? undefined : obj(l.bringStakeholdersFrom, where('bringStakeholdersFrom'));
  const example = file(exampleFiles, 'worked-example.json');
  if (!Array.isArray(l.steps) || !l.steps.length) fail(where('steps'), 'should be a list of at least one step');

  // Optional: rewording of how the student's work is written out for the AI. Every key must be a
  // label the lesson's activity uses; labels left out keep the activity's default wording.
  const rawLabels = file(workTextFiles, 'work-description.json');
  let workLabels: Record<string, string> | undefined;
  if (rawLabels !== undefined) {
    const labels = obj(rawLabels, at('work-description.json'));
    const known = Object.keys(WORK_TEXT[activity as ActivityKind]?.labels ?? {});
    workLabels = Object.fromEntries(Object.entries(labels).map(([key, v]) => {
      const lw = `${at('work-description.json')} → ${key}`;
      if (!known.includes(key)) fail(lw, `is not a label this activity uses. Its labels are: ${known.join(', ')}`);
      return [key, text(v, lw)];
    }));
  }

  const ids = new Set<string>();
  const activities: ActivityDefinition[] = (l.steps as unknown[]).map((s, i) => {
    const step = obj(s, where(`steps[${i + 1}]`));
    const w = (field: string) => where(`steps[${i + 1}].${field}`);
    const id = text(step.id, w('id'));
    if (ids.has(id)) fail(w('id'), `"${id}" is used by another step; each step needs its own id`);
    ids.add(id);
    return {
      id,
      kind: activity as ActivityKind,
      title: text(step.title, w('title')),
      prompt: text(step.task, w('task')),
      objectives: texts(step.objectives, w('objectives')),
      guide: (step.guide === undefined ? [] : Array.isArray(step.guide) ? step.guide : fail(w('guide'), 'should be a list [ … ]')).map((g, j) => {
        const item = obj(g, w(`guide[${j + 1}]`));
        const gw = (field: string) => w(`guide[${j + 1}].${field}`);
        return { target: text(item.target, gw('target')), label: text(item.label, gw('label')), where: text(item.where, gw('where')) };
      }),
      // The step number follows the order of the steps, so the board knows which tools to offer.
      config: { step: i + 1 },
      ...(sharedBoard && { stateKey: sharedBoard }),
      ...(example !== undefined && { example }),
      ...(workLabels && { workLabels }),
      ...(source && {
        stakeholderSource: {
          stateKey: text(source.stateKey, where('bringStakeholdersFrom.stateKey')),
          kind: text(source.kind, where('bringStakeholdersFrom.kind')) as ActivityKind,
          label: text(source.label, where('bringStakeholdersFrom.label')),
        },
      }),
    };
  });

  const lesson: Lesson = {
    id: text(l.id, where('id')),
    title: text(l.title, where('title')),
    accent: text(l.color, where('color')),
    symbol: text(l.symbol, where('symbol')),
    intro: text(l.intro, where('intro')),
    activities,
  };

  const p = obj(file(promptFiles, 'prompts.json') ?? fail(at('prompts.json'), 'missing'), at('prompts.json'));
  const pw = (field: string) => `${at('prompts.json')} → ${field}`;
  const list = (questions: string[]) => questions.filter((q) => q.trim()).map((q) => `- ${q.trim()}`).join('\n');
  const perStep = obj(p.questionsForEachStep ?? {}, pw('questionsForEachStep'));
  for (const id of Object.keys(perStep)) {
    if (!ids.has(id)) fail(pw(`questionsForEachStep → "${id}"`), 'is not the id of a step in lesson.json');
  }
  const prompts: PromptVersion = {
    id: `${lesson.id}-v1`,
    lessonId: lesson.id,
    number: 1,
    author: 'placeholder',
    note: p.note === undefined ? 'Initial draft' : text(p.note, pw('note')),
    createdAt: '2026-10-21T10:00:00.000Z',
    prompts: {
      system: text(p.system, pw('system')),
      questions: list(texts(p.questionsForEveryStep ?? [], pw('questionsForEveryStep'))),
      stepQuestions: Object.fromEntries(Object.entries(perStep).map(([id, q]) => [id, list(texts(q, pw(`questionsForEachStep → "${id}"`)))])),
      user: texts(p.userTemplate, pw('userTemplate')).join('\n'),
    },
  };
  return { lesson, prompts };
}

const loaded = texts(order, 'content/lessons.json').map(readLesson);

export const LESSONS: Lesson[] = loaded.map((l) => l.lesson);

/** One starting prompt set per lesson (its version 1); each lesson's versions are numbered separately.
    Versions saved in a browser are numbered after it (see promptService), so each lesson keeps
    exactly one starting version: edit it in prompts.json rather than adding another. */
export const SEED_PROMPT_VERSIONS: PromptVersion[] = loaded.map((l) => l.prompts);
