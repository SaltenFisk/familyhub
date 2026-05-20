import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, User, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import TaskTable, { type Task } from '../components/TaskTable'
import EmailModal from '../components/EmailModal'
import RecentEmails from '../components/RecentEmails'
import FeedbackModal from '../components/FeedbackModal'
import ApiErrorBanner from '../components/ApiErrorBanner'
import api from '../api/client'

type TabId = 'home' | 'darren' | 'lorraine' | 'thomas' | 'matthew'

const tabs: { id: TabId; label: string; icon: React.ReactNode; category?: string }[] = [
  { id: 'home', label: 'Home', icon: <Home size={16} /> },
  { id: 'darren', label: 'Darren', icon: <User size={16} />, category: 'Darren' },
  { id: 'lorraine', label: 'Lorraine', icon: <User size={16} />, category: 'Lorraine' },
  { id: 'thomas', label: 'Thomas', icon: <User size={16} />, category: 'Thomas' },
  { id: 'matthew', label: 'Matthew', icon: <User size={16} />, category: 'Matthew' },
]

function TaskPanel({ title, tasks, onRowClick, onDismiss, showAction = false, showEvent = false }: { title: string; tasks: Task[]; onRowClick: (t: Task) => void; onDismiss?: (t: Task) => void; showAction?: boolean; showEvent?: boolean }) {
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

export default function Dashboard() {
  const { user, logout } = useAuth()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<TabId>('home')
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)

  const currentTab = tabs.find(t => t.id === activeTab)!

  function loadTasks(tab = currentTab) {
    setLoading(true)
    const params: Record<string, string> = {}
    if (tab.category) params.category = tab.category
    api.get('/tasks', { params })
      .then(r => setTasks(r.data))
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadTasks(currentTab) }, [activeTab])

  function handleLogout() { logout(); navigate('/login') }

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const actionTasks = tasks.filter(t => !t.is_fyi_only && !t.is_upcoming && t.status !== 'done')
  const upcomingTasks = tasks.filter(t => t.is_upcoming && t.event_date && new Date(t.event_date) >= today)
  const fyiTasks = tasks.filter(t => t.is_fyi_only)

  async function handleDismiss(task: Task) {
    await api.delete(`/tasks/${task.id}`)
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  async function handleEmailClick(emailId: number) {
    const r = await api.get(`/emails/${emailId}`)
    const email = r.data
    setSelectedTask({
      id: 0, email_id: emailId, summary: '', action: null, due_date: null,
      is_fyi_only: true, is_upcoming: false, event_date: null, status: 'pending', assignee_name: null,
      categories: null, tags: null, sender: email.sender || null,
      from_address: email.from_address, from_name: email.from_name,
      subject: email.subject, received_at: email.received_at,
      body_text: email.body_text, body_html: email.body_html,
    })
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-1">
            <span className="text-orange-500 font-bold text-lg tracking-tight">Family</span>
            <span className="text-slate-900 dark:text-slate-100 font-bold text-lg tracking-tight">Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 dark:text-slate-400 hidden sm:block">{user?.name}</span>
            <FeedbackModal />
            <button
              onClick={toggle}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
          </div>
        ) : (
          <>
            <TaskPanel title="Actions Required" tasks={actionTasks} onRowClick={setSelectedTask} onDismiss={handleDismiss} showAction />
            <TaskPanel title="Upcoming" tasks={upcomingTasks} onRowClick={setSelectedTask} onDismiss={handleDismiss} showEvent />
            <TaskPanel title="Info" tasks={fyiTasks} onRowClick={setSelectedTask} onDismiss={handleDismiss} />

            {activeTab === 'home' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                  <h2 className="font-semibold text-slate-800 dark:text-slate-100 text-sm tracking-wide">Recent Emails</h2>
                </div>
                <div className="p-4">
                  <RecentEmails onEmailClick={handleEmailClick} />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-30">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'text-orange-500'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      <EmailModal
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onUpdated={() => {
          setSelectedTask(null)
          loadTasks()
        }}
      />
      <ApiErrorBanner />
    </div>
  )
}
