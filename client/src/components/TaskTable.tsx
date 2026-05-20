import { format } from 'date-fns'
import Badge from './Badge'

export interface Task {
  id: number
  email_id: number
  summary: string
  action: string | null
  due_date: string | null
  is_fyi_only: boolean
  status: string
  assignee_name: string | null
  categories: string | null
  tags: string | null
  from_address: string
  from_name: string | null
  subject: string
  received_at: string
  body_text?: string
  body_html?: string
}

const categoryColour: Record<string, 'blue' | 'purple' | 'green'> = {
  Thomas: 'blue',
  Matthew: 'purple',
  Household: 'green',
}

const statusColour: Record<string, 'gray' | 'amber' | 'green'> = {
  pending: 'gray',
  in_progress: 'amber',
  done: 'green',
}

interface Props {
  tasks: Task[]
  onRowClick: (task: Task) => void
}

export default function TaskTable({ tasks, onRowClick }: Props) {
  if (tasks.length === 0) {
    return <p className="text-sm text-gray-400 py-6 text-center">No tasks</p>
  }

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase tracking-wide">
            <th className="px-4 py-2 font-medium">Received</th>
            <th className="px-4 py-2 font-medium">From</th>
            <th className="px-4 py-2 font-medium">Category</th>
            <th className="px-4 py-2 font-medium">Tags</th>
            <th className="px-4 py-2 font-medium">Summary</th>
            <th className="px-4 py-2 font-medium">Due</th>
            <th className="px-4 py-2 font-medium">Assignee</th>
            <th className="px-4 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map(task => (
            <tr
              key={task.id}
              onClick={() => onRowClick(task)}
              className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                {format(new Date(task.received_at), 'd MMM yy')}
              </td>
              <td className="px-4 py-3 max-w-[140px] truncate text-gray-700" title={task.from_address}>
                {task.from_name || task.from_address}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {task.categories?.split(',').map(c => (
                    <Badge key={c} label={c.trim()} variant={categoryColour[c.trim()] || 'gray'} />
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
              <td className="px-4 py-3 text-gray-700 max-w-[240px]">
                <p className="line-clamp-2 text-xs leading-relaxed">{task.summary}</p>
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                {task.due_date ? format(new Date(task.due_date), 'd MMM yy') : '—'}
              </td>
              <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">
                {task.assignee_name || <span className="text-gray-400 italic">Unassigned</span>}
              </td>
              <td className="px-4 py-3">
                <Badge label={task.status.replace('_', ' ')} variant={statusColour[task.status] || 'gray'} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
