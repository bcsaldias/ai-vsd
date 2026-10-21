import type { Lesson, PromptVersion } from '../types/contracts';

/**
 * Worked example for the stakeholder board: a smart doorbell camera. A different case from the one
 * students are offered (a reading app), so it models each step without giving away their answers.
 * Shown read-only, filtered to the current step. Plain data in the board's saved-state shape.
 */
const DOORBELL_EXAMPLE = {
  context: { type: 'technology', label: 'Smart doorbell camera that records the front door and shares clips to a phone app' },
  tokens: [
    { id: 'ex-home', label: 'Homeowners', kind: 'direct', ring: 'core', overlooked: false, x: -115, y: 0 },
    { id: 'ex-household', label: 'Household members', kind: 'direct', ring: 'core', overlooked: false, x: 57, y: 100 },
    { id: 'ex-police', label: 'Police', kind: 'direct', ring: 'peripheral', overlooked: false, x: -38, y: 215 },
    { id: 'ex-delivery', label: 'Delivery workers', kind: 'indirect', ring: 'peripheral', overlooked: false, x: 105, y: -182 },
    { id: 'ex-neighbours', label: 'Neighbours', kind: 'indirect', ring: 'peripheral', overlooked: false, x: -168, y: 141 },
    { id: 'ex-passersby', label: 'Passers-by', kind: 'indirect', ring: 'peripheral', overlooked: false, x: -209, y: 18 },
    { id: 'ex-tenants', label: 'Tenants (landlord installed it)', kind: 'indirect', ring: 'excluded', overlooked: false, x: 291, y: 106 },
    { id: 'ex-unhoused', label: 'People experiencing homelessness', kind: 'indirect', ring: 'excluded', overlooked: true, x: -219, y: -219 },
  ],
  links: [
    { id: 'ex-l1', source: 'ex-home', target: 'ex-police', type: 'relationship', label: 'shares footage with' },
    { id: 'ex-l3', source: 'ex-home', target: 'ex-delivery', type: 'relationship', label: 'rates and reports' },
    { id: 'ex-l4', source: 'ex-home', target: 'ex-neighbours', type: 'relationship', label: 'records the street outside' },
    {
      id: 'ex-t1', source: 'ex-home', target: 'ex-passersby', type: 'tension',
      label: 'Recording more of the street makes homeowners feel safer, but records people who never agreed to it.',
      sourceValueId: 'ex-safety', targetValueId: 'ex-privacy',
      owner: 'Product team', action: 'Record only the doorstep by default; blur the street.',
    },
    {
      id: 'ex-t2', source: 'ex-police', target: 'ex-neighbours', type: 'tension',
      label: 'Police requests for footage can sweep in neighbours who had nothing to do with an incident.',
      sourceValueId: 'ex-safety', targetValueId: 'ex-privacy',
      owner: 'Legal team', action: 'Share footage only with a warrant, and tell everyone who appears in it.',
    },
    {
      id: 'ex-t3', source: 'ex-home', target: 'ex-unhoused', type: 'tension',
      label: '“Suspicious person” alerts protect homes but single out people for being in public space.',
      sourceValueId: 'ex-safety', targetValueId: 'ex-dignity',
      owner: 'Community guidelines team', action: 'Remove “suspicious person” labels from shared posts.',
    },
  ],
  impacts: [
    { id: 'ex-i1', tokenId: 'ex-home', kind: 'benefit', text: 'Sees who is at the door from anywhere', valueIds: ['ex-safety'] },
    { id: 'ex-i2', tokenId: 'ex-home', kind: 'harm', text: 'Clips stored on company servers could be leaked', valueIds: ['ex-privacy'] },
    { id: 'ex-i3', tokenId: 'ex-household', kind: 'harm', text: 'Their comings and goings are logged for others in the home to see', valueIds: ['ex-privacy', 'ex-autonomy'] },
    { id: 'ex-i4', tokenId: 'ex-police', kind: 'benefit', text: 'Footage can help solve crimes', valueIds: ['ex-safety'] },
    { id: 'ex-i5', tokenId: 'ex-delivery', kind: 'harm', text: 'Watched at every stop; clips sometimes posted online', valueIds: ['ex-privacy', 'ex-dignity'] },
    { id: 'ex-i6', tokenId: 'ex-delivery', kind: 'benefit', text: 'Proof of delivery protects them from false claims', valueIds: ['ex-trust'] },
    { id: 'ex-i7', tokenId: 'ex-neighbours', kind: 'harm', text: 'Their doorway and garden are in view of the camera', valueIds: ['ex-privacy'] },
    { id: 'ex-i8', tokenId: 'ex-passersby', kind: 'harm', text: 'Recorded without knowing or agreeing', valueIds: ['ex-privacy', 'ex-consent'] },
    { id: 'ex-i9', tokenId: 'ex-tenants', kind: 'harm', text: 'Can’t turn it off; the landlord sees when they come and go', valueIds: ['ex-autonomy', 'ex-privacy'] },
    { id: 'ex-i10', tokenId: 'ex-unhoused', kind: 'harm', text: 'Reported as “suspicious” for sitting or sleeping nearby', valueIds: ['ex-dignity', 'ex-fairness'] },
  ],
  values: [
    {
      id: 'ex-privacy', name: 'Privacy',
      definition: 'Moving through your own doorway and street without being recorded or watched by people you didn’t choose.',
      owner: 'Product team', action: 'Add privacy zones that blur the street and neighbours’ property by default.',
    },
    {
      id: 'ex-safety', name: 'Safety',
      definition: 'Being, and feeling, protected from theft and intruders at home.',
      owner: 'Product team', action: 'Alert on people at the door, not on everyone who walks past.',
    },
    {
      id: 'ex-dignity', name: 'Dignity',
      definition: 'Being treated as a person, not a suspect, while doing your job or being in a public place.',
      owner: 'Community guidelines team', action: 'Ban posting clips that mock or accuse people without evidence.',
    },
    {
      id: 'ex-trust', name: 'Trust',
      definition: 'Confidence that the footage is accurate and used fairly by everyone who can see it.',
      owner: 'Trust & safety team', action: 'Publish a yearly report on how footage is shared with police.',
    },
    {
      id: 'ex-autonomy', name: 'Autonomy',
      definition: 'Deciding for yourself when you are recorded in the place where you live.',
      owner: 'Product team', action: 'Let every household member and tenant pause recording while they’re home.',
    },
    {
      id: 'ex-consent', name: 'Informed consent',
      definition: 'Knowing you are being recorded, and having a real choice about it.',
      owner: 'Design team', action: 'Make the camera and its recording light clearly visible from the street.',
    },
    {
      id: 'ex-fairness', name: 'Fairness',
      definition: 'Not being singled out because of how you look or where you sleep.',
      owner: 'Policy team', action: 'Audit which people get reported as “suspicious”, and how often.',
    },
  ],
};

