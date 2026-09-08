import type { Metadata } from 'next'
import ListeningEvaluation from '@/components/ListeningEvaluation'

export const metadata: Metadata = {
  title: 'Listening Evaluation | StreamMUSE',
  description: 'Compare three accompaniment results for one melody in the StreamMUSE listening study.',
  robots: { index: false, follow: false },
}

export default function EvaluationPage() {
  return <ListeningEvaluation />
}
