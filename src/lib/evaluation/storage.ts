// Each dataset/rubric combination starts independent participation and drafts.
// Earlier browser keys and database answers remain intact.
export function evaluationStorageKeys(datasetVersion: string, rubricVersion: string) {
  const study = `${datasetVersion}:${rubricVersion}`
  return {
    participantKey: `streammuse-evaluation-participant-v2:${study}`,
    storageKey: `streammuse-listening-evaluation-v2:${study}`,
  }
}
