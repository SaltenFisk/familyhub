import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, User, Sun, Moon, Check, Send, X, ChevronDown } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import TaskTable, { type Task } from '../components/TaskTable'
import AboutModal from '../components/AboutModal'
import Badge from '../components/Badge'
import { format } from 'date-fns'
import * as Dialog from '@radix-ui/react-dialog'
import { DEMO_TASKS, DEMO_EMAILS, DEMO_EMAIL_BODIES, DEMO_USER, DEMO_FAMILY } from '../demo/mockData'

type TabId = 'home' | 'bea' | 'mark' | 'hope' | 'charles'

const tabs: { id: TabId; label: string; icon: React.ReactNode; category?: string }[] = [
  { id: 'home', label: 'Home', icon: <Home size={16} /> },
  { id: 'bea', label: 'Bea', icon: <User size={16} />, category: 'Bea' },
  { id: 'mark', label: 'Mark', icon: <User size={16} />, category: 'Mark' },
  { id: 'hope', label: 'Hope', icon: <User size={16} />, category: 'Hope' },
  { id: 'charles', label: 'Charles', icon: <User size={16} />, category: 'Charles' },
]

const categoryColour: Record<string, 'blue' | 'purple' | 'green' | 'amber'> = {
  Bea: 'green', Mark: 'amber', Hope: 'blue', Charles: 'purple',
}

function TaskPanel({ title, tasks, onRowClick, showAction = false }: { title: string; tasks: Task[]; onRowClick: (t: Task) => void; showAction?: boolean }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide">{title}</h2>
        <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 rounded-full px-2.5 py-0.5 font-medium">{tasks.length}</span>
      </div>
      <div className="p-4">
        <TaskTable tasks={tasks} onRowClick={onRowClick} showAction={showAction} />
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
  const assignRef = useRef<HTMLDivElement>(null)

  const filteredTasks = activeTab === 'home'
    ? tasks
    : tasks.filter(t => t.categories?.includes(tabs.find(tb => tb.id === activeTab)?.category || ''))

  const actionTasks = filteredTasks.filter(t => !t.is_fyi_only && t.status !== 'done')
  const fyiTasks = filteredTasks.filter(t => t.is_fyi_only)

  function handleRowClick(task: Task) {
    setShowAssignPicker(false)
    setSelectedTask(task)
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

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">
      {/* Demo banner */}
      <div className="bg-orange-500 text-white text-xs text-center py-1.5 font-medium">
        Demo mode — sample data only.{' '}
        <button onClick={() => navigate('/login')} className="underline hover:no-underline">
          Sign in with a real account
        </button>
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
        <TaskPanel title="Actions Required" tasks={actionTasks} onRowClick={handleRowClick} showAction />
        <TaskPanel title="FYI Only" tasks={fyiTasks} onRowClick={handleRowClick} />

        {activeTab === 'home' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide">Recent Emails</h2>
            </div>
            <div className="p-4 divide-y divide-slate-100 dark:divide-slate-700/50">
              {DEMO_EMAILS.map(email => (
                <button key={email.id} onClick={() => {
                  const task = tasks.find(t => t.email_id === email.id)
                  if (task) handleRowClick(task)
                }}
                  className="w-full text-left px-0 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors flex items-start gap-3 group">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-orange-500 transition-colors">{email.subject}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{email.from_name || email.from_address}</p>
                  </div>
                  <span className="text-xs text-slate-400 font-mono whitespace-nowrap shrink-0 pt-0.5">
                    {format(new Date(email.received_at), 'd MMM')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

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

                {/* Assignee picker */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="font-medium text-slate-400">Assigned to:</span>
                  <div className="relative" ref={assignRef}>
                    <button
                      onClick={() => setShowAssignPicker(p => !p)}
                      className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-600 dark:text-orange-400 hover:bg-orange-500/30 transition-colors"
                    >
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
