const labels = ['A', 'B', 'C']
const versions = ['v0', 'v1', 'v2']
const dimensions = ['quality', 'coherence', 'plausibility', 'musicality']

export const headers = [
  'participant_id', 'round_number', 'session_id', 'dataset_version', 'rubric_version', 'song_id', 'source_origin', 'created_at', 'submitted_at',
  ...labels.flatMap(label => [`${label}_sample_id`, `${label}_version`, `${label}_seed`, ...dimensions.map(d => `${label}_${d}`), `${label}_rank`]),
  ...versions.flatMap(version => [`${version}_label`, `${version}_seed`, ...dimensions.map(d => `${version}_${d}`), `${version}_rank`]),
  'rank_1', 'rank_2', 'rank_3',
]

export function flattenResponse(row) {
  const result = Object.fromEntries(headers.slice(0, 9).map(key => [key, row[key] instanceof Date ? row[key].toISOString() : row[key]]))
  for (const label of labels) {
    const sample = row.assignment.samples[label]
    result[`${label}_sample_id`] = sample.id
    result[`${label}_version`] = sample.version
    result[`${label}_seed`] = sample.seed
    result[`${sample.version}_label`] = label
    result[`${sample.version}_seed`] = sample.seed
    for (const d of dimensions) {
      result[`${label}_${d}`] = row.ratings[label][d]
      result[`${sample.version}_${d}`] = row.ratings[label][d]
    }
    result[`${label}_rank`] = Array.isArray(row.ranking) ? row.ranking.indexOf(label) + 1 : undefined
    result[`${sample.version}_rank`] = Array.isArray(row.ranking) ? row.ranking.indexOf(label) + 1 : undefined
  }
  row.ranking?.forEach((label, i) => { result[`rank_${i + 1}`] = label })
  return result
}

function cell(value) {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
export function responsesCsv(rows) {
  return [headers.join(','), ...rows.map(row => { const flat = flattenResponse(row); return headers.map(key => cell(flat[key])).join(',') })].join('\r\n') + '\r\n'
}
