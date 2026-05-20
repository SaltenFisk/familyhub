import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import api from '../api/client'

interface Email {
  id: number
  received_at: string
  from_address: string
  from_name: string | null
  subject: string
  processed: boolean
}

interface Props {
  onEmailClick: (emailId: number) => void
}

export default function RecentEmails({ onEmailClick }: Props) {
  const [emails, setEmails] = useState<Email[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 10

  useEffect(() => {
    api.get('/emails', { params: { page, limit } }).then(r => {
      setEmails(r.data.emails)
      setTotal(r.data.total)
    })
  }, [page])

  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      <div className="divide-y divide-slate-700/50">
        {emails.length === 0 && (
          <p className="text-sm text-slate-500 py-6 text-center">No emails yet</p>
        )}
        {emails.map(email => (
          <button
            key={email.id}
            onClick={() => onEmailClick(email.id)}
            className="w-full text-left px-0 py-3 hover:bg-slate-700/30 transition-colors flex items-start gap-3 group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-300 truncate group-hover:text-orange-400 transition-colors">
                {email.subject || '(no subject)'}
              </p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {email.from_name || email.from_address}
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono whitespace-nowrap shrink-0 pt-0.5">
              {format(new Date(email.received_at), 'd MMM')}
            </span>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-xs text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
