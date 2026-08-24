import { useEffect, useMemo, useState } from 'react'
import { Bell, Calendar, Truck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { dashboardService } from '../services/api'
import StatusPill from '../components/StatusPill'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toKey(date) {
  return date.toISOString().slice(0, 10)
}

function startOfMonth(year, month) {
  return new Date(year, month, 1)
}

function buildMonthGrid(year, month) {
  const first = startOfMonth(year, month)
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - first.getDay())

  const weeks = []
  const cursor = new Date(gridStart)
  for (let w = 0; w < 6; w++) {
    const week = []
    for (let d = 0; d < 7; d++) {
      week.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

export default function OperationsCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth()) // 0-indexed
  const [deliveries, setDeliveries] = useState([])
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [selectedKey, setSelectedKey] = useState(toKey(today))

  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  useEffect(() => {
    const start = startOfMonth(year, month)
    const end = startOfMonth(month === 11 ? year + 1 : year, month === 11 ? 0 : month + 1)
    dashboardService
      .calendar({ start: start.toISOString(), end: end.toISOString() })
      .then(({ data }) => {
        setDeliveries(data.deliveries)
        setEvents(data.events)
        setError('')
      })
      .catch(() => setError('Could not load calendar data.'))
  }, [year, month])

  const byDay = useMemo(() => {
    const map = {}
    for (const d of deliveries) {
      const key = new Date(d.date).toISOString().slice(0, 10)
      if (!map[key]) map[key] = { deliveries: [], events: [] }
      map[key].deliveries.push(d)
    }
    for (const e of events) {
      const key = new Date(e.date).toISOString().slice(0, 10)
      if (!map[key]) map[key] = { deliveries: [], events: [] }
      map[key].events.push(e)
    }
    return map
  }, [deliveries, events])

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month])
  const selectedDay = byDay[selectedKey] || { deliveries: [], events: [] }
  const todayKey = toKey(today)

  const goToPrevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11) } else { setMonth((m) => m - 1) }
  }
  const goToNextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0) } else { setMonth((m) => m + 1) }
  }
  const goToToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedKey(todayKey)
  }

  return (
    <>
      <div className="topline">
        <Link to="/" style={{ color: 'var(--signal)' }}>← Back to dashboard</Link>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Operations & Calendar</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn secondary" onClick={goToPrevMonth}>←</button>
          <button className="btn secondary" onClick={goToToday}>Today</button>
          <button className="btn secondary" onClick={goToNextMonth}>→</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-dim)', marginTop: 0, marginBottom: 16 }}>
        <Calendar size={14} /> Deliveries scheduled and status events logged, by day. {monthLabel}.
      </p>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 20 }}>
        {WEEKDAYS.map((d) => (
          <div key={d} style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-dim)', paddingBottom: 4 }}>{d}</div>
        ))}
        {weeks.flat().map((date) => {
          const key = toKey(date)
          const inMonth = date.getMonth() === month
          const day = byDay[key]
          const isSelected = key === selectedKey
          const isToday = key === todayKey
          return (
            <button
              key={key}
              onClick={() => setSelectedKey(key)}
              style={{
                textAlign: 'left',
                minHeight: 72,
                borderRadius: 8,
                border: `1px solid ${isSelected ? 'var(--signal)' : 'var(--line)'}`,
                background: isToday ? 'rgba(255, 122, 48, 0.08)' : 'var(--panel)',
                opacity: inMonth ? 1 : 0.35,
                padding: '6px 8px',
                cursor: 'pointer',
                color: 'var(--paper)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 400 }}>{date.getDate()}</span>
              {day?.deliveries.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--signal)' }}><Truck size={11} /> {day.deliveries.length}</span>
              )}
              {day?.events.length > 0 && (
                <span style={{ fontSize: 11, color: 'var(--text-dim)' }}><Bell size={11} /> {day.events.length}</span>
              )}
            </button>
          )
        })}
      </div>

      <h2 style={{ fontSize: 16, marginBottom: 12 }}>
        {new Date(selectedKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </h2>

      {selectedDay.deliveries.length === 0 && selectedDay.events.length === 0 && (
        <div style={{ color: 'var(--text-dim)' }}>Nothing scheduled or logged for this day.</div>
      )}

      {selectedDay.deliveries.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>SCHEDULED DELIVERIES</div>
          {selectedDay.deliveries.map((d) => (
            <Link
              key={`d-${d.id}`}
              to={`/shipments/${d.id}`}
              className="notif-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="notif-icon"><Truck size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="notif-title">{d.tracking_number} — {d.customer_name}</div>
              </div>
              <StatusPill status={d.status} />
            </Link>
          ))}
        </>
      )}

      {selectedDay.events.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text-dim)', margin: '16px 0 6px' }}>STATUS EVENTS LOGGED</div>
          {selectedDay.events.map((e) => (
            <Link
              key={`e-${e.id}`}
              to={`/shipments/${e.shipment_id}`}
              className="notif-card"
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="notif-icon"><Bell size={18} /></div>
              <div style={{ flex: 1 }}>
                <div className="notif-title">{e.tracking_number} — {e.customer_name}</div>
                {e.note && <div className="notif-message">{e.note}</div>}
              </div>
              <StatusPill status={e.status} />
            </Link>
          ))}
        </>
      )}
    </>
  )
}
