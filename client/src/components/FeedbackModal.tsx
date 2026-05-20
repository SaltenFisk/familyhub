import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, MessageSquarePlus } from 'lucide-react'

export default function FeedbackModal() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  function handleSubmit() {
    if (!title.trim()) return
    const subject = encodeURIComponent(`FamilyHub Feature Request: ${title.trim()}`)
    const bodyText = encodeURIComponent(body.trim() || '(no description provided)')
    window.location.href = `mailto:darren.a.johnston@gmail.com?subject=${subject}&body=${bodyText}`
    setTitle('')
    setBody('')
    setOpen(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Suggest a feature"
          title="Suggest a feature"
        >
          <MessageSquarePlus size={16} />
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="font-semibold text-slate-900 dark:text-slate-100">
              Suggest a Feature
            </Dialog.Title>
            <Dialog.Close asChild>
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Filter tasks by due date"
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Description
              </label>
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Describe what you'd like and why it would be useful…"
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors resize-none"
              />
            </div>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
            This will open your mail app with a pre-filled email to Darren.
          </p>

          <div className="flex justify-end gap-2 mt-4">
            <Dialog.Close asChild>
              <button className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="px-4 py-2 text-sm bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-40 transition-colors font-medium"
            >
              Send Suggestion
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
