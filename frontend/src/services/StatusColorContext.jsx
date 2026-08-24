import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { statusColorService } from './api'
import { useAuth } from './AuthContext'

const StatusColorContext = createContext(null)

function applyToDocument(colors) {
  Object.entries(colors).forEach(([statusKey, hex]) => {
    document.documentElement.style.setProperty(`--status-color-${statusKey}`, hex)
  })
}

export function StatusColorProvider({ children }) {
  const { user } = useAuth()
  const [colors, setColors] = useState({})
  const [defaults, setDefaults] = useState({})

  const refresh = useCallback(() => {
    if (!user) return
    statusColorService
      .get()
      .then(({ data }) => {
        setColors(data.colors)
        setDefaults(data.defaults)
        applyToDocument(data.colors)
      })
      .catch(() => {})
  }, [user])

  useEffect(refresh, [refresh])

  return (
    <StatusColorContext.Provider value={{ colors, defaults, refresh }}>
      {children}
    </StatusColorContext.Provider>
  )
}

export function useStatusColors() {
  const ctx = useContext(StatusColorContext)
  if (!ctx) throw new Error('useStatusColors must be used within a StatusColorProvider')
  return ctx
}
