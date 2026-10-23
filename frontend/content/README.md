# Lesson content

Everything students read in a lesson, and everything the AI is told when it starts, lives here.
You can change it without touching any code.

```
content/
  lessons.json                  the lessons, in the order they appear
  stakeholder-analysis/
    lesson.json                 title, intro, color, and each step's text
    worked-example.json         the example students can open on each step
    prompts.json                the AI's starting prompts for this lesson
    wording.json                the words for the activity's parts, on screen and for the AI
  value-scenarios/
    (the same four files)
```

## How to edit

1. Open the file and change the text between the quotes `"…"`.
2. Save, and reload the app. If something is wrong in a file, the app shows a message naming the
   file and the field to fix, instead of the lesson.

The files are JSON. A few rules keep them valid:

- Text goes in double quotes: `"title": "Direct stakeholders"`. Curly quotes and apostrophes inside
  the text (“ ” ’) are fine; a straight double quote `"` inside text must be written `\"`.
- Items in a list are separated by commas, with no comma after the last one:
  `["First question?", "Second question?"]`
- Keep the names on the left of each colon (`"title":`, `"task":`) exactly as they are.

## lesson.json

| Field | What it is |
|---|---|
| `title` | The lesson's name, shown in the lesson switcher. |
| `color` | The lesson's accent color, as a hex code like `"#a6baa0"`. Keep it light enough for dark text on top. |
| `symbol` | A short symbol shown next to the name, so lessons aren't told apart by color alone. |
| `intro` | The paragraph at the top of the lesson. |
| `steps` | The lesson's steps, in order. The order sets the step numbers. |

Each step:

| Field | What it is |
|---|---|
| `title` | The step's name (step card, step trail, the AI's `{{activity_title}}`). |
| `task` | What the student is asked to do (step card, the AI's `{{activity_prompt}}`). |
| `objectives` | What the student should show, as a list. Shown on the step card, and given to the AI as its rubric (`{{objectives}}`). |
| `guide` | The "New in this step" items on the step card: `label` (what it is) and `where` (where to find it). |

**Don't change** these, they connect the text to the app:

- `id` of the lesson and of each step: students' saved work and the AI's questions are stored by
  them. Changing one makes saved work for that step disappear.
- `activity`, `sharedBoard`, `bringStakeholdersFrom`: which interactive activity the lesson uses and
  how its steps share one board.
- `target` in each guide item: it points at a control in the activity. You can change its `label`
  and `where`.

Reordering, adding, or removing steps changes which tools each step offers (the activity unlocks
tools by step number), so ask a developer first.

## worked-example.json

The example students see with "See an example of this step": a filled-in board for a smart
doorbell camera, shown read only and limited to what exists by the current step.

You can change any text (names, labels, stories, definitions, owners, actions). Keep the `id`
fields and the values that refer to them (`tokenId`, `source`, `target`, `valueIds`,
`stakeholderId`, `a`, `b`) as they are, since they connect the parts of the board. `x` and `y` are
positions on the board, and `ring` must match where the position falls, so leave those to a
developer.

## prompts.json

The AI's starting prompts for the lesson: what everyone sees in the Prompts tab until someone
saves a new version there. Students and instructors can change them in the app too; this file is
the starting point.

| Field | What it is |
|---|---|
| `note` | The note shown for this starting version in the Versions tab. |
| `system` | Who the AI is and its rules. |
| `questionsForEveryStep` | Questions the AI can ask at any step, as a list. |
| `questionsForEachStep` | Questions for one step only, listed under that step's `id` from lesson.json. Only the step being checked gets its questions. |
| `userTemplate` | The message sent with each request, one line per item. `{{activity_title}}`, `{{activity_prompt}}`, `{{objectives}}`, and `{{student_work}}` (the work in plain language, see wording.json) are filled in by the app. |

A changed prompts.json shows up for everyone who hasn't saved their own version of that lesson's
prompts in their browser. Anyone who has keeps seeing their saved version (that's on purpose: it's
their work).

## wording.json

The words for the activity's parts: ring names, "Harm" and "Benefit", the scenario card fields,
and so on. The same words are used in two places, so students see exactly what the AI gets:

- on screen, in the activity (the ring captions, buttons, field names), and
- in `{{student_work}}`, where the app writes the student's work out in plain language for the AI:

```
Direct stakeholders:
- Homeowners — Core
Harms and benefits:
- Homeowners:
  - Benefit: Sees who is at the door from anywhere (Safety)
```

Each line is a name on the left (keep it) and the words on the right (change them freely). For
example, `"core": "Core"` → `"core": "Inner ring"` changes the ring's caption on the board and
makes the AI read "Homeowners — Inner ring". The Prompts tab preview shows the result straight
away.

- Every name the activity uses must be in the file; a missing or misspelled one is reported when
  the app opens, with the list of names it accepts.
- `none` is shown for a part with nothing in it yet, `blank` for an empty field, and `unnamed`
  for something not named yet. These, `for` and `vs` are only in the AI's text.
- The step texts in lesson.json mention some of these words (e.g. "+ Harm / + Benefit" in a guide
  item); if you change a word here, change it there too.

## lessons.json

The folder names of the lessons, in the order they appear. A new lesson that uses one of the
existing activities only needs a new folder with the four files and its name added here. A lesson
with a new kind of activity needs a developer.
