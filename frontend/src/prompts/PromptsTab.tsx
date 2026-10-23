// Edit the system prompt, questions to ask, and user template. Saving always creates a new version.

import { useEffect, useRef, useState } from 'react';
import type { Lesson, LessonSummary, PromptPart, PromptSet, PromptVersion } from '../types/contracts';
import {
  checkTemplate, getLatestPromptVersion, placeholdersIn, promptChanges, sameStepQuestions, savePromptVersion,
  systemPromptParts, TEMPLATE_VARIABLES, templateParts, templateVariables, type PromptChange,
} from '../services/promptService';
import { getLesson, loadReport } from '../services/activityService';
import { lessonAccent } from '../lessons/LessonPicker';
import { workUpToStep } from '../workspace/ActivityHost';
import { describeWork } from '../activities/workText';
import { TemplateTextarea } from './TemplateTextarea';

// In the order they are sent: the questions go inside the system prompt, right after its text.
const PARTS: { part: PromptPart; label: string; help: string }[] = [
  { part: 'system', label: 'System', help: "The AI's role, tone, and rules." },
  {
    part: 'questions',
    label: 'Questions to ask',
    help:
      'Questions the AI can ask about the work, one per line. They’re sent with the System prompt: the ones for every ' +
      'step, plus the ones for the step being checked. Add, remove, or reword them to change what the AI pushes you on.',
  },
  { part: 'user', label: 'User', help: 'Template sent with each request. Use {{variables}} below.' },
];

interface Props {
  lessons: LessonSummary[];
  lessonId: string | null;
  /** The step open in this lesson's workspace (null until the workspace has opened one). */
  activityId: string | null;
  /** Whether this tab is showing, so the preview picks up work done since it was last open. */
  active: boolean;
  onSaved: () => void;
  /** Opens a step of this lesson, as picking it in the steps at the top does. */
  onStepChange: (activityId: string) => void;
  /** The lessons with unsaved prompt edits, whenever that changes. */
  onUnsavedChange: (lessonIds: string[]) => void;
}

type Session = { base: PromptVersion; draft: PromptSet; note: string };
const isDirty = ({ base, draft }: Session) =>
  PARTS.some(({ part }) => draft[part] !== base.prompts[part]) || !sameStepQuestions(draft.stepQuestions, base.prompts.stepQuestions);

/** Each lesson has its own prompts. The preview fills the template with the step open in the
    workspace and the student's saved work on it (or, if there is none yet, its worked example),
    up to that step: on a board shared by several steps, later steps' work is left out. */
