import type { Metadata } from 'next'
import ListeningEvaluation from '@/components/ListeningEvaluation'
import catalog from '@/data/evaluation-catalog.json'

export const metadata: Metadata = {
  title: 'Listening Evaluation | StreamMUSE',
  description: 'Compare three accompaniment results for one melody in the StreamMUSE listening study.',
  robots: { index: false, follow: false },
}

export default function EvaluationPage() {
  return <ListeningEvaluation key={catalog.datasetVersion} datasetVersion={catalog.datasetVersion} />
}
