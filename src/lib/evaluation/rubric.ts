import type { Dimension } from './model'

export const rubricVersion = 'beat-h2-accompaniment-v1'
// Dimensions adapted from BEAT, Appendix H.2 (pp. 18–19).
// These five-level anchors were written for this study; they are not paper quotations.
export const rubric: { id: Dimension; name: string; question: string; levels: { title: string; description: string }[] }[] = [
  {
    id: 'coherence', name: 'Coherence', question: 'How well does the accompaniment fit and support the melody?',
    levels: [
      { title: 'Disconnected', description: 'Little effective fit or support.' },
      { title: 'Weak fit', description: 'Frequent mismatches; limited support.' },
      { title: 'Mostly fits', description: 'Generally fits, with noticeable mismatches.' },
      { title: 'Well coordinated', description: 'Fits well and usually supports the melody.' },
      { title: 'Natural fit', description: 'Closely coordinated; consistently supports the melody.' },
    ],
  },
  {
    id: 'plausibility', name: 'Plausibility', question: 'How convincing are the musical organization, transitions, and development?',
    levels: [
      { title: 'Disorganized', description: 'Little recognizable musical structure.' },
      { title: 'Weak structure', description: 'Frequent unnatural changes or connections.' },
      { title: 'Generally plausible', description: 'Some awkward transitions or development.' },
      { title: 'Well structured', description: 'Clear organization; mostly natural development.' },
      { title: 'Convincing structure', description: 'Well formed, with natural transitions and development.' },
    ],
  },
  {
    id: 'musicality', name: 'Musicality', question: 'How would you rate the overall musical quality of this result?',
    levels: [
      { title: 'Very poor', description: 'Strongly detracts from the listening experience.' },
      { title: 'Poor', description: 'Difficult to enjoy or engage with.' },
      { title: 'Acceptable', description: 'An adequate but unremarkable listening experience.' },
      { title: 'Good', description: 'Pleasant to hear, with musical expression.' },
      { title: 'Excellent', description: 'Compelling and highly expressive.' },
    ],
  },
]
