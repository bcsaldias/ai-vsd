# Frontend

React + TypeScript app built with Vite. See [`../APP_SPECS.txt`](../APP_SPECS.txt) for the product spec.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + production build
```

## `src/`

| Path | Purpose |
|---|---|
| `main.tsx` | Entry point. Mounts `App` and loads global styles. |
| `App.tsx` | App shell. Switches between the Workspace, Prompts, and Versions tabs. |
| `styles.css` | All styles: theme colors (light and dark), layout, panels, and the narrow-screen layout. |
| `types/` | `contracts.ts` holds the shared data shapes (lesson, activity report, feedback, prompt version). Every other folder depends on these, never on each other's internals. |
| `services/` | The only code that reads or writes data. Mock data and localStorage for now; later these call the FastAPI backend with the same function signatures. |
| `workspace/` | Workspace tab (student-facing). `WorkspaceTab` arranges the three panels (`LearningWorkspace`, `FeedbackPanel`, `ActivityHost`) and their resize handles. |
| `activities/` | One folder per activity (`diagram/`, `annotation/`). Each owns its own interaction logic and state shape. |
| `prompts/` | Prompts tab. Edit the system, user, and assistant prompts; saving creates a new version. |
| `versions/` | Versions tab. Prompt version history (compare and restore are placeholders). |

## Rules of thumb

- **Data goes through `services/`.** Components never fetch data or touch storage directly.
- **Activities only know their contract.** An activity gets `prompt`, `savedState`, and `onChange(state)`. `ActivityHost` wraps the state into an `ActivityReport`.
- **Adding an activity:** create `activities/<name>/`, add its kind to `ActivityKind` in `types/contracts.ts`, and add a `case` in `workspace/ActivityHost.tsx`.
- **Feedback is display-only.** `FeedbackPanel` renders whatever `Feedback` object it's given. To switch from mock feedback to real AI, change `services/feedbackService.ts`.
