// The Value Scenarios lesson (Nathan, Klasnja & Friedman, 2007): mock lesson content.

import type { ActivityDefinition, Lesson } from '../types/contracts';

/**
 * Worked example: the same smart doorbell camera as the stakeholder lesson, told as scenarios,
 * so students who saw it there can follow it here. Plain data in the scenarios' saved-state shape.
 */
const DOORBELL_SCENARIOS = {
  technology: 'Smart doorbell camera that records the front door and shares clips to a phone app',
  stakeholders: [
    { id: 'exs-home', name: 'Homeowners', kind: 'direct' },
    { id: 'exs-teen', name: 'Teenagers in the household', kind: 'direct' },
    { id: 'exs-delivery', name: 'Delivery workers', kind: 'indirect' },
    { id: 'exs-street', name: 'Neighbours and passers-by', kind: 'indirect' },
  ],
  scenarios: [
    {
      id: 'exs-1', stakeholderId: 'exs-delivery', title: 'The “suspicious” driver',
      story:
        'Sam delivers 120 parcels a day. At one house, a clip of Sam leaving a parcel is posted to a neighbourhood app ' +
        'with the caption “suspicious”. Sam only finds out when a customer mentions it.',
      horizon: 'years',
      later:
        'Most homes on Sam’s route now have cameras. The delivery company starts using customers’ clips to rate how ' +
        'fast and how carefully drivers work.',
      widespread: 'Every doorstep records workers. Delivery work is watched all day by people who are not the employer.',
      systemic:
        'Employers lean on customers’ cameras instead of their own policies. Complaints arrive as video that workers ' +
        'can’t see or answer.',
      values: [
        { id: 'exs-v1', name: 'Dignity', effect: 'harm' },
        { id: 'exs-v2', name: 'Privacy', effect: 'harm' },
        { id: 'exs-v3', name: 'Fairness', effect: 'harm' },
        { id: 'exs-v4', name: 'Trust', effect: 'benefit' },
      ],
    },
    {
      id: 'exs-2', stakeholderId: 'exs-street', title: 'The morning walk',
      story:
        'Ana walks her dog past the same houses every morning. Three of them have doorbell cameras that also capture ' +
        'the pavement. She has never noticed them.',
      horizon: 'decades',
      later:
        'Clips from thousands of doorbells can be searched by time and place. Anyone with access could piece together ' +
        'Ana’s daily routine.',
      widespread: 'If every front door records the street, there is no unrecorded public space left.',
      systemic:
        'Police and insurers come to expect footage. Not having a camera starts to look careless, or suspicious.',
      values: [
        { id: 'exs-v5', name: 'Privacy', effect: 'harm' },
        { id: 'exs-v6', name: 'Informed consent', effect: 'harm' },
        { id: 'exs-v7', name: 'Safety', effect: 'benefit' },
      ],
    },
    {
      id: 'exs-3', stakeholderId: 'exs-home', title: 'Peace of mind',
      story: 'Jo works late and checks the app to see her teenager get home safely. It’s the first thing she looks at.',
      horizon: 'years',
      later: 'Her teenager has learned to come in through the back door so they aren’t logged.',
      widespread: 'Families everywhere track each other’s comings and goings by default.',
      systemic: 'Trust at home shifts from conversation to checking. Not being watched starts to need a reason.',
      values: [
        { id: 'exs-v8', name: 'Safety', effect: 'benefit' },
        { id: 'exs-v9', name: 'Autonomy', effect: 'harm' },
        { id: 'exs-v10', name: 'Trust', effect: 'harm' },
      ],
    },
  ],
  tensions: [
    {
      id: 'exs-t1', a: 'exs-3', b: 'exs-2',
      note: 'Jo’s sense of safety depends on recording the doorstep, which also records Ana, who never agreed to it (safety vs privacy).',
    },
    {
      id: 'exs-t2', a: 'exs-3', b: 'exs-1',
      note: 'Homeowners gain proof of delivery; drivers lose dignity and become judged by clips they can’t answer.',
    },
  ],
};

