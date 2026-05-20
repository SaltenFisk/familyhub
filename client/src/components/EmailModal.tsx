import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import api from '../api/client'

interface Task {
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

interface Props {
  task: Task | null
  onClose: () => void
}

export default function EmailModal({ task, onClose }: Props) {
  const [fullTask, setFullTask] = useState<Task | null>(null)

  useEffect(() => {
    if (!task) return
    api.get(`/tasks/${task.id}`).then(r => setFullTask(r.data)).catch(() => setFullTask(task))
  }, [task?.id])

  const open = !!task
  const data = fullTask || task

  return (
    <Dialog.Root open={open} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[700px] md:top-8 md:bottom-8 bg-white rounded-xl shadow-xl z-50 flex flex-col overflow-hidden">
          <div className="flex items-start justify-between p-4 border-b border-gray-200">
            <div className="flex-1 min-w-0 pr-4">
              <Dialog.Title className="font-semibold text-gray-800 text-sm leading-tight truncate">
                {data?.subject || '(no subject)'}
              </Dialog.Title>
              <p className="text-xs text-gray-500 mt-0.5">
                {data?.from_name ? `${data.from_name} <${data.from_address}>` : data?.from_address}
              </p>
            </div>
            <Dialog.Close asChild>
              <button className="text-gray-400 hover:text-gray-600 shrink-0">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {data && (
            <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-1 text-xs">
              {data.summary && <p><span className="font-medium text-gray-600">Summary:</span> {data.summary}</p>}
              {data.action && <p><span className="font-medium text-gray-600">Action:</span> {data.action}</p>}
              {data.due_date && <p><span className="font-medium text-gray-600">Due:</span> {data.due_date}</p>}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-4">
            {data?.body_html ? (
              <iframe
                srcDoc={data.body_html}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
                title="Email body"
              />
            ) : (
              <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                {data?.body_text || 'No content'}
              </pre>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
