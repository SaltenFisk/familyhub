import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import DemoDashboard from './pages/DemoDashboard'
import FeatureRef from './pages/FeatureRef'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <HashRouter>
      <ThemeProvider>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/demo" element={<DemoDashboard />} />
          <Route path="/ref" element={<RequireAuth><FeatureRef /></RequireAuth>} />
          <Route path="/*" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  )
}
