import type { VersionStatusTone } from '@/types/project'

interface PaperStatusBadgeProps {
  children: React.ReactNode
  tone?: VersionStatusTone
}

const toneClasses: Record<VersionStatusTone, string> = {
  publication: 'border-amber-300 bg-amber-50 text-amber-900',
  active: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  development: 'border-sky-300 bg-sky-50 text-sky-900',
  neutral: 'border-stone-300 bg-stone-50 text-stone-800',
}

export default function PaperStatusBadge({ children, tone = 'neutral' }: PaperStatusBadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium ${toneClasses[tone]}`}>
      {children}
    </span>
  )
}
