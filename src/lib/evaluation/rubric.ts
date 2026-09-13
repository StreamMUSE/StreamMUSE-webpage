import type { Dimension } from './model'

export const rubricVersion = 'accompaniment-quality-v1'
// Study-specific overall quality judgment: fit, appropriate repetition and response
// to the melody's development. This is not the earlier three-dimension BEAT rubric.
export const rubricGuidance = 'Judge how naturally the accompaniment supports the melody as it develops. Appropriate repetition can support the music; more variation is not automatically better. What matters is whether repetition and changes fit the melody.'
export const rubric: { id: Dimension; name: string; question: string; levels: { title: string; description: string }[] }[] = [
  {
    id: 'quality', name: 'Accompaniment quality', question: 'How naturally and appropriately does the accompaniment support the melody?',
    levels: [
      { title: 'Very poor', description: 'The accompaniment struggles to support the melody, with serious clashes, mechanical repetition that ignores its development, or extensive changes unrelated to the melody.' },
      { title: 'Poor', description: 'The accompaniment fits the melody weakly, with frequent mismatches, mechanical repetition, or changes that do not respond appropriately to the melody’s development.' },
      { title: 'Fair', description: 'The accompaniment generally fits, but some passages repeat mechanically or change in ways that do not fit. Its response to the melody’s development is incomplete.' },
      { title: 'Good', description: 'The accompaniment fits most of the time. Repetition and changes usually suit the music’s development, with occasional mechanical repetition or less natural responses.' },
      { title: 'Very good', description: 'The accompaniment naturally supports the melody, maintaining or adjusting its patterns as needed. Repetition serves a musical purpose and changes respond appropriately, without obvious mechanical repetition or detachment.' },
    ],
  },
]
