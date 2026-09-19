// Keep source titles in the asset manifests unchanged for reproducible imports.
// Both galleries use these display names for headings and player labels.
const displayTitles: Record<string, string> = {
  '童话': '童话 (Fairy Tale)',
  'Night dancer': 'Night Dancer',
  '群青': '群青 (Blue)',
  'lemon': 'Lemon',
  'cruel angel': "A Cruel Angel's Thesis",
  '告白气球': '告白气球 (Love Confession)',
  '青花瓷': '青花瓷 (Blue and White Porcelain)',
  '小幸运': '小幸运 (A Little Happiness)',
  '月亮代表我的心': '月亮代表我的心 (The Moon Represents My Heart)',
  '天空之城': '天空之城 (Castle in the Sky)',
  '一路向北': '一路向北 (All the Way North)',
}

export function getSongTitle(sourceTitle: string): string {
  return displayTitles[sourceTitle] ?? sourceTitle
}
