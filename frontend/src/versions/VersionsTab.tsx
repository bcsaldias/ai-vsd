// Prompt version history. Compare and restore are placeholders for now.

import { useEffect, useState } from 'react';
import type { Lesson, LessonSummary, PromptVersion } from '../types/contracts';
import { listPromptVersions } from '../services/promptService';
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

  useEffect(() => {
    if (!lessonId) return;
    listPromptVersions(lessonId).then((list) => {
      setVersions(list);
      setSelectedId((id) => (list.some((v) => v.id === id) ? id : (list[0]?.id ?? null)));
    });
  }, [refreshKey, lessonId]);

  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="tab-page versions-page" style={lessonAccent(lessons, lessonId)}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Versions.</h1>
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
                { label: 'System', text: selected.prompts.system },
                { label: 'Questions to ask · For every step', text: selected.prompts.questions },
                ...(lesson?.id === selected.lessonId ? lesson.activities : [])
                  .map((a, i) => ({ label: `Questions to ask · Step ${i + 1} · ${a.title}`, text: selected.prompts.stepQuestions[a.id] ?? '' }))
                  .filter((s) => s.text.trim()),
                { label: 'User', text: selected.prompts.user },
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
