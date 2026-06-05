import MidiPlayer from '@/components/MidiPlayer'
import type { MidiItem } from '@/types/project'

interface MidiAssetListProps {
  items: MidiItem[]
}

export default function MidiAssetList({ items }: MidiAssetListProps) {
  if (items.length === 0) {
    return (
      <div className="empty-panel">
        <p>MIDI examples will be added when this version has public playback assets.</p>
      </div>
    )
  }

  return (
    <div className="midi-list">
      {items.map((item) => (
        <MidiPlayer key={item.id} item={item} />
      ))}
    </div>
  )
}
