import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Home, User, Building2, Sun, Moon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import TaskTable, { type Task } from '../components/TaskTable'
import EmailModal from '../components/EmailModal'
import RecentEmails from '../components/RecentEmails'
import api from '../api/client'

type TabId = 'home' | 'thomas' | 'matthew' | 'household'

const tabs: { id: TabId; label: string; icon: React.ReactNode; category?: string }[] = [
  { id: 'home', label: 'Home', icon: <Home size={16} /> },
  { id: 'thomas', label: 'Thomas', icon: <User size={16} />, category: 'Thomas' },
  { id: 'matthew', label: 'Matthew', icon: <User size={16} />, category: 'Matthew' },
  { id: 'household', label: 'Household', icon: <Building2 size={16} />, category: 'Household' },
]

function TaskPanel({ title, tasks, onRowClick }: { title: string; tasks: Task[]; onRowClick: (t: Task) => void }) {
  return (
    <div className="bg-slate-800 dark:bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <h2 className="font-semibold text-slate-100 text-sm tracking-wide">{title}</h2>
        <span className="text-xs text-slate-400 bg-slate-700 rounded-full px-2.5 py-0.5 font-medium">{tasks.length}</span>
      </div>
      <div className="p-4">
        <TaskTable tasks={tasks} onRowClick={onRowClick} />
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

  const actionTasks = tasks.filter(t => !t.is_fyi_only && t.status !== 'done')
  const fyiTasks = tasks.filter(t => t.is_fyi_only)

  async function handleEmailClick(emailId: number) {
    const r = await api.get(`/emails/${emailId}`)
    const email = r.data
    setSelectedTask({
      id: 0, email_id: emailId, summary: '', action: null, due_date: null,
      is_fyi_only: true, status: 'pending', assignee_name: null,
      categories: null, tags: null,
      from_address: email.from_address, from_name: email.from_name,
      subject: email.subject, received_at: email.received_at,
      body_text: email.body_text, body_html: email.body_html,
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 dark:bg-slate-950 flex flex-col" style={{ backgroundColor: dark ? '#0f172a' : '#f8fafc' }}>

      {/* Header */}
      <header className="bg-slate-800 dark:bg-slate-800 border-b border-slate-700 sticky top-0 z-30 shadow-lg" style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderColor: dark ? '#334155' : '#e2e8f0' }}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-orange-500 font-bold text-lg tracking-tight">Family</span>
            <span className="font-bold text-lg tracking-tight" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Hub</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm hidden sm:block" style={{ color: dark ? '#94a3b8' : '#64748b' }}>{user?.name}</span>
            <button onClick={toggle} className="p-1.5 rounded-lg transition-colors hover:bg-slate-700" style={{ color: dark ? '#94a3b8' : '#64748b' }}>
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button onClick={handleLogout} className="p-1.5 rounded-lg transition-colors hover:bg-slate-700" style={{ color: dark ? '#94a3b8' : '#64748b' }}>
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
                  : 'border-transparent hover:border-slate-600'
              }`}
              style={{ color: activeTab === tab.id ? '#f97316' : dark ? '#94a3b8' : '#64748b' }}
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
            <TaskPanel title="Actions Required" tasks={actionTasks} onRowClick={setSelectedTask} />
            <TaskPanel title="FYI Only" tasks={fyiTasks} onRowClick={setSelectedTask} />

            {activeTab === 'home' && (
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden shadow-sm" style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderColor: dark ? '#334155' : '#e2e8f0' }}>
                <div className="px-4 py-3 border-b border-slate-700" style={{ borderColor: dark ? '#334155' : '#e2e8f0' }}>
                  <h2 className="font-semibold text-sm tracking-wide" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Recent Emails</h2>
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 border-t z-30" style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderColor: dark ? '#334155' : '#e2e8f0' }}>
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-colors"
              style={{ color: activeTab === tab.id ? '#f97316' : dark ? '#64748b' : '#94a3b8' }}
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
    </div>
  )
}
