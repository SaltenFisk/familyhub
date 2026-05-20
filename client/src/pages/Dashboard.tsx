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
  { id: 'home', label: 'Home', icon: <Home size={18} /> },
  { id: 'thomas', label: 'Thomas', icon: <User size={18} />, category: 'Thomas' },
  { id: 'matthew', label: 'Matthew', icon: <User size={18} />, category: 'Matthew' },
  { id: 'household', label: 'Household', icon: <Building2 size={18} />, category: 'Household' },
]

function TaskPanel({ title, tasks, onRowClick }: { title: string; tasks: Task[]; onRowClick: (t: Task) => void }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">{title}</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-full px-2 py-0.5">{tasks.length}</span>
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

  useEffect(() => {
    setLoading(true)
    const params: Record<string, string> = {}
    if (currentTab.category) params.category = currentTab.category
    api.get('/tasks', { params })
      .then(r => setTasks(r.data))
      .finally(() => setLoading(false))
  }, [activeTab])

  function handleLogout() {
    logout()
    navigate('/login')
  }

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col transition-colors">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <h1 className="font-bold text-gray-800 dark:text-white text-base">FamilyHub</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{user?.name}</span>
            <button onClick={toggle} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200">
              {dark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Desktop tabs */}
        <div className="hidden md:flex max-w-7xl mx-auto px-4 gap-1 pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 pb-24 md:pb-6 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <>
            <TaskPanel title="Actions Required" tasks={actionTasks} onRowClick={setSelectedTask} />
            <TaskPanel title="FYI Only" tasks={fyiTasks} onRowClick={setSelectedTask} />

            {activeTab === 'home' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h2 className="font-semibold text-gray-700 dark:text-gray-200 text-sm">Recent Emails</h2>
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
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-30">
        <div className="flex">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                activeTab === tab.id ? 'text-blue-600' : 'text-gray-400 dark:text-gray-500'
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
          const params: Record<string, string> = {}
          if (currentTab.category) params.category = currentTab.category
          api.get('/tasks', { params }).then(r => setTasks(r.data))
        }}
      />
    </div>
  )
}
