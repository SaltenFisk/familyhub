import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, Sun, Moon, Check, Send, X, ChevronDown, Archive, ChevronUp, ChevronRight, ChevronLeft, Paperclip } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import TaskTable, { type Task } from '../components/TaskTable'
import AboutModal from '../components/AboutModal'
import Badge from '../components/Badge'
import { format } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { DEMO_TASKS, DEMO_EMAILS, DEMO_EMAIL_BODIES, DEMO_USER, DEMO_FAMILY } from '../demo/mockData'

type TabId = 'home' | 'archive'
type SortCol = 'received_at' | 'sender' | 'subject'
type SortDir = 'asc' | 'desc'

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: <Home size={16} /> },
  { id: 'archive', label: 'Archive', icon: <Archive size={16} /> },
]

const categoryColour: Record<string, 'blue' | 'purple' | 'green' | 'amber'> = {
  Jill: 'green', Mark: 'amber', Hope: 'blue', Charles: 'purple',
}


function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: SortDir }) {
  if (col !== sortCol) return <ChevronUp size={12} className="opacity-20" />
  return sortDir === 'asc' ? <ChevronUp size={12} className="text-orange-500" /> : <ChevronDown size={12} className="text-orange-500" />
}

function TaskPanel({ title, tasks, onRowClick, onDismiss, showAction = false, showEvent = false }: {
  title: string; tasks: Task[]; onRowClick: (t: Task) => void; onDismiss?: (t: Task) => void; showAction?: boolean; showEvent?: boolean
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{title}</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-0.5 font-medium">{tasks.length}</span>
      </div>
      <div className="p-4">
        <TaskTable tasks={tasks} onRowClick={onRowClick} onDismiss={onDismiss} showAction={showAction} showEvent={showEvent} />
      </div>
    </div>
  )
}