const STATE = 'value-scenarios';
const step = (n: number, def: Omit<ActivityDefinition, 'kind' | 'stateKey' | 'config' | 'example' | 'stakeholderSource'>): ActivityDefinition => ({
  ...def,
  kind: 'value-scenarios',
  stateKey: STATE,
  config: { step: n },
  example: DOORBELL_SCENARIOS,
  stakeholderSource: { stateKey: 'stakeholder-board', kind: 'stakeholder-tokens', label: 'my stakeholder map' },
});

export const SCENARIOS_LESSON: Lesson = {
  id: 'vsd-value-scenarios',
  title: 'Value Scenarios',
  accent: '#d26559', // coral, from the VSD Lab palette
  symbol: '≡',
  intro:
    'Value scenarios are short stories about how a technology plays out for different people, including people who never ' +
    'use it, once it is widely used and has been around for years (Nathan, Klasnja & Friedman, 2007). In this lesson you ' +
    'will write a few scenarios, push them forward in time and across society, and trace the values they touch. ' +
    'Your scenarios carry over from step to step.',
  activities: [
    step(1, {
      id: 'scenarios-technology',
      title: 'Choose the technology',
      prompt: 'Name the technology your scenarios are about. Be concrete: what does it do, and who uses it?',
      objectives: ['Names a specific technology and what it does'],
      guide: [{ target: 'technology', label: 'Technology', where: 'The box at the top left of the panel below.' }],
    }),
    step(2, {
      id: 'scenarios-stakeholders',
      title: 'Whose stories?',
      prompt:
        'List the people whose stories you will tell. Include at least one indirect stakeholder: someone affected by the ' +
        'technology who never uses it.',
      objectives: ['Lists at least three stakeholders', 'Includes at least one indirect stakeholder'],
      guide: [{
        target: 'stakeholders', label: 'Whose stories?',
        where: 'Left of the scenario list. Add people yourself, or bring them in from your stakeholder map.',
      }],
    }),
    step(3, {
      id: 'scenarios-story',
      title: 'Write a scenario',
      prompt:
        'Write a short story, a few sentences, about one stakeholder meeting the technology today. Make it specific: ' +
        'a person, a place, a moment. Then write another for a different stakeholder.',
      objectives: ['Tells a concrete story from one stakeholder’s point of view', 'Writes scenarios for at least two stakeholders'],
      guide: [{ target: 'story', label: '+ New scenario', where: 'Under the scenario list.' }],
    }),
    step(4, {
      id: 'scenarios-time',
      title: 'Move it forward in time',
      prompt: 'Jump ahead 5 or 20+ years in each scenario. What has changed for this person?',
      objectives: ['Describes how effects build up or change over the years'],
      guide: [{ target: 'time', label: 'Later', where: 'In each scenario card: pick how far ahead, then write.' }],
    }),
    step(5, {
      id: 'scenarios-widespread',
      title: 'Imagine everyone has it',
      prompt: 'What happens when the technology is everywhere, not just in one home, school, or workplace?',
      objectives: ['Considers the effects of widespread use, not only of one user'],
      guide: [{ target: 'widespread', label: 'If everyone had it', where: 'In each scenario card.' }],
    }),
    step(6, {
      id: 'scenarios-systemic',
      title: 'Trace systemic effects',
      prompt: 'Follow the knock-on effects: how do institutions, social norms, or relationships change?',
      objectives: ['Identifies indirect effects on institutions, norms, or relationships'],
      guide: [{ target: 'systemic', label: 'Knock-on effects', where: 'In each scenario card.' }],
    }),
    step(7, {
      id: 'scenarios-values',
      title: 'Value implications',
      prompt: 'Tag each scenario with the values it touches, and mark each one as a harm or a benefit.',
      objectives: ['Names the values at stake in each scenario', 'Marks whether each value is harmed or supported'],
      guide: [{ target: 'values', label: 'Values at stake', where: 'At the bottom of each scenario card. Pick harm or benefit, type, press Enter.' }],
    }),
    step(8, {
      id: 'scenarios-tensions',
      title: 'Compare scenarios',
      prompt:
        'Put your scenarios side by side. Where does one stakeholder’s benefit come at another’s cost? Record the tensions.',
      objectives: ['Identifies at least one tension between scenarios', 'Explains which values conflict'],
      guide: [{ target: 'tensions', label: 'Tensions between scenarios', where: 'Under the scenario cards.' }],
    }),
  ],
};
