import { createContext, useContext, useEffect, useState } from 'react'
import { authService } from './api'
import { getToken, setTokens, clearTokens, getRememberedUsername, setRememberedUsername } from './tokenStorage'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = getToken('access_token')
    if (!token) {
      setLoading(false)
      return
    }
    authService
      .me()
      .then(({ data }) => setUser(data))
      .catch(() => clearTokens())
      .finally(() => setLoading(false))
  }, [])

  const login = async (username, password, remember = true) => {
    const { data } = await authService.login(username, password)
    setTokens({ access: data.access, refresh: data.refresh }, remember)
    setRememberedUsername(username, remember)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    clearTokens()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}

export { getRememberedUsername }