export default function DemoDashboard() {
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [demoComment, setDemoComment] = useState('')
  const [showAssignPicker, setShowAssignPicker] = useState(false)
  const [filterWho, setFilterWho] = useState<string | null>(null)
  const [filterAssignee, setFilterAssignee] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<SortCol>('received_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [archivePage, setArchivePage] = useState(1)
  const assignRef = useRef<HTMLDivElement>(null)

  const today = new Date(); today.setHours(0, 0, 0, 0)

  const whoNames = [...new Set(tasks.flatMap(t => t.categories?.split(',').map(c => c.trim()) ?? []))].sort()
  const assigneeNames = [...new Set(tasks.map(t => t.assignee_name).filter(Boolean) as string[])].sort()

  const filtered = tasks.filter(t => {
    if (filterWho && !t.categories?.split(',').map(c => c.trim()).includes(filterWho)) return false
    if (filterAssignee === '__unassigned__' && t.assignee_name) return false
    if (filterAssignee && filterAssignee !== '__unassigned__' && t.assignee_name !== filterAssignee) return false
    return true
  })

  const byDate = (a: Task, b: Task, field: 'due_date' | 'event_date') => {
    const da = a[field] ? new Date(a[field]!).getTime() : Infinity
    const db = b[field] ? new Date(b[field]!).getTime() : Infinity
    return da - db
  }

  const actionTasks = filtered
    .filter(t => !t.is_fyi_only && !t.is_upcoming && t.status !== 'done')
    .sort((a, b) => byDate(a, b, 'due_date'))
  const upcomingTasks = filtered
    .filter(t => t.is_upcoming && t.event_date && new Date(t.event_date) >= today)
    .sort((a, b) => byDate(a, b, 'event_date'))
  const fyiTasks = filtered.filter(t => t.is_fyi_only)

  function handleRowClick(task: Task) {
    setShowAssignPicker(false)
    setSelectedTask(task)
  }

  function handleDismiss(task: Task) {
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  function handleStatusChange(newStatus: string) {
    if (!selectedTask) return
    const updated = { ...selectedTask, status: newStatus }
    setSelectedTask(updated)
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
  }

  function handleAssign(name: string) {
    if (!selectedTask) return
    const updated = { ...selectedTask, assignee_name: name || null }
    setSelectedTask(updated)
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setShowAssignPicker(false)
  }

  const emailBody = selectedTask ? DEMO_EMAIL_BODIES[selectedTask.email_id] : null

  // Archive tab
  const ARCHIVE_PAGE_SIZE = 20
  const archiveEmails = [...DEMO_EMAILS].sort((a, b) => {
    let av: string, bv: string
    if (sortCol === 'received_at') { av = a.received_at; bv = b.received_at }
    else if (sortCol === 'sender') { av = (a.from_name || a.from_address).toLowerCase(); bv = (b.from_name || b.from_address).toLowerCase() }
    else { av = a.subject.toLowerCase(); bv = b.subject.toLowerCase() }
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })
  const archiveTotalPages = Math.ceil(archiveEmails.length / ARCHIVE_PAGE_SIZE)
  const archivePage_ = archiveEmails.slice((archivePage - 1) * ARCHIVE_PAGE_SIZE, archivePage * ARCHIVE_PAGE_SIZE)

  function handleArchiveSort(col: SortCol) {
    if (col === sortCol) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir(col === 'received_at' ? 'desc' : 'asc') }
  }

  const thClass = "px-4 py-2.5 font-semibold text-left select-none cursor-pointer hover:text-slate-600 dark:hover:text-slate-300 transition-colors"

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Demo banner */}
      <div className="bg-orange-500 text-white text-xs text-center py-1.5 font-medium">
        Demo mode — sample data only.{' '}
        <button onClick={() => navigate('/login')} className="underline hover:no-underline">Sign in with a real account</button>
      </div>

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="text-orange-500 font-bold text-lg tracking-tight">Family</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold text-lg tracking-tight">Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{DEMO_USER.name}</span>
            <AboutModal />
            <button onClick={toggle} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Toggle theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={() => navigate('/login')} className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div className="hidden md:flex max-w-7xl mx-auto px-4 gap-0">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6 space-y-5">
        {activeTab === 'archive' ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide">All Emails</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-0.5 font-medium">{DEMO_EMAILS.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[600px]">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <th className={`${thClass} w-28`} onClick={() => handleArchiveSort('received_at')}>
                      <span className="flex items-center gap-1">Date <SortIcon col="received_at" sortCol={sortCol} sortDir={sortDir} /></span>
                    </th>
                    <th className={`${thClass} w-40`} onClick={() => handleArchiveSort('sender')}>
                      <span className="flex items-center gap-1">Sender <SortIcon col="sender" sortCol={sortCol} sortDir={sortDir} /></span>
                    </th>
                    <th className={thClass} onClick={() => handleArchiveSort('subject')}>
                      <span className="flex items-center gap-1">Subject <SortIcon col="subject" sortCol={sortCol} sortDir={sortDir} /></span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {archivePage_.map(email => (
                    <tr key={email.id} onClick={() => { const task = tasks.find(t => t.email_id === email.id); if (task) handleRowClick(task) }}
                      className="border-b border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors group">
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs font-mono">{format(new Date(email.received_at), 'd MMM yy')}</td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-xs">{email.from_name || email.from_address}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 text-xs group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{email.subject}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {archiveTotalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
                <button onClick={() => setArchivePage(p => Math.max(1, p - 1))} disabled={archivePage === 1}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 transition-colors">
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className="text-xs text-slate-400">{archivePage} / {archiveTotalPages}</span>
                <button onClick={() => setArchivePage(p => Math.min(archiveTotalPages, p + 1))} disabled={archivePage === archiveTotalPages}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-40 transition-colors">
                  Next <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Filter bar */}
            {(whoNames.length > 0 || assigneeNames.length > 0) && (
              <div className="flex flex-wrap gap-4 items-center">
                {whoNames.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Who</span>
                    <div className="flex flex-wrap gap-1">
                      {whoNames.map(name => (
                        <button key={name} onClick={() => setFilterWho(f => f === name ? null : name)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterWho === name ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-700'}`}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {assigneeNames.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide">Assignee</span>
                    <div className="flex flex-wrap gap-1">
                      <button onClick={() => setFilterAssignee(f => f === '__unassigned__' ? null : '__unassigned__')}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterAssignee === '__unassigned__' ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-700'}`}>
                        Unassigned
                      </button>
                      {assigneeNames.map(name => (
                        <button key={name} onClick={() => setFilterAssignee(f => f === name ? null : name)}
                          className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filterAssignee === name ? 'bg-orange-500 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-orange-300 dark:hover:border-orange-700'}`}>
                          {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            <TaskPanel title="Actions Required" tasks={actionTasks} onRowClick={handleRowClick} onDismiss={handleDismiss} showAction />
            <TaskPanel title="Upcoming" tasks={upcomingTasks} onRowClick={handleRowClick} onDismiss={handleDismiss} showEvent />
            <TaskPanel title="Info" tasks={fyiTasks} onRowClick={handleRowClick} onDismiss={handleDismiss} />
          </>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30">
        <div className="flex">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${activeTab === tab.id ? 'text-orange-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Demo task modal */}
      <Dialog.Root open={!!selectedTask} onOpenChange={o => { if (!o) { setSelectedTask(null); setShowAssignPicker(false) } }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/60 z-40" />
          <Dialog.Content className="fixed inset-x-4 top-4 bottom-4 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-[720px] md:top-8 md:bottom-8 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 z-50 flex flex-col overflow-hidden">

            <div className="flex items-start justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex-1 min-w-0 pr-4">
                <Dialog.Title className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-tight truncate">
                  {selectedTask?.subject}
                </Dialog.Title>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedTask?.from_name ? `${selectedTask.from_name} <${selectedTask.from_address}>` : selectedTask?.from_address}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedTask?.categories?.split(',').map(c => (
                    <Badge key={c} label={c.trim()} variant={categoryColour[c.trim()] || 'gray'} />
                  ))}
                  {selectedTask?.tags?.split(',').map(t => (
                    <Badge key={t} label={t.trim()} variant="gray" />
                  ))}
                </div>
              </div>
              <Dialog.Close asChild>
                <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0 transition-colors"><X size={20} /></button>
              </Dialog.Close>
            </div>

            {selectedTask && (
              <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-2 text-xs">
                {selectedTask.summary && <p><span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedTask.summary}</span></p>}
                {selectedTask.action && <p><span className="font-semibold text-orange-500 dark:text-orange-400 uppercase tracking-wider">Action</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedTask.action}</span></p>}
                {selectedTask.due_date && <p><span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Due</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedTask.due_date}</span></p>}
                {selectedTask.event_date && <p><span className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Event date</span><br /><span className="text-slate-700 dark:text-slate-300 mt-0.5 block">{selectedTask.event_date}</span></p>}

                <div className="flex items-center gap-2 pt-1">
                  <span className="font-medium text-slate-400">Assigned to:</span>
                  <div className="relative" ref={assignRef}>
                    <button onClick={() => setShowAssignPicker(p => !p)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30 transition-colors">
                      {selectedTask.assignee_name || 'Unassigned'}
                      <ChevronDown size={10} />
                    </button>
                    {showAssignPicker && (
                      <div className="absolute top-7 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl z-10 w-44 overflow-hidden">
                        <div className="py-1">
                          <button onClick={() => handleAssign('')}
                            className="w-full text-left px-3 py-2 text-xs text-slate-400 dark:text-slate-500 italic hover:bg-slate-100 dark:hover:bg-slate-700">
                            Unassigned
                          </button>
                          {DEMO_FAMILY.map(member => (
                            <button key={member.id} onClick={() => handleAssign(member.name)}
                              className="w-full text-left px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-between transition-colors">
                              {member.name}
                              {selectedTask.assignee_name === member.name && <Check size={12} className="text-orange-500" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Demo attachment indicator */}
            {selectedTask?.email_id === 2 && (
              <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-2">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-xs text-slate-500 dark:text-slate-400">
                  <Paperclip size={12} /> summer-camp-kit-list.pdf <span className="text-slate-400 dark:text-slate-500">(demo)</span>
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              <pre className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed">
                {emailBody?.body_text || 'No content'}
              </pre>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 space-y-3 max-h-36 overflow-y-auto">
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-1">No comments (demo)</p>
              <div className="flex gap-2 pt-1">
                <input type="text" value={demoComment} onChange={e => setDemoComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-300 placeholder-slate-400 dark:placeholder-slate-600 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500" />
                <button onClick={() => setDemoComment('')} disabled={!demoComment.trim()}
                  className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 disabled:opacity-40 transition-colors">
                  <Send size={14} />
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Type:</label>
                  <div className="flex gap-2">
                    {(['Action', 'Upcoming', 'Info'] as const).map(label => {
                      const active = label === 'Action' ? (!selectedTask?.is_fyi_only && !selectedTask?.is_upcoming)
                        : label === 'Upcoming' ? !!selectedTask?.is_upcoming
                        : !!selectedTask?.is_fyi_only
                      return (
                        <button key={label} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${active ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                {!selectedTask?.is_fyi_only && !selectedTask?.is_upcoming && (
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Status:</label>
                    <div className="flex gap-2">
                      {[{ value: 'pending', label: 'Pending' }, { value: 'in_progress', label: 'In Progress' }, { value: 'done', label: 'Done' }].map(o => (
                        <button key={o.value} onClick={() => handleStatusChange(o.value)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedTask?.status === o.value ? 'bg-orange-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}`}>
                          {o.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Dialog.Close asChild>
                  <button className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">Close</button>
                </Dialog.Close>
                <Dialog.Close asChild>
                  <button className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium">Save</button>
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  )
}
