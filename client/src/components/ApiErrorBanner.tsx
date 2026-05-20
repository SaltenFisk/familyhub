import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'

export default function ApiErrorBanner() {
  const { user } = useAuth()
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (user?.role !== 'admin') return
    function check() {
      api.get('/status').then(r => {
        if (r.data.claude_api_error) setError(r.data.claude_api_error)
      }).catch(() => {})
    }
    check()
    const interval = setInterval(check, 60_000)
    return () => clearInterval(interval)
  }, [user])

  async function dismiss() {
    await api.delete('/status/claude-error').catch(() => {})
    setError('')
    setDismissed(true)
  }

  if (!error || dismissed || user?.role !== 'admin') return null

  return (
    <Dialog.Root open={true} onOpenChange={o => !o && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-red-300 dark:border-red-500/40 z-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <Dialog.Title className="font-semibold text-slate-900 dark:text-slate-100 mb-1">
                Claude API Error
              </Dialog.Title>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                New emails could not be analysed because the Claude API returned an error. This is usually caused by insufficient API credits.
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-mono bg-slate-100 dark:bg-slate-900 rounded px-2 py-1 mb-4 break-all">
                {error}
              </p>
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
              >
                Open Anthropic Console →
              </a>
            </div>
            <button onClick={dismiss} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0">
              <X size={18} />
            </button>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={dismiss}
              className="px-4 py-2 text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg transition-colors font-medium"
            >
              Dismiss
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
