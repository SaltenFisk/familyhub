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
      <div className="divide-y divide-gray-100">
        {emails.length === 0 && (
          <p className="text-sm text-gray-400 py-6 text-center">No emails yet</p>
        )}
        {emails.map(email => (
          <button
            key={email.id}
            onClick={() => onEmailClick(email.id)}
            className="w-full text-left px-0 py-3 hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors flex items-start gap-3 group"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-700">
                {email.subject || '(no subject)'}
              </p>
              <p className="text-xs text-gray-500 truncate mt-0.5">
                {email.from_name || email.from_address}
              </p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 pt-0.5">
              {format(new Date(email.received_at), 'd MMM')}
            </span>
          </button>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-xs text-gray-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
