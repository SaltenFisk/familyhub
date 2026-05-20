import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Login() {
  const { login } = useAuth()
  const { dark } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: dark ? '#0f172a' : '#f8fafc' }}>
      <div className="w-full max-w-sm rounded-2xl shadow-2xl p-8 border" style={{ backgroundColor: dark ? '#1e293b' : '#ffffff', borderColor: dark ? '#334155' : '#e2e8f0' }}>
        <div className="mb-8">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-orange-500 font-bold text-2xl tracking-tight">Family</span>
            <span className="font-bold text-2xl tracking-tight" style={{ color: dark ? '#f1f5f9' : '#0f172a' }}>Hub</span>
          </div>
          <p className="text-sm" style={{ color: dark ? '#64748b' : '#94a3b8' }}>Sign in to your account</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: dark ? '#64748b' : '#94a3b8' }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              style={{ backgroundColor: dark ? '#0f172a' : '#f8fafc', borderColor: dark ? '#334155' : '#e2e8f0', color: dark ? '#f1f5f9' : '#0f172a' }}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: dark ? '#64748b' : '#94a3b8' }}>Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full rounded-lg px-3 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-orange-500 transition-colors"
              style={{ backgroundColor: dark ? '#0f172a' : '#f8fafc', borderColor: dark ? '#334155' : '#e2e8f0', color: dark ? '#f1f5f9' : '#0f172a' }}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50 transition-colors mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
