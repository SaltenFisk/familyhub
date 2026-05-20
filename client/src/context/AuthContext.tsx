import { createContext, useContext, useState, type ReactNode } from 'react'
import api from '../api/client'

interface User { id: number; name: string; email: string; role: 'admin' | 'child' }
interface AuthCtx { user: User | null; login: (email: string, password: string) => Promise<void>; logout: () => void }

const AuthContext = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('fh_user')
    return stored ? JSON.parse(stored) : null
  })

  async function login(email: string, password: string) {
    const { data } = await api.post('/auth/login', { email, password })
    localStorage.setItem('fh_token', data.token)
    localStorage.setItem('fh_user', JSON.stringify(data.user))
    setUser(data.user)
  }

  function logout() {
    localStorage.removeItem('fh_token')
    localStorage.removeItem('fh_user')
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
