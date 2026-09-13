export const datasetVersion = 'ismir-lbd-202609010-playback-v1'

// Only the named playback outputs belong in the listening study.
export function sampleCondition(filename) {
  if (filename === '00_melody.mid') return { version: 'reference', seed: null }
  const match = /^(legacy_m2a|lekai_no_prompt|pc_rule_if_else_n10)_s([012])\.mid$/.exec(filename)
  if (!match) throw new Error(`Unexpected evaluation MIDI filename: ${filename}`)
  const versions = { legacy_m2a: 'v0', lekai_no_prompt: 'v1', pc_rule_if_else_n10: 'v2' }
  return { version: versions[match[1]], seed: Number(match[2]) }
}