/** Every step works on the same stakeholder token board (shared stateKey); config.step unlocks its tools. */
const BOARD = 'stakeholder-board';

export const MOCK_LESSON: Lesson = {
  id: 'vsd-stakeholder-analysis',
  title: 'Stakeholder Analysis',
  intro:
    'Value Sensitive Design asks you to account for everyone a technology affects — not only the people who use it. ' +
    'In this lesson you will build a stakeholder map with tokens: place stakeholders on rings around what you are designing, ' +
    'connect them, note what each could gain or lose, and trace those harms and benefits to the values at stake. ' +
    'The board carries over from step to step, so you can go back and revise at any point. ' +
    'No project of your own? Use a reading app that tracks each student’s progress and shares it with teachers and parents.',
  activities: [
    {
      id: 'stakeholders-start',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 1 },
      guide: [{ target: 'context', label: 'The centre of the board', where: 'Select it, then name it in the panel on the right.' }],
      title: 'Choose a starting point',
      prompt: 'Start from a technology, a value, or a context of use. Select the centre of the board and name what you are designing.',
      objectives: [
        'Names a specific technology, value, or context of use',
        'Says which of the three it is',
      ],
    },
    {
      id: 'stakeholders-direct',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 2 },
      guide: [{ target: 'direct', label: 'Direct token', where: 'In the palette left of the board. Drag it onto the rings, then type its name.' }],
      title: 'Direct stakeholders',
      prompt:
        'Add the people who will interact with the technology or its outputs. Drag each token onto the rings: ' +
        'the closer to the centre, the more central they are to the design.',
      objectives: [
        'Identifies the groups who interact with the technology directly',
        'Names stakeholders as roles (e.g. “teachers”), not individuals',
        'Places core stakeholders nearer the centre than peripheral ones',
      ],
    },
    {
      id: 'stakeholders-indirect',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 3 },
      guide: [
        { target: 'indirect', label: 'Indirect token', where: 'In the palette left of the board.' },
        { target: 'excluded', label: 'Excluded area', where: 'The outer dashed ring. Drag left-out stakeholders there.' },
        { target: 'overlooked', label: 'Hidden or overlooked', where: 'Right panel, after you select a stakeholder.' },
      ],
      title: 'Indirect stakeholders',
      prompt:
        'Add the people affected by the technology who never use it. Look for those who are easy to miss: ' +
        'move anyone currently left out of the design into the outer “excluded” area, and flag stakeholders who are hidden or easily overlooked.',
      objectives: [
        'Identifies at least two indirect stakeholder groups',
        'Surfaces hidden, overlooked, or excluded groups',
        'Distinguishes direct from indirect stakeholders correctly',
      ],
    },
    {
      id: 'stakeholders-relationships',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 4 },
      guide: [{ target: 'relationships', label: 'Connections', where: 'Drag from a token’s dot to another token, or use “Connect to…” in the right panel.' }],
      title: 'Relationships between stakeholders',
      prompt:
        'Connect stakeholders who affect one another: drag from a token’s dot to another token, ' +
        'then label how one affects the other (e.g. “reports to”, “cares for”, “pays for”).',
      objectives: [
        'Connects stakeholders whose interests are linked',
        'Labels each relationship with how one affects the other',
      ],
    },
    {
      id: 'stakeholders-impacts',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 5 },
      guide: [{ target: 'impacts', label: '+ Harm / + Benefit', where: 'Right panel, after you select a stakeholder.' }],
      title: 'Harms and benefits',
      prompt: 'Select each stakeholder and note what they could gain or lose from the technology.',
      objectives: [
        'Lists at least one harm or benefit for each stakeholder',
        'Includes harms for indirect stakeholders, not only for users',
      ],
    },
    {
      id: 'stakeholders-values',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 6 },
      guide: [{ target: 'values', label: '+ value', where: 'Under each harm and benefit in the right panel. Type a value and press Enter.' }],
      title: 'Map to values',
      prompt: 'For each harm and benefit, name the human values it touches (e.g. privacy, autonomy, trust, fairness).',
      objectives: [
        'Links each harm and benefit to one or more values',
        'Chooses values with ethical import, not only usability features',
      ],
    },
    {
      id: 'stakeholders-definitions',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 7 },
      guide: [{ target: 'definitions', label: 'Value definitions', where: 'In the Values list at the bottom of the right panel.' }],
      title: 'Define the key values',
      prompt:
        'For the values that matter most, write what each one means in this context. ' +
        'Different stakeholders may understand the same value differently.',
      objectives: [
        'Defines key values in terms of this technology and its stakeholders',
        'Notes where stakeholders would understand a value differently',
      ],
    },
    {
      id: 'stakeholders-tensions',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 8 },
      guide: [{ target: 'tensions', label: 'Tensions', where: '“Tension with…” in the right panel, or switch dragging to “Tension” left of the board.' }],
      title: 'Value tensions',
      prompt:
        'Draw a tension between two stakeholders whose values pull against each other, and name the value at stake for each ' +
        '(e.g. a student’s privacy vs a parent’s wish to stay informed).',
      objectives: [
        'Identifies at least one tension between stakeholders’ values',
        'Names the specific value in conflict on each side',
      ],
    },
    {
      id: 'stakeholders-organization',
      kind: 'stakeholder-tokens',
      stateKey: BOARD,
      example: DOORBELL_EXAMPLE,
      config: { step: 9 },
      guide: [{ target: 'organization', label: 'Owner and next action', where: 'Under each value, and in each tension.' }],
      title: 'Take it into the organization',
      prompt: 'For the key values and tensions, note who should own them and what they will do next.',
      objectives: [
        'Assigns an owner to each key value or tension',
        'Proposes a concrete next action for each',
      ],
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
