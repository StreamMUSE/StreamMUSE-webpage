// A new sample collection starts independent participation and draft storage.
// Previous keys and database records are retained for the earlier study.
export function evaluationStorageKeys(datasetVersion: string) {
  return {
    participantKey: `streammuse-evaluation-participant-v1:${datasetVersion}`,
    storageKey: `streammuse-listening-evaluation-v1:${datasetVersion}`,
  }
}
