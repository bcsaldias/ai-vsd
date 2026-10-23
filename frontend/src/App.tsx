// AppShell: switches between tabs. Tabs stay mounted so unsaved drafts survive switching.

import { useEffect, useState } from 'react';
import type { Lesson, LessonSummary } from './types/contracts';
import { getLesson, getLessons } from './services/activityService';
import { rememberLesson, rememberedLesson } from './lessons/rememberedLesson';
import { LessonPicker, lessonAccent } from './lessons/LessonPicker';
import { StepTrail } from './lessons/StepTrail';
import { WorkspaceTab } from './workspace/WorkspaceTab';
import { PromptsTab } from './prompts/PromptsTab';
import { VersionsTab } from './versions/VersionsTab';

type TabId = 'workspace' | 'prompts' | 'versions';

const TABS: { id: TabId; label: string }[] = [
  { id: 'workspace', label: 'Workspace' },
  { id: 'prompts', label: 'Prompts' },
  { id: 'versions', label: 'Versions' },
];

// The open tab lives in the address (#prompts, #versions), so a refresh stays on it while opening
// the app fresh still starts on the Workspace.
const tabFromHash = (): TabId => TABS.find((t) => `#${t.id}` === window.location.hash)?.id ?? 'workspace';

export function App() {
  const [tab, setTabState] = useState<TabId>(tabFromHash);
  const setTab = (id: TabId) => {
    setTabState(id);
    history.replaceState(null, '', id === 'workspace' ? window.location.pathname + window.location.search : `#${id}`);
  };
  // Typing or following a #tab link while the app is open switches to it too.
  useEffect(() => {
    const follow = () => setTabState(tabFromHash());
    window.addEventListener('hashchange', follow);
    return () => window.removeEventListener('hashchange', follow);
  }, []);
  const [versionsRefreshKey, setVersionsRefreshKey] = useState(0);
  // One lesson selection for every tab: picking a lesson anywhere changes it everywhere.
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  useEffect(() => {
    getLessons().then((list) => {
      setLessons(list);
      const remembered = rememberedLesson();
      setLessonId(list.some((l) => l.id === remembered) ? remembered : (list[0]?.id ?? null));
    });
  }, []);
  const selectLesson = (id: string) => {
    setLessonId(id);
    rememberLesson(id);
  };
  const lessonProps = { lessons, lessonId };
  // The step open in each lesson's workspace; the Prompts preview fills its template from it.
  const [steps, setSteps] = useState<Record<string, string>>({});
  const selectStep = (lesson: string, activityId: string) =>
    setSteps((all) => (all[lesson] === activityId ? all : { ...all, [lesson]: activityId }));
  // The selected lesson's steps, for the step trail.
  const [lesson, setLesson] = useState<Lesson | null>(null);
  useEffect(() => {
    if (lessonId) getLesson(lessonId).then(setLesson);
  }, [lessonId]);
  const trailLesson = lesson?.id === lessonId ? lesson : null;

  // The lesson comes first: Workspace, Prompts, and Versions are its sections, and the trail its steps.
  return (
    <div className="app" data-tab={tab}>
      <header className="app-bar">
        <span className="app-title"><span>VSD Learning</span> <span>Workspace</span></span>
        <LessonPicker lessons={lessons} value={lessonId} onChange={selectLesson} />
      </header>
      <div className="lesson-bar" style={lessonAccent(lessons, lessonId)}>
      <nav className="tab-bar" role="tablist" aria-label="Sections of this lesson">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            className={tab === t.id ? 'tab active' : 'tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {/* Versions are kept per lesson, not per step, so the trail has nothing to do there. */}
      {tab !== 'versions' && trailLesson && trailLesson.activities.length > 0 && (
        <StepTrail
          lesson={trailLesson}
          currentId={steps[trailLesson.id] ?? trailLesson.activities[0].id}
          onSelect={(activityId) => selectStep(trailLesson.id, activityId)}
        />
      )}
      </div>
      <div className="rules" aria-hidden="true" />

      <main className="tab-content">
        <div role="tabpanel" id="panel-workspace" aria-labelledby="tab-workspace" hidden={tab !== 'workspace'}>
          <WorkspaceTab lessonId={lessonId} steps={steps} onStepChange={selectStep} />
        </div>
        <div role="tabpanel" id="panel-prompts" aria-labelledby="tab-prompts" hidden={tab !== 'prompts'}>
          <PromptsTab
            {...lessonProps}
            activityId={lessonId ? (steps[lessonId] ?? null) : null}
            active={tab === 'prompts'}
            onSaved={() => setVersionsRefreshKey((k) => k + 1)}
          />
        </div>
        <div role="tabpanel" id="panel-versions" aria-labelledby="tab-versions" hidden={tab !== 'versions'}>
          <VersionsTab {...lessonProps} refreshKey={versionsRefreshKey} />
        </div>
      </main>
    </div>
  );
}
