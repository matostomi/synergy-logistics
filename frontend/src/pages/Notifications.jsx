import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { notificationsService } from '../services/api'
import { useNotifications } from '../services/NotificationContext'
import { NOTIF_TYPES, notifMeta } from '../notificationTypes'

export default function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [error, setError] = useState('')
  const [activeType, setActiveType] = useState('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [checking, setChecking] = useState(false)
  const navigate = useNavigate()
  const { refresh: refreshBell } = useNotifications()

  const load = () => {
    const params = {}
    if (activeType) params.notif_type = activeType
    if (unreadOnly) params.is_read = false
    notificationsService
      .list(params)
      .then(({ data }) => setNotifications(data.results ?? data))
      .catch(() => setError('Could not load notifications.'))
  }

  useEffect(load, [activeType, unreadOnly])

  const handleCardClick = async (n) => {
    if (!n.is_read) {
      try {
        await notificationsService.markRead(n.id)
        refreshBell()
      } catch {
        // non-fatal — still navigate
      }
    }
    if (n.shipment) navigate(`/shipments/${n.shipment}`)
    else load()
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllRead(activeType ? { notif_type: activeType } : undefined)
      load()
      refreshBell()
    } catch {
      setError('Could not mark notifications as read.')
    }
  }

  const handleCheckDelays = async () => {
    setChecking(true)
    setError('')
    try {
      await notificationsService.checkDelays()
      load()
      refreshBell()
    } catch {
      setError('Could not check for delays.')
    } finally {
      setChecking(false)
    }
  }

  return (
    <>
      <div className="topline">Alerts</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Notification Center</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleCheckDelays} disabled={checking}>
            {checking ? 'Checking…' : <><Timer size={15} /> Check for Delays</>}
          </button>
          <button className="btn secondary" onClick={handleMarkAllRead}>✓ Mark All Read</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 20 }}>
        Alerts for shipment status changes, delays, customs releases, factory unloading,
        empty container returns, and new document uploads.
      </p>

      {error && <div className="error-text">{error}</div>}

      <div className="notif-tabs">
        <button className={`notif-tab ${activeType === '' ? 'active' : ''}`} onClick={() => setActiveType('')}>All</button>
        {NOTIF_TYPES.map((t) => (
          <button
            key={t.value}
            className={`notif-tab ${activeType === t.value ? 'active' : ''}`}
            onClick={() => setActiveType(t.value)}
          >
            <t.Icon size={14} /> {t.label}
          </button>
        ))}
        <button className={`notif-tab ${unreadOnly ? 'active' : ''}`} onClick={() => setUnreadOnly((v) => !v)}>
          {unreadOnly ? '● Unread only' : '○ Unread only'}
        </button>
      </div>

      {notifications.map((n) => {
        const meta = notifMeta(n.notif_type)
        return (
          <div
            key={n.id}
            className={`notif-card ${n.is_read ? '' : 'unread'}`}
            onClick={() => handleCardClick(n)}
          >
            <div className="notif-icon"><meta.Icon size={18} /></div>
            <div style={{ flex: 1 }}>
              <div className="notif-title">{n.title}</div>
              {n.message && <div className="notif-message">{n.message}</div>}
              {n.customer_name && (
                <div className="notif-message" style={{ marginTop: 2 }}>
                  {n.tracking_number} — {n.customer_name}
                </div>
              )}
            </div>
            <div className="notif-time">{new Date(n.created_at).toLocaleString()}</div>
          </div>
        )
      })}

      {notifications.length === 0 && !error && (
        <div style={{ color: 'var(--text-dim)' }}>No notifications here yet.</div>
      )}
    </>
  )
}
