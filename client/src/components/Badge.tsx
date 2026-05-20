import { clsx } from 'clsx'

const variants = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  gray: 'bg-gray-100 text-gray-600',
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
