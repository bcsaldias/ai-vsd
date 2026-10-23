// Prompt version history. Compare and restore are placeholders for now.

import { useEffect, useRef, useState } from 'react';
import type { Lesson, LessonSummary, PromptVersion } from '../types/contracts';
import { EVERY_STEP, PART_LABEL, listPromptVersions, stepLabel } from '../services/promptService';
import { getLesson } from '../services/activityService';
import { lessonAccent } from '../lessons/LessonPicker';

interface Props {
  lessons: LessonSummary[];
  lessonId: string | null;
  /** Changes whenever a new version is saved elsewhere. */
  refreshKey: number;
}

/** Prompt history for one lesson at a time. */
export function VersionsTab({ lessons, lessonId, refreshKey }: Props) {
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // The lesson's steps, to label each step's questions.
  const [lesson, setLesson] = useState<Lesson | null>(null);
  useEffect(() => {
    if (lessonId) getLesson(lessonId).then(setLesson);
  }, [lessonId]);

  // After a save (refreshKey changes), open the version just saved: the newest. Otherwise keep the
  // selection while it is still in the list.
  const seenRefresh = useRef(refreshKey);
  useEffect(() => {
    if (!lessonId) return;
    listPromptVersions(lessonId).then((list) => {
      const justSaved = seenRefresh.current !== refreshKey;
      seenRefresh.current = refreshKey;
      setVersions(list);
      setSelectedId((id) => (!justSaved && list.some((v) => v.id === id) ? id : (list[0]?.id ?? null)));
    });
  }, [refreshKey, lessonId]);

  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="tab-page versions-page" style={lessonAccent(lessons, lessonId)}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Version History.</h1>
          <p className="hint">Prompt history. Every saved prompt change appears here; feedback records which version produced it.</p>
        </div>
      </div>

      <div className="versions-grid">
        <ol className="version-list" aria-label="Versions, newest first">
          {versions.map((v, i) => (
            <li key={v.id}>
              <button className={v.id === selectedId ? 'version active' : 'version'} onClick={() => setSelectedId(v.id)}>
                <strong>v{v.number}</strong>
                {i === 0 && <span className="badge">Latest</span>}
                <span className="version-note">{v.note}</span>
                <span className="meta">{v.author} · {new Date(v.createdAt).toLocaleString()}</span>
              </button>
            </li>
          ))}
        </ol>

        {selected && (
          <section className="panel version-detail">
            <header className="panel-header">
              <h3>Version {selected.number}</h3>
              <div className="actions">
                <button disabled title="Coming soon">Compare with previous</button>
                <button disabled title="Coming soon">Restore</button>
              </div>
            </header>
            <div className="panel-body">
              {/* In the order they are sent; only steps that have questions of their own are listed. */}
              {[
                { label: PART_LABEL.system, text: selected.prompts.system },
                { label: `${PART_LABEL.questions} · ${EVERY_STEP}`, text: selected.prompts.questions },
                ...(lesson?.id === selected.lessonId ? lesson.activities : [])
                  .map((a, i) => ({ label: `${PART_LABEL.questions} · ${stepLabel(i, a.title)}`, text: selected.prompts.stepQuestions[a.id] ?? '' }))
                  .filter((s) => s.text.trim()),
                { label: PART_LABEL.user, text: selected.prompts.user },
              ].map(({ label, text }) => (
                <div key={label} className="preview-message">
                  <span className="role-label">{label}</span>
                  <pre>{text || '(empty)'}</pre>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
