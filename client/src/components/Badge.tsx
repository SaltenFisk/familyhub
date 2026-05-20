import { clsx } from 'clsx'

const variants = {
  blue: 'bg-blue-500/20 text-blue-300 ring-1 ring-blue-500/30',
  green: 'bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/30',
  amber: 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/30',
  red: 'bg-red-500/20 text-red-300 ring-1 ring-red-500/30',
  purple: 'bg-purple-500/20 text-purple-300 ring-1 ring-purple-500/30',
  gray: 'bg-slate-600/40 text-slate-300 ring-1 ring-slate-500/30',
  orange: 'bg-orange-500/20 text-orange-300 ring-1 ring-orange-500/30',
}

interface Props {
  label: string
  variant?: keyof typeof variants
  className?: string
}

export default function Badge({ label, variant = 'gray', className }: Props) {
  return (
    <span className={clsx('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', variants[variant], className)}>
      {label}
    </span>
  )
}
