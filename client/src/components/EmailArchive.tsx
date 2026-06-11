import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Search, X } from 'lucide-react'
import api from '../api/client'

export interface Email {
  id: number
  received_at: string
  from_address: string
  from_name: string | null
  sender?: string | null
  subject: string
  processed?: boolean
}

type SortCol = 'received_at' | 'sender' | 'subject'
type SortDir = 'asc' | 'desc'

interface Props {
  onEmailClick: (emailId: number) => void
  /** When provided, uses this data instead of fetching from the API (demo mode) */
  staticEmails?: Email[]
}

const PAGE_SIZE = 20

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (col !== sortCol) return <ChevronUp size={12} className="opacity-20" />
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-orange-500" /> : <ChevronDown size={12} className="text-orange-500" />
}

export default function EmailArchive({ onEmailClick, staticEmails }: Props) {
  const isDemo = !!staticEmails

  const [emails, setEmails] = useState<Email[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [loading, setLoading] = useState(!isDemo)
  const [sortCol, setSortCol] = useState<SortCol>('received_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleSearchChange(value: string) {
    setSearch(value)
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(value)
      setPage(1)
    }, 300)
  }

  function clearSearch() {
    setSearch('')
    setDebouncedSearch('')
    setPage(1)
  }

  function handleSort(col: SortCol) {
    if (col === sortCol) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir(col === 'received_at' ? 'desc' : 'asc')
    }
  }

  // Live mode: fetch from API
  useEffect(() => {
    if (isDemo) return
    setLoading(true)
    api.get('/emails', { params: { page, limit: PAGE_SIZE, search: debouncedSearch } })
      .then(r => {
        setEmails(r.data.emails)
        setTotal(r.data.total)
      })
      .finally(() => setLoading(false))
  }, [page, debouncedSearch, isDemo])

  // Demo mode: filter and paginate staticEmails client-side
  const displayEmails = isDemo ? (() => {
    const q = debouncedSearch.toLowerCase()
    const filtered = q
      ? staticEmails!.filter(e =>
          (e.from_name || '').toLowerCase().includes(q) ||
          e.from_address.toLowerCase().includes(q) ||
          e.subject.toLowerCase().includes(q)
        )
      : staticEmails!

    const sorted = [...filtered].sort((a, b) => {
      let av: string, bv: string
      if (sortCol === 'received_at') { av = a.received_at; bv = b.received_at }
      else if (sortCol === 'sender') {
        av = (a.sender || a.from_name || a.from_address).toLowerCase()
        bv = (b.sender || b.from_name || b.from_address).toLowerCase()
      } else {
        av = (a.subject || '').toLowerCase()
        bv = (b.subject || '').toLowerCase()
      }
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })

    return { all: sorted, page: sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), total: sorted.length }
  })() : null

  const sorted = isDemo ? displayEmails!.page : [...emails].sort((a, b) => {
    let av: string, bv: string
    if (sortCol === 'received_at') { av = a.received_at; bv = b.received_at }
    else if (sortCol === 'sender') {
      av = (a.sender || a.from_name || a.from_address).toLowerCase()
      bv = (b.sender || b.from_name || b.from_address).toLowerCase()
    } else {
      av = (a.subject || '').toLowerCase()
      bv = (b.subject || '').toLowerCase()
    }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  const effectiveTotal = isDemo ? displayEmails!.total : total
  const totalPages = Math.ceil(effectiveTotal / PAGE_SIZE)

  const thClass = "px-4 py-2.5 font-semibold text-left select-none cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      {/* Header + search */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide shrink-0">All Emails</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-0.5 font-medium shrink-0">{effectiveTotal}</span>
        <div className="relative flex-1 max-w-sm ml-auto">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            placeholder="Search sender or subject…"
            className="w-full pl-8 pr-8 py-1.5 text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
          />
          {search && (
            <button
              onClick={clearSearch}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500" />
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-12 text-center">
            {debouncedSearch ? 'No emails match your search' : 'No emails yet'}
          </p>
        ) : (
          <table className="w-full text-sm min-w-[600px]">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                <th className={`${thClass} w-28`} onClick={() => handleSort('received_at')}>
                  <span className="flex items-center gap-1">Date <SortIcon col="received_at" sortCol={sortCol} sortDir={sortDir} /></span>
                </th>
                <th className={`${thClass} w-40`} onClick={() => handleSort('sender')}>
                  <span className="flex items-center gap-1">Sender <SortIcon col="sender" sortCol={sortCol} sortDir={sortDir} /></span>
                </th>
                <th className={thClass} onClick={() => handleSort('subject')}>
                  <span className="flex items-center gap-1">Subject <SortIcon col="subject" sortCol={sortCol} sortDir={sortDir} /></span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(email => (
                <tr
                  key={email.id}
                  onClick={() => onEmailClick(email.id)}
                  className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs font-mono">
                    {format(new Date(email.received_at), 'd MMM yy')}
                  </td>
                  <td className="px-4 py-3 max-w-[160px] truncate text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-xs" title={email.from_address}>
                    {email.sender || email.from_name || email.from_address}
                  </td>
                  <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {email.subject || '(no subject)'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <span className="text-xs text-slate-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 transition-colors"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
