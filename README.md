# Imagining AI supporting VSD

A learning workspace for teaching [Value Sensitive Design](https://vsdesign.org/vsd/) (VSD), and for imagining how AI feedback could support students as they practise its methods. It is built for **pedagogical purposes**: to help students learn VSD by doing it, and to let instructors and researchers explore what helpful, non-answer-giving AI feedback looks like.

**Collaborators:** Belén Saldías ([belencsf@uw.edu](mailto:belencsf@uw.edu)), Dave Hendry ([dhendry@uw.edu](mailto:dhendry@uw.edu))

## What's in it

Two lessons, each a sequence of steps with its own workspace:

- **Stakeholder Analysis.** Students build a stakeholder map with tokens on rings (core, peripheral, excluded), after Yoo's Stakeholder Tokens (2018), following the stakeholder analysis steps of Friedman, Kahn & Borning (2006): direct and indirect stakeholders, relationships, harms and benefits, values, value tensions.
- **Value Scenarios.** Students write short scenarios about how a technology plays out for different people over time and at scale, and trace their value implications (Nathan, Klasnja & Friedman, 2007).

Each step has a worked example (a smart doorbell camera) that students can open read-only.

The app has three tabs:

- **Workspace:** for students.
- **Prompts:** students, instructors, and researchers edit the prompts that will generate AI feedback, separately for each lesson.
- **Versions:** the history of prompt changes, so every piece of feedback can be traced to the prompts that produced it.

## Status

This is an early prototype:

- **Feedback is a placeholder.** No AI model is connected yet.
- **Work is saved only in the student's browser.** Students can export it as a file.
- **Prompt edits are not saved.** They are kept in memory and reset when the page reloads.

A small backend for shared storage and real AI feedback is planned.

## Running it

The app is a React + TypeScript frontend built with Vite:

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173
```

See [frontend/README.md](frontend/README.md) for how the code is organised, and [APP_SPECS.txt](APP_SPECS.txt) for the full product specification.

## License

[GNU General Public License v3.0](LICENSE)
