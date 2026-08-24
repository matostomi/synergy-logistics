import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Package, Plus, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { tasksService } from '../services/api'

const PRIORITY_COLOR = { low: 'var(--text-dim)', normal: 'var(--paper)', high: 'var(--warn)', urgent: 'var(--danger)' }

const EMPTY_FORM = { title: '', description: '', due_date: '', priority: 'normal', shipment: '' }

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

export default function TasksCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-12
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')

  const loadCalendar = () => {
    tasksService.calendar(year, month).then(({ data }) => setEvents(data)).catch(() => setError('Could not load calendar.'))
  }
  const loadTasks = () => {
    tasksService.list({ ordering: 'due_date' }).then(({ data }) => setTasks(data.results ?? data)).catch(() => {})
  }

  useEffect(loadCalendar, [year, month])
  useEffect(loadTasks, [])

  const changeMonth = (delta) => {
    let newMonth = month + delta
    let newYear = year
    if (newMonth > 12) { newMonth = 1; newYear += 1 }
    if (newMonth < 1) { newMonth = 12; newYear -= 1 }
    setMonth(newMonth)
    setYear(newYear)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await tasksService.create(form)
      setShowForm(false)
      setForm(EMPTY_FORM)
      loadCalendar()
      loadTasks()
    } catch {
      setError('Could not create task.')
    }
  }

  const toggleDone = async (task) => {
    const newStatus = task.status === 'done' ? 'pending' : 'done'
    await tasksService.update(task.id, { status: newStatus }).catch(() => {})
    loadTasks()
    loadCalendar()
  }

  const handleCheckDeadlines = async () => {
    setChecking(true)
    setCheckMessage('')
    try {
      const { data } = await tasksService.checkDeadlines()
      setCheckMessage(`${data.alerts_created} new deadline alert(s) created.`)
      loadCalendar()
      loadTasks()
    } catch {
      setCheckMessage('Could not check deadlines.')
    } finally {
      setChecking(false)
    }
  }

  const totalDays = daysInMonth(year, month)
  const firstWeekday = new Date(year, month - 1, 1).getDay()
  const cells = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const eventsForDay = (day) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter((e) => e.date === dateStr)
  }

  return (
    <>
      <div className="topline">Planning</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Tasks &amp; Calendar</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary" onClick={handleCheckDeadlines} disabled={checking}>
            {checking ? 'Checking…' : <><AlertTriangle size={15} /> Check Deadlines Now</>}
          </button>
          <button className="btn" onClick={() => setShowForm((v) => !v)}><Plus size={16} /> Add Task</button>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}
      {checkMessage && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 12 }}>{checkMessage}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="inline-form">
          <div className="form-row">
            <input placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} required />
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div className="form-row">
            <input placeholder="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="form-row">
            <button className="btn" type="submit">Add Task</button>
            <button className="btn secondary" type="button" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className="btn secondary" style={{ padding: '4px 10px' }} onClick={() => changeMonth(-1)}>←</button>
        <div style={{ fontWeight: 600 }}>{new Date(year, month - 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</div>
        <button className="btn secondary" style={{ padding: '4px 10px' }} onClick={() => changeMonth(1)}>→</button>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="calendar-weekday">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`calendar-cell ${day ? '' : 'empty'}`}>
            {day && (
              <>
                <div className="calendar-day-num">{day}</div>
                {eventsForDay(day).map((ev) => (
                  <Link
                    key={`${ev.type}-${ev.id}`}
                    to={ev.shipment_id ? `/shipments/${ev.shipment_id}` : '#'}
                    className="calendar-event"
                    style={{ borderLeftColor: PRIORITY_COLOR[ev.priority] || 'var(--signal)' }}
                    title={ev.title}
                  >
                    {ev.type === 'deadline' ? <Package size={12} /> : <CheckCircle2 size={12} />} {ev.title}
                  </Link>
                ))}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="topline" style={{ marginTop: 32, marginBottom: 12 }}>All Tasks</div>
      <table>
        <thead>
          <tr><th>Title</th><th>Due</th><th>Priority</th><th>Status</th><th>Shipment</th></tr>
        </thead>
        <tbody>
          {tasks.map((t) => (
            <tr key={t.id} style={{ opacity: t.status === 'done' ? 0.5 : 1 }}>
              <td>{t.title}{t.auto_generated && <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--warn)' }}>(auto)</span>}</td>
              <td>{t.due_date}</td>
              <td style={{ color: PRIORITY_COLOR[t.priority] }}>{t.priority}</td>
              <td>
                <button className="btn secondary" style={{ padding: '3px 8px', fontSize: 12 }} onClick={() => toggleDone(t)}>
                  {t.status === 'done' ? <><RotateCcw size={13} /> Reopen</> : <>✓ Done</>}
                </button>
              </td>
              <td>
                {t.shipment_tracking_number
                  ? <Link to={`/shipments/${t.shipment}`} style={{ color: 'var(--signal)' }}>{t.customer_name}</Link>
                  : '—'}
              </td>
            </tr>
          ))}
          {tasks.length === 0 && <tr><td colSpan={5} style={{ color: 'var(--text-dim)' }}>No tasks yet.</td></tr>}
        </tbody>
      </table>
    </>
  )
}
