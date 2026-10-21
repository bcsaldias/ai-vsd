import type { Lesson, PromptVersion } from '../types/contracts';

export const MOCK_LESSON: Lesson = {
  id: 'water-cycle',
  title: 'The Water Cycle',
  intro:
    'Water moves continuously between the ground, the air, and the sky. ' +
    'In this lesson you will map the stages of the water cycle and identify them in a picture.',
  activities: [
    {
      id: 'water-cycle-diagram',
      kind: 'diagram',
      title: 'Build the cycle',
      prompt: 'Add the stages of the water cycle and connect them in the order they happen.',
      objectives: [
        'Names evaporation, condensation, precipitation, and collection',
        'Connects the stages in a closed loop',
      ],
    },
    {
      id: 'water-cycle-annotation',
      kind: 'annotation',
      title: 'Label the picture',
      prompt: 'Hover over each part of the picture, select it, and write which stage it shows.',
      objectives: ['Links each visual element to the correct stage'],
    },
  ],
};

export const SEED_PROMPT_VERSIONS: PromptVersion[] = [
  {
    id: 'pv-1',
    number: 1,
    author: 'placeholder',
    note: 'Initial draft',
    createdAt: '2026-10-21T10:00:00.000Z',
    prompts: {
      system:
        'You are a supportive tutor. Give short, specific feedback on the student\'s work. ' +
        'Do not give away the full answer.',
      user:
        'Activity: {{activity_title}}\n' +
        'Task: {{activity_prompt}}\n' +
        'Objectives:\n{{objectives}}\n\n' +
        'Student work (JSON):\n{{student_work}}',
      assistant: '',
    },
  },
];