export function PromptsTab({ lessons, lessonId, activityId, active, onSaved, onStepChange, onUnsavedChange }: Props) {
  // One editing session per lesson (the version it started from, the draft, the note), kept while
  // the app is open, so switching lessons — from any tab — never discards unsaved edits.
  const [sessions, setSessions] = useState<Record<string, Session>>({});
  const [lesson, setLesson] = useState<Lesson | null>(null);
  // The student's saved work on the open step, re-read whenever this tab is shown.
  const [saved, setSaved] = useState<{ activityId: string; state: unknown } | null>(null);
  // Which work fills {{student_work}} in the preview, when the step has both.
  const [sample, setSample] = useState<'own' | 'example'>('own');
  // The User editor, so the variable chips can insert at its cursor.
  const userEditor = useRef<HTMLTextAreaElement>(null);
  // The other editors, so a change listed in the save bar can be jumped to.
  const systemEditor = useRef<HTMLTextAreaElement>(null);
  const questionsEditor = useRef<HTMLTextAreaElement>(null);
  const stepEditor = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!lessonId) return;
    if (!sessions[lessonId]) {
      getLatestPromptVersion(lessonId).then((v) =>
        setSessions((all) => (all[lessonId] ? all : { ...all, [lessonId]: { base: v, draft: v.prompts, note: '' } })),
      );
    }
    getLesson(lessonId).then(setLesson);
  }, [lessonId]);

  const activities = lesson?.id === lessonId ? lesson.activities : [];
  const index = Math.max(0, activities.findIndex((a) => a.id === activityId));
  const activity = activities[index] ?? null;

  useEffect(() => {
    if (!activity || !active) return;
    let current = true;
    loadReport(activity).then((report) => current && setSaved({ activityId: activity.id, state: report?.state ?? null }));
    return () => {
      current = false;
    };
  }, [activity, active]);

  // Unsaved edits in any lesson: marked on the lesson tabs, and the browser asks before closing or reloading the page.
  const unsavedLessons = Object.keys(sessions).filter((id) => isDirty(sessions[id]));
  const unsaved = unsavedLessons.length > 0;
  useEffect(() => onUnsavedChange(unsavedLessons), [unsavedLessons.join(' ')]);
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  const session = lessonId ? sessions[lessonId] : undefined;
  // "Copied" / "Couldn't copy" on the copy button, for two seconds.
  const [copied, setCopied] = useState<'done' | 'failed' | null>(null);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2000);
    return () => clearTimeout(t);
  }, [copied]);

  // "Saved as version N" in the save bar, for four seconds after saving.
  const [justSaved, setJustSaved] = useState<string | null>(null);
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(null), 4000);
    return () => clearTimeout(t);
  }, [justSaved]);

  // A change picked in the save bar: its editor is focused once the step it belongs to is open.
  const [goTo, setGoTo] = useState<PromptChange | null>(null);
  useEffect(() => {
    if (!goTo || (goTo.activityId && goTo.activityId !== activity?.id)) return;
    const editor = goTo.activityId ? stepEditor : { system: systemEditor, questions: questionsEditor, user: userEditor }[goTo.part];
    editor.current?.focus({ preventScroll: true });
    // Centered, so the editor doesn't end up behind the save bar.
    editor.current?.scrollIntoView({ block: 'center' });
    setGoTo(null);
  }, [goTo, activity]);

  if (!lessonId || !session) return <p className="hint">Loading prompts…</p>;
  const { base, draft, note } = session;
  const patch = (p: Partial<typeof session>) => setSessions((all) => ({ ...all, [lessonId]: { ...all[lessonId], ...p } }));
  const setDraft = (d: PromptSet) => patch({ draft: d });
  const setNote = (n: string) => patch({ note: n });

  /** Puts {{name}} at the User editor's cursor (replacing any selection) and keeps typing there. */
  const insertVariable = (name: string) => {
    const el = userEditor.current;
    if (!el) return;
    const text = `{{${name}}}`;
    const { selectionStart: start, selectionEnd: end } = el;
    setDraft({ ...draft, user: draft.user.slice(0, start) + text + draft.user.slice(end) });
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + text.length, start + text.length);
    });
  };

  const dirty = isDirty(session);
  // What differs from the version being edited, so edits to steps not open here aren't saved unseen.
  const changes = promptChanges(base.prompts, draft, activities);
  const changed = (part: PromptPart) => changes.some((c) => c.part === part && !c.activityId);
  const stepChanged = (id: string) => changes.some((c) => c.activityId === id);
  const changedTag = <span className="badge">Changed</span>;
  // Until the next edit, the save bar confirms the save instead of naming the version being edited.
  const showSaved = justSaved === lessonId && !dirty;

  // A step's questions are on the open step only, so jumping to them opens that step first.
  const goToChange = (c: PromptChange) => {
    if (c.activityId && c.activityId !== activity?.id) onStepChange(c.activityId);
    setGoTo(c);
  };

  const save = async () => {
    const v = await savePromptVersion(lessonId, draft, note);
    patch({ base: v, note: '' });
    setJustSaved(lessonId);
    onSaved();
  };

  const discard = () => {
    if (window.confirm(`Discard your changes and go back to version ${base.number}?`)) patch({ draft: base.prompts, note: '' });
  };

  const checks = checkTemplate(draft.user);
  // Under the System prompt and the question lists: {{names}} there are sent as typed. The list is
  // always there (empty when fine), so screen readers announce a warning when it appears.
  const notFilledWarning = (text: string) => {
    const names = placeholdersIn(text);
    return (
      <ul className="template-checks" role="status">
        {names.length > 0 && (
          <li>
            {names.map((n, i) => <span key={n}>{i > 0 && ', '}<code>{n}</code></span>)}{' '}
            {names.length > 1 ? 'only work' : 'only works'} in the User prompt. Here, the AI gets{' '}
            {names.length > 1 ? 'them' : 'it'} exactly as typed.
          </li>
        )}
      </ul>
    );
  };

  // The student's work, or the worked example until there is some.
  // The chosen sample, or the other one when the step doesn't have it.
  const own = saved?.activityId === activity?.id ? saved?.state : null;
  const worked = activity?.example;
  const shown = own != null && (sample === 'own' || worked == null) ? 'own' : worked != null ? 'example' : null;
  const work = shown === 'own' ? own : shown === 'example' ? worked : null;

  // The system prompt as sent for the open step: its questions, and the ones for every step.
  const systemPrompt = systemPromptParts(draft, activity?.id ?? null);
  // The work as of the open step, as stored (JSON) and in plain language.
  const stepWork = activity && work != null ? workUpToStep(activity, work) : null;
  const preview = activity
    ? templateParts(draft.user, templateVariables(activity, stepWork, stepWork != null ? describeWork(activity, stepWork) : null))
    : [{ text: draft.user }];

  // Copy: both messages as plain text under their labels, so they can be pasted into any chat tool.
  const sentText = (parts: { text: string }[]) => parts.map((p) => p.text).join('').trim();
  const promptText = [
    sentText(systemPrompt) && `System:\n${sentText(systemPrompt)}`,
    draft.user.trim() && `User:\n${sentText(preview)}`,
  ].filter(Boolean).join('\n\n');
  const copyPrompt = () =>
    navigator.clipboard.writeText(promptText).then(() => setCopied('done'), () => setCopied('failed'));

  return (
    <div className="tab-page prompts-page" style={lessonAccent(lessons, lessonId)}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Prompt Design.</h1>
          <p className="prompts-intro">
            The AI here is told not to give answers. Instead, it asks questions, points out gaps, and challenges
            your reasoning, following the instructions below. Anyone, students included, can read and change
            them: deciding how an AI should challenge you is part of learning to work with one.
          </p>
        </div>
      </div>

      <div className="prompts-grid">
        <div className="prompt-editors">
          {PARTS.map(({ part, label, help }) => (
            <div key={part} className="prompt-editor">
              {part === 'questions' ? (
                // Two lists: one for every step, and one for the step open in the Workspace.
                <>
                  <span className="role-label">{label}</span>
                  <span className="hint">{help}</span>
                  <label className="question-list">
                    <span className="list-label">For every step{changed('questions') && changedTag}</span>
                    <textarea
                      ref={questionsEditor}
                      value={draft.questions}
                      onChange={(e) => setDraft({ ...draft, questions: e.target.value })}
                      rows={4}
                    />
                  </label>
                  {notFilledWarning(draft.questions)}
                  {activity && (
                    <label className="question-list">
                      <span className="list-label">
                        For this step · Step {index + 1} · {activity.title}
                        {stepChanged(activity.id) && changedTag}
                      </span>
                      <span className="hint">To edit another step’s questions, pick it in the steps at the top.</span>
                      <textarea
                        ref={stepEditor}
                        value={draft.stepQuestions[activity.id] ?? ''}
                        onChange={(e) =>
                          setDraft({ ...draft, stepQuestions: { ...draft.stepQuestions, [activity.id]: e.target.value } })
                        }
                        rows={4}
                      />
                    </label>
                  )}
                  {activity && notFilledWarning(draft.stepQuestions[activity.id] ?? '')}
                </>
              ) : (
                <label>
                  <span className="role-label">{label}{changed(part) && changedTag}</span>
                  <span className="hint">{help}</span>
                  {part === 'user' ? (
                    <TemplateTextarea ref={userEditor} value={draft.user} onChange={(user) => setDraft({ ...draft, user })} rows={8} />
                  ) : (
                    <textarea
                      ref={part === 'system' ? systemEditor : undefined}
                      value={draft[part]}
                      onChange={(e) => setDraft({ ...draft, [part]: e.target.value })}
                      rows={4}
                    />
                  )}
                </label>
              )}
              {part === 'system' && notFilledWarning(draft.system)}
              {part === 'user' && (
                <div className="variables">
                  <span className="hint">Click to insert:</span>
                  {TEMPLATE_VARIABLES.map((v) => {
                    // Each variable goes in once; deleting it from the prompt offers it again.
                    const used = draft.user.includes(`{{${v}}}`);
                    return (
                      <button
                        key={v}
                        type="button"
                        className="variable"
                        onClick={() => !used && insertVariable(v)}
                        aria-disabled={used}
                        data-tip={used ? 'Already in the User prompt' : undefined}
                      >
                        {`{{${v}}}`}
                      </button>
                    );
                  })}
                </div>
              )}
              {part === 'user' && (
                <ul className="template-checks" role="status">
                  {checks.unknown.map((name) => (
                    <li key={name}>
                      <code>{`{{${name}}}`}</code> isn't a variable, so the AI gets it exactly as typed. Check the spelling.
                    </li>
                  ))}
                  {checks.missingWork && (
                    <li>
                      There's no <code>{'{{student_work}}'}</code>, so the AI won't see the student's work and can't
                      give feedback on it.
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>

        <aside className="panel prompt-preview">
          <header className="panel-header">
            {/* Named by what it shows; the step it follows is in the trail at the top. */}
            <div>
              <h3>What the AI receives</h3>
              <p className="hint preview-intro">
                The full prompt the AI gets when work on this step is checked, as two messages.
                <br />
                Only the text in the boxes is sent.
              </p>
            </div>
            <button className="small copy-prompt" onClick={copyPrompt} disabled={!promptText}>
              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
                <rect x="5.5" y="5.5" width="8" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" />
                <path d="M3 10.5V2.5a1 1 0 0 1 1-1h6.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              {copied === 'done' ? 'Copied' : copied === 'failed' ? 'Couldn’t copy' : 'Copy prompt'}
            </button>
            {/* Announces the result; the button's own label change isn't reliably read out. */}
            <span className="sr-only" role="status">
              {copied === 'done' ? 'Prompt copied' : copied === 'failed' ? 'Couldn’t copy the prompt' : ''}
            </span>
          </header>
          <div className="panel-body">
            {/* What is sent: the system prompt (with the questions inside it) and the user prompt. */}
            {systemPrompt.some((part) => part.text.trim()) && (
              <div className="preview-message">
                <span className="role-label">System</span>
                <pre>
                  {systemPrompt.map((part, i) =>
                    part.framing ? (
                      <span key={i} className="framing" data-tip="Added by the app before your questions">{part.text}</span>
                    ) : (
                      part.text
                    ),
                  )}
                </pre>
              </div>
            )}
            {draft.user.trim() && (
              <div className="preview-message">
                {/* The sample switch sits with the User message: it only changes {{student_work}}. */}
                <div className="role-row">
                  <span className="role-label">User</span>
                  <div className="sample-toggle" role="group" aria-label="Student work in the preview">
                    {/* aria-disabled rather than disabled, so the tooltip saying why still shows on hover. */}
                    <button
                      className="small"
                      aria-pressed={shown === 'own'}
                      aria-disabled={own == null}
                      data-tip={
                        own != null ? undefined
                        // Steps sharing a board share the work, so anything from an earlier step counts.
                        : activity?.stateKey ? 'Start this lesson in the Workspace to see your work here. Work from earlier steps carries over.'
                        : 'Start this step in the Workspace to see your work here.'
                      }
                      onClick={() => own != null && setSample('own')}
                    >
                      My work
                    </button>
                    <button
                      className="small"
                      aria-pressed={shown === 'example'}
                      aria-disabled={worked == null}
                      data-tip={worked == null ? 'This step has no worked example.' : undefined}
                      onClick={() => worked != null && setSample('example')}
                    >
                      Worked example
                    </button>
                  </div>
                </div>
                {/* Only the User prompt has variables, so the hint sits here. */}
                <p className="hint">Blue text is filled in from a variable. Hover over it to see which one.</p>
                <pre>
                  {preview.map((part, i) =>
                    part.variable ? (
                      <mark
                        key={i}
                        className={part.unknown ? 'unknown' : undefined}
                        data-tip={part.unknown ? 'Not a variable: sent as typed' : `{{${part.variable}}}`}
                      >
                        {part.text}
                      </mark>
                    ) : (
                      part.text
                    ),
                  )}
                </pre>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Pinned to the bottom, so what changed and the controls that save it stay in view while editing. */}
      <div className={dirty ? 'save-bar dirty' : 'save-bar'}>
        <div className="save-status">
          {showSaved ? (
            <p className="saved">Saved as version {base.number}.</p>
          ) : (
            <p>
              Editing from version {base.number}
              {dirty && <span className="badge">Unsaved changes</span>}
            </p>
          )}
          {changes.length > 0 ? (
            // Each change opens its editor, on its step if it's another step's questions.
            <p className="hint">
              Changed:{' '}
              {changes.map((c, i) => (
                <span key={`${c.part}-${c.activityId ?? ''}`}>
                  {i > 0 && ', '}
                  <button type="button" className="link" onClick={() => goToChange(c)}>{c.label}</button>
                </span>
              ))}
            </p>
          ) : (
            <p className="hint">{showSaved ? 'You’re now editing from it.' : 'No changes yet.'}</p>
          )}
          {/* Announces the save; the visible line changes too, but isn't read out on its own. */}
          <span className="sr-only" role="status">{showSaved ? `Saved as version ${base.number}` : ''}</span>
        </div>
        <div className="save-row">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Name this version, e.g. “Sharper questions”" aria-label="Version name" />
          <button onClick={discard} disabled={!dirty}>Discard changes</button>
          <button className="primary" onClick={save} disabled={!dirty}>Save as new version</button>
        </div>
      </div>
    </div>
  );
}
