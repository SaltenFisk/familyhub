import { clsx } from 'clsx'

const variants = {
  blue:   'bg-blue-100 text-blue-700 ring-1 ring-blue-300 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-blue-500/30',
  green:  'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:ring-emerald-500/30',
  amber:  'bg-amber-100 text-amber-700 ring-1 ring-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:ring-amber-500/30',
  red:    'bg-red-100 text-red-700 ring-1 ring-red-300 dark:bg-red-500/20 dark:text-red-300 dark:ring-red-500/30',
  purple: 'bg-purple-100 text-purple-700 ring-1 ring-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:ring-purple-500/30',
  gray:   'bg-slate-200 text-slate-600 ring-1 ring-slate-300 dark:bg-slate-600/40 dark:text-slate-300 dark:ring-slate-500/30',
  orange: 'bg-orange-100 text-orange-700 ring-1 ring-orange-300 dark:bg-orange-500/20 dark:text-orange-300 dark:ring-orange-500/30',
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
