import { format } from 'date-fns'
import { MessageSquare, X } from 'lucide-react'
import Badge from './Badge'

export interface Task {
  id: number
  email_id: number
  summary: string
  action: string | null
  due_date: string | null
  is_fyi_only: boolean
  is_upcoming: boolean
  event_date: string | null
  status: string
  assignee_name: string | null
  categories: string | null
  tags: string | null
  from_address: string
  from_name: string | null
  sender: string | null
  subject: string
  received_at: string
  body_text?: string
  body_html?: string
  comment_count?: number
  latest_comment?: string | null
  latest_comment_by?: string | null
}

const categoryColour: Record<string, 'blue' | 'purple' | 'green' | 'amber'> = {
  Darren: 'green',
  Lorraine: 'amber',
  Thomas: 'blue',
  Matthew: 'purple',
}

const statusColour: Record<string, 'gray' | 'amber' | 'green' | 'orange'> = {
  pending: 'gray',
  in_progress: 'amber',
  done: 'green',
}

interface Props {
  tasks: Task[]
  onRowClick: (task: Task) => void
  onDismiss?: (task: Task) => void
  showAction?: boolean
  showEvent?: boolean
}

export default function TaskTable({ tasks, onRowClick, onDismiss, showAction = false, showEvent = false }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500 py-6 text-center">No tasks</p>
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-700 text-left text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            <th className="px-4 py-2.5 font-semibold">Received</th>
            <th className="px-4 py-2.5 font-semibold">Sender</th>
            <th className="px-4 py-2.5 font-semibold">Who</th>
            <th className="px-4 py-2.5 font-semibold">Tags</th>
            <th className="px-4 py-2.5 font-semibold">{showEvent ? 'Event' : showAction ? 'Action' : 'Summary'}</th>
            {showEvent
              ? <th className="px-4 py-2.5 font-semibold">Date</th>
              : <th className="px-4 py-2.5 font-semibold">Due</th>
            }
            {!showEvent && <th className="px-4 py-2.5 font-semibold">Assignee</th>}
            <th className="px-4 py-2.5 font-semibold">Status</th>
            <th className="px-4 py-2.5 font-semibold">Comments</th>
            {onDismiss && <th className="px-2 py-2.5" />}
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr
              key={task.id}
              onClick={() => onRowClick(task)}
              className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
            >
              <td className="px-4 py-3 text-slate-400 dark:text-slate-400 whitespace-nowrap text-xs font-mono">
                {format(new Date(task.received_at), 'd MMM yy')}
              </td>
              <td className="px-4 py-3 max-w-[160px] truncate text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors" title={task.from_address}>
                {task.sender || task.from_name || task.from_address}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {task.categories?.split(',').map(c => (
                    <Badge key={c} label={c.trim()} variant={categoryColour[c.trim()] ?? 'gray'} />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {task.tags?.split(',').slice(0, 2).map(t => (
                    <Badge key={t} label={t.trim()} variant="gray" />
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-slate-600 dark:text-slate-300 max-w-[240px]">
                <p className="line-clamp-2 text-xs leading-relaxed">
                  {showEvent ? task.summary : showAction ? (task.action || task.summary) : task.summary}
                </p>
              </td>
              <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs font-mono">
                {showEvent
                  ? (task.event_date ? format(new Date(task.event_date), 'd MMM yy') : '—')
                  : (task.due_date ? format(new Date(task.due_date), 'd MMM yy') : '—')
                }
              </td>
              {!showEvent && (
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {task.assignee_name
                    ? <Badge label={task.assignee_name} variant={categoryColour[task.assignee_name] ?? 'gray'} />
                    : <Badge label="Unassigned" variant="orange" />}
                </td>
              )}
              <td className="px-4 py-3">
                <Badge label={task.status.replace('_', ' ')} variant={statusColour[task.status] || 'gray'} />
              </td>
              <td className="px-4 py-3">
                {task.comment_count ? (
                  <div className="flex items-start gap-1.5 max-w-[160px]" title={task.latest_comment || ''}>
                    <MessageSquare size={12} className="text-orange-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{task.latest_comment}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{task.latest_comment_by} · {task.comment_count}</p>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                )}
              </td>
              {onDismiss && (
                <td className="px-2 py-3">
                  <button
                    onClick={e => { e.stopPropagation(); onDismiss(task) }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    title="Dismiss"
                  >
                    <X size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
