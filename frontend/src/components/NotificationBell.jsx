import { useEffect, useRef, useState } from 'react'
import { Bell } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { notificationsService } from '../services/api'
import { useNotifications } from '../services/NotificationContext'
import { notifMeta } from '../notificationTypes'

export default function NotificationBell() {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const navigate = useNavigate()
  const { unreadCount, refresh } = useNotifications()

  const load = () => {
    notificationsService.list({ is_read: false }).then(({ data }) => {
      setItems((data.results ?? data).slice(0, 5))
    }).catch(() => {})
  }

  useEffect(() => {
    if (open) load()
  }, [open])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleItemClick = async (n) => {
    try {
      await notificationsService.markRead(n.id)
      refresh()
    } catch {
      // non-fatal
    }
    setOpen(false)
    if (n.shipment) navigate(`/shipments/${n.shipment}`)
  }

  return (
    <div className="notification-bell" ref={ref}>
      <button className="bell-button" onClick={() => setOpen((o) => !o)}>
        <Bell size={18} /> {unreadCount > 0 && <span className="bell-count">{unreadCount}</span>}
      </button>
      {open && (
        <div className="bell-dropdown">
          {items.length === 0 && (
            <div style={{ color: 'var(--text-dim)', fontSize: 13, padding: 12 }}>No unread notifications.</div>
          )}
          {items.map((n) => {
            const meta = notifMeta(n.notif_type)
            return (
              <button
                key={n.id}
                className="bell-item"
                style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}
                onClick={() => handleItemClick(n)}
              >
                <meta.Icon size={14} /> <strong>{n.title}</strong>
              </button>
            )
          })}
          <Link to="/notifications" className="bell-item" style={{ color: 'var(--signal)', textAlign: 'center' }} onClick={() => setOpen(false)}>
            View all →
          </Link>
        </div>
      )}
    </div>
  )
}
