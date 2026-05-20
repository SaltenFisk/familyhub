import { useEffect, useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, ChevronDown, Check, Send } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
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
interface Comment { id: number; body: string; user_name: string; created_at: string }

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

const categoryColour: Record<string, 'blue' | 'purple' | 'green'> = {
  Thomas: 'blue', Matthew: 'purple', Household: 'green',
}

export default function EmailModal({ task, onClose, onUpdated }: Props) {
  const { user } = useAuth()
  const { dark } = useTheme()
  const [fullTask, setFullTask] = useState<Task | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [assigneeId, setAssigneeId] = useState<string>('')
  const [status, setStatus] = useState<string>('pending')
  const [outcome, setOutcome] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showAssignPicker, setShowAssignPicker] = useState(false)
  const [makeDefault, setMakeDefault] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const assignRef = useRef<HTMLDivElement>(null)

  const isAdmin = user?.role === 'admin'
  const open = !!task
  const data = fullTask || task

  useEffect(() => {
    if (!task) { setFullTask(null); return }
    setSaved(false)
    setShowAssignPicker(false)
    setMakeDefault(false)

    if (task.id > 0) {
      api.get(`/tasks/${task.id}`).then(r => {
        setFullTask(r.data)
        setAssigneeId(r.data.assignee_id?.toString() || '')
        setStatus(r.data.status || 'pending')
        setOutcome(r.data.outcome || '')
      }).catch(() => {
        setFullTask(task)
        setAssigneeId(task.assignee_id?.toString() || '')
        setStatus(task.status || 'pending')
        setOutcome('')
      })
    } else {
      // Email-only view (from Recent Emails), no task record
      setFullTask(task)
      setStatus('pending')
      setOutcome('')
    }

    if (isAdmin) {
      api.get('/users').then(r => setUsers(r.data)).catch(() => {})
    }

    if (task.id > 0) {
      api.get(`/tasks/${task.id}/comments`).then(r => setComments(r.data)).catch(() => {})
    } else {
      setComments([])
    }
  }, [task?.id])

  // Close assign picker when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (assignRef.current && !assignRef.current.contains(e.target as Node)) {
        setShowAssignPicker(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleAssign(uid: string) {
    if (!task || task.id === 0) return
    setAssigneeId(uid)
    setShowAssignPicker(false)

    await api.patch(`/tasks/${task.id}`, { assignee_id: uid ? Number(uid) : null })

    if (makeDefault && uid) {
      // Set default assignee on all tags associated with this task
      const tagNames = data?.tags?.split(',').map(t => t.trim()) || []
      for (const tagName of tagNames) {
        const allTags = await api.get('/tags')
        const tag = allTags.data.find((t: { name: string }) => t.name === tagName)
        if (tag) await api.patch(`/tags/${tag.id}`, { default_assignee_id: Number(uid) })
      }
    }

    const selectedUser = users.find(u => u.id.toString() === uid)
    setFullTask(prev => prev ? { ...prev, assignee_id: uid ? Number(uid) : null, assignee_name: selectedUser?.name || null } : prev)
    onUpdated?.()
  }

  async function postComment() {
    if (!task || task.id === 0 || !newComment.trim()) return
    setPostingComment(true)
    try {
      await api.post(`/tasks/${task.id}/comments`, { body: newComment.trim() })
      setNewComment('')
      const r = await api.get(`/tasks/${task.id}/comments`)
      setComments(r.data)
    } finally {
      setPostingComment(false)
    }
  }

  async function handleSave() {
    if (!task || task.id === 0) { onClose(); return }
    setSaving(true)
    try {
      await api.patch(`/tasks/${task.id}`, { status, outcome })
      setSaved(true)
      onUpdated?.()
    } finally {
      setSaving(false)
    }
  }

  const currentAssigneeName = users.find(u => u.id.toString() === assigneeId)?.name
    || data?.assignee_name
    || null

  return (
    <Dialog.Root open={open} onOpenChange={o => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[720px] md:top-8 md:bottom-8 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-0 pr-4">
              <Dialog.Title className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                {data?.subject || '(no subject)'}
              </Dialog.Title>
              <p className="text-xs text-slate-500 mt-0.5">
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
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors"><X size={20} /></button>
            </Dialog.Close>
          </div>

          {/* Summary / action / assignee */}
          {data && task && task.id > 0 && (
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs">
              {data.summary && <p><span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Summary</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{data.summary}</span></p>}
              {data.action && <p><span className="font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider text-xs">Action</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{data.action}</span></p>}
              {data.due_date && <p><span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-xs">Due</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{data.due_date}</span></p>}

              {/* Assignee badge with picker */}
              <div className="flex items-center gap-2 pt-1">
                <span className="font-medium text-slate-400">Assigned to:</span>
                {isAdmin ? (
                  <div className="relative" ref={assignRef}>
                    <button
                      onClick={() => setShowAssignPicker(p => !p)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-colors"
                    >
                      {currentAssigneeName || 'Unassigned'}
                      <ChevronDown size={10} />
                    </button>

                    {showAssignPicker && (
                      <div className="absolute top-7 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-10 w-52 overflow-hidden">
                        <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                          <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={makeDefault}
                              onChange={e => setMakeDefault(e.target.checked)}
                              className="rounded"
                            />
                            Set as default for these tags
                          </label>
                        </div>
                        <div className="py-1">
                          <button
                            onClick={() => handleAssign('')}
                            className="w-full text-left px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic hover:bg-slate-100 dark:hover:bg-slate-700"
                          >
                            Unassigned
                          </button>
                          {users.map(u => (
                            <button
                              key={u.id}
                              onClick={() => handleAssign(u.id.toString())}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors"
                            >
                              {u.name}
                              {assigneeId === u.id.toString() && <Check size={12} className="text-orange-400" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {currentAssigneeName || 'Unassigned'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Email body */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {data?.body_html ? (
              <iframe
                srcDoc={dark
                  ? `<style>
                      html,body{background:#0f172a!important;color:#cbd5e1!important;font-family:Inter,sans-serif;font-size:13px;line-height:1.6;margin:0;padding:8px}
                      a{color:#fb923c!important}
                      *{color:inherit!important;background-color:transparent!important;border-color:#334155!important}
                      img{max-width:100%;height:auto}
                      table{border-collapse:collapse;width:100%}
                      td,th{padding:4px 8px;vertical-align:top}
                      blockquote{border-left:2px solid #475569;margin-left:0;padding-left:12px;color:#94a3b8!important}
                    </style>${data.body_html}`
                  : `<style>
                      html,body{background:#ffffff;color:#1e293b;font-family:Inter,sans-serif;font-size:13px;line-height:1.6;margin:0;padding:8px}
                      a{color:#ea580c}
                      img{max-width:100%;height:auto}
                      table{border-collapse:collapse;width:100%}
                      td,th{padding:4px 8px;vertical-align:top}
                      blockquote{border-left:2px solid #cbd5e1;margin-left:0;padding-left:12px;color:#64748b}
                    </style>${data.body_html}`
                }
                className="w-full h-full border-0 min-h-[200px]"
                sandbox="allow-same-origin"
                title="Email body"
              />
            ) : (
              <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {data?.body_text || 'No content'}
              </pre>
            )}
          </div>

          {/* Comments — only for real tasks */}
          {task && task.id > 0 && (
            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 space-y-3 max-h-48 overflow-y-auto">
              {comments.length === 0 && (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-1">No comments yet</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-xs font-semibold text-orange-500 dark:text-orange-400">
                    {c.user_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{c.user_name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(c.created_at), 'd MMM HH:mm')}</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">{c.body}</p>
                  </div>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
                  placeholder="Add a comment…"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button
                  onClick={postComment}
                  disabled={postingComment || !newComment.trim()}
                  className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Status / outcome controls — only for real tasks */}
          {task && task.id > 0 && (
            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <div className="flex items-center gap-3">
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</label>
                <div className="flex gap-2">
                  {statusOptions.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setStatus(o.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        status === o.value
                          ? 'bg-orange-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              {status === 'done' && (
                <div>
                  <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Outcome / notes</label>
                  <textarea
                    value={outcome}
                    onChange={e => setOutcome(e.target.value)}
                    placeholder="What was the result?"
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between">
                {saved && <p className="text-xs text-emerald-500 dark:text-emerald-400">Saved</p>}
                <div className="flex gap-2 ml-auto">
                  <Dialog.Close asChild>
                    <button className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Close</button>
                  </Dialog.Close>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors font-medium"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
