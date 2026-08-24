import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardService } from '../services/api'

function timeAgo(timestamp) {
  const diffMs = Date.now() - new Date(timestamp).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export default function RecentActivity({ limit = 10 }) {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    dashboardService
      .recentActivity(limit)
      .then(({ data }) => setEvents(data))
      .catch(() => setError('Could not load recent activity.'))
  }, [limit])

  return (
    <div className="activity-panel">
      <div className="topline" style={{ marginBottom: 12 }}>Recent Activity</div>
      {error && <div className="error-text">{error}</div>}
      {!error && events.length === 0 && (
        <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>
          No activity yet — updates appear here as shipment statuses change.
        </div>
      )}
      <ul className="activity-list">
        {events.map((e) => (
          <li key={e.id}>
            <Link to={`/shipments/${e.shipment_id}`} className="activity-item">
              <span className={`activity-dot status-${e.status}`} />
              <span className="activity-text">
                <strong>{e.customer_name}</strong> — {e.status.replace(/_/g, ' ')}
                {e.location && <> at {e.location}</>}
              </span>
              <span className="activity-time">{timeAgo(e.timestamp)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
