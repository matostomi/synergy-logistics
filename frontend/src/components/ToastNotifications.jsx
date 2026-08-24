import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsService } from '../services/api'
import { useNotifications } from '../services/NotificationContext'
import { useAuth } from '../services/AuthContext'
import { notifMeta } from '../notificationTypes'

const POLL_SECONDS = 20
const AUTO_DISMISS_MS = 7000
const MAX_TOASTS_PER_POLL = 3

export default function ToastNotifications() {
  const [toasts, setToasts] = useState([])
  const seenIds = useRef(new Set())
  const isFirstPoll = useRef(true)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { refresh: refreshBell } = useNotifications()

  const poll = useCallback(() => {
    if (!user) return
    notificationsService
      .list({ is_read: false })
      .then(({ data }) => {
        const items = data.results ?? data

        if (isFirstPoll.current) {
          // On first load, don't flood with the whole backlog — but do show
          // the single most recent unread one, so something visibly happens
          // right away instead of only ever reacting to future changes.
          items.forEach((n) => seenIds.current.add(n.id))
          isFirstPoll.current = false
          if (items.length > 0) {
            const mostRecent = items[0]
            setToasts((prev) => [...prev, { ...mostRecent, _toastKey: `${mostRecent.id}-${Date.now()}` }])
          }
          return
        }

        const freshOnes = items.filter((n) => !seenIds.current.has(n.id))
        if (freshOnes.length === 0) return

        freshOnes.forEach((n) => seenIds.current.add(n.id))
        const toShow = freshOnes.slice(0, MAX_TOASTS_PER_POLL)

        setToasts((prev) => [...prev, ...toShow.map((n) => ({ ...n, _toastKey: `${n.id}-${Date.now()}` }))])
        refreshBell()
      })
      .catch(() => {})
  }, [refreshBell])

  useEffect(() => {
    poll() // establish baseline immediately
    const interval = setInterval(poll, POLL_SECONDS * 1000)
    return () => clearInterval(interval)
  }, [poll])

  const dismiss = (toastKey) => {
    setToasts((prev) => prev.filter((t) => t._toastKey !== toastKey))
  }

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      setTimeout(() => dismiss(t._toastKey), AUTO_DISMISS_MS)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  const handleClick = async (toast) => {
    dismiss(toast._toastKey)
    try {
      await notificationsService.markRead(toast.id)
      refreshBell()
    } catch {
      // non-fatal
    }
    if (toast.shipment) navigate(`/shipments/${toast.shipment}`)
  }

  if (toasts.length === 0) return null

  return (
    <div className="toast-stack">
      {toasts.map((t) => {
        const meta = notifMeta(t.notif_type)
        return (
          <div key={t._toastKey} className="toast-card" onClick={() => handleClick(t)}>
            <div className="toast-icon"><meta.Icon size={18} /></div>
            <div className="toast-body">
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-message">{t.message}</div>}
            </div>
            <button
              className="toast-close"
              onClick={(e) => { e.stopPropagation(); dismiss(t._toastKey) }}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )
      })}
    </div>
  )
}
