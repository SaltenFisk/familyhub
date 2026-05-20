import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import * as Select from '@radix-ui/react-select'
import { X, ChevronDown, Check } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/client'
import Badge from './Badge'

interface Task {
  id: number
  email_id: number
  summary: string
  action: string | null
  due_date: string | null
  is_fyi_only: boolean
  status: string
  assignee_id?: number | null
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

interface User { id: number; name: string; role: string }

interface Props {
  task: Task | null
  onClose: () => void
  onUpdated?: () => void
}

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'done', label: 'Done' },
]

export default function EmailModal({ task, onClose, onUpdated }: Props) {
  const { user } = useAuth()
  const [fullTask, setFullTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [status, setStatus] = useState<string>('')
  const [outcome, setOutcome] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const isAdmin = user?.role === 'admin'
  const open = !!task
  const data = fullTask || task

  useEffect(() => {
    if (!task) return
    setFullTask(null)
    setSaved(false)

    api.get(`/tasks/${task.id}`).then(r => {
      setFullTask(r.data)
      setAssigneeId(r.data.assignee_id?.toString() || '')
      setStatus(r.data.status)
      setOutcome(r.data.outcome || '')
    }).catch(() => {
      setFullTask(task)
      setAssigneeId('')
      setStatus(task.status)
      setOutcome('')
    })

    if (isAdmin) {
      api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    }
  }, [task?.id])

  async function handleSave() {
    if (!task) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { status, outcome }
      if (isAdmin) body.assignee_id = assigneeId ? Number(assigneeId) : null
      await api.patch(`/tasks/${task.id}`, body)
      setSaved(true)
      onUpdated?.()
    } finally {
      setSaving(false)
    }
  }

  const categoryColour: Record<string, 'blue' | 'purple' | 'green'> = {
    Thomas: 'blue', Matthew: 'purple', Household: 'green',
  }

  return (
    <Dialog.Root open={open} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[720px] md:top-8 md:bottom-8 bg-white rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-200">
            <div className="flex-1 min-w-0 pr-4">
              <Dialog.Title className="font-semibold text-gray-800 text-sm leading-tight truncate">
                {data?.subject || '(no subject)'}
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                {data?.from_name ? `${data.from_name} <${data.from_address}>` : data?.from_address}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {data?.categories?.split(',').map(c => (
                  <Badge key={c} label={c.trim()} variant={categoryColour[c.trim()] || 'gray'} />
                ))}
                {data?.tags?.split(',').map(t => (
                  <Badge key={t} label={t.trim()} variant="gray" />
                ))}
              </div>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 shrink-0"><X size={20} /></button>
            </Dialog.Close>
          </div>

          {/* Summary / action */}
          {data && (
            <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-1 text-xs">
              {data.summary && <p><span className="font-medium text-gray-600">Summary:</span> {data.summary}</p>}
              {data.action && <p><span className="font-medium text-gray-600">Action:</span> {data.action}</p>}
              {data.due_date && <p><span className="font-medium text-gray-600">Due:</span> {data.due_date}</p>}
            </div>
          )}

          {/* Email body */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {data?.body_html ? (
              <iframe
                srcDoc={data.body_html}
                className="w-full h-full border-0 min-h-[200px]"
                sandbox="allow-same-origin"
                title="Email body"
              />
            ) : (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {data?.body_text || 'No content'}
              </pre>
            )}
          </div>

          {/* Task controls */}
          <div className="p-4 border-t border-gray-200 bg-white space-y-3">
            <div className="flex flex-wrap gap-3">

              {/* Status */}
              <div className="flex-1 min-w-[140px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <Select.Root value={status} onValueChange={setStatus}>
                  <Select.Trigger className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <Select.Value />
                    <ChevronDown size={14} className="text-gray-400" />
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                      <Select.Viewport>
                        {statusOptions.map(o => (
                          <Select.Item key={o.value} value={o.value} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none">
                            <Select.ItemIndicator><Check size={12} /></Select.ItemIndicator>
                            <Select.ItemText>{o.label}</Select.ItemText>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
              </div>

              {/* Assignee — admin only */}
              {isAdmin && (
                <div className="flex-1 min-w-[140px]">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assigned to</label>
                  <Select.Root value={assigneeId} onValueChange={setAssigneeId}>
                    <Select.Trigger className="w-full flex items-center justify-between border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <Select.Value placeholder="Unassigned" />
                      <ChevronDown size={14} className="text-gray-400" />
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
                        <Select.Viewport>
                          <Select.Item value="" className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none italic text-gray-400">
                            <Select.ItemIndicator><Check size={12} /></Select.ItemIndicator>
                            <Select.ItemText>Unassigned</Select.ItemText>
                          </Select.Item>
                          {users.map(u => (
                            <Select.Item key={u.id} value={u.id.toString()} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none">
                              <Select.ItemIndicator><Check size={12} /></Select.ItemIndicator>
                              <Select.ItemText>{u.name}</Select.ItemText>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
              )}
            </div>

            {/* Outcome — shown when marking done */}
            {status === 'done' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Outcome / notes</label>
                <textarea
                  value={outcome}
                  onChange={e => setOutcome(e.target.value)}
                  placeholder="What was the result?"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              {saved && <p className="text-xs text-green-600">Saved</p>}
              <div className="flex gap-2 ml-auto">
                <Dialog.Close asChild>
                  <button className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700">Close</button>
                </Dialog.Close>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
