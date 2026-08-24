import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { notificationsService } from './api'
import { useAuth } from './AuthContext'

const NotificationContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(() => {
    if (!user) return
    notificationsService
      .unreadCount()
      .then(({ data }) => setUnreadCount(data.unread_count))
      .catch(() => {})
  }, [user])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 60000) // poll every minute
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <NotificationContext.Provider value={{ unreadCount, refresh }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider')
  return ctx
}
