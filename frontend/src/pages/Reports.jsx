import { useEffect, useState } from 'react'
import { FileText } from 'lucide-react'
import { reportsService, dashboardService } from '../services/api'

const DAILY_ROWS = [
  ['total_shipments', 'Total Shipments'],
  ['completed', 'Completed'],
  ['in_transit', 'In Transit'],
  ['at_customs', 'At Customs'],
  ['waiting_cargo_release', 'Waiting Cargo Release'],
  ['factory_unloading', 'Factory Unloading'],
  ['empty_container_returned', 'Empty Container Returned'],
  ['pending', 'Pending'],
  ['delayed', 'Delayed (past ETA)'],
  ['technical_issues', 'Technical Issues'],
  ['cancelled', 'Cancelled'],
]

export default function Reports() {
  const [reports, setReports] = useState([])
  const [error, setError] = useState('')
  const [daily, setDaily] = useState(null)
  const [loadingDaily, setLoadingDaily] = useState(false)

  useEffect(() => {
    reportsService
      .list()
      .then(({ data }) => setReports(data.results ?? data))
      .catch(() => setError('Could not load reports.'))
  }, [])

  const generateDailyReport = () => {
    setLoadingDaily(true)
    dashboardService
      .dailyReport()
      .then(({ data }) => setDaily(data))
      .catch(() => setError('Could not generate the daily report.'))
      .finally(() => setLoadingDaily(false))
  }

  return (
    <>
      <div className="topline">Insights</div>
      <h1 className="page-title">Reports</h1>

      {error && <div className="error-text">{error}</div>}

      <div style={{ marginBottom: 32 }}>
        <button className="btn" onClick={generateDailyReport} disabled={loadingDaily}>
          {loadingDaily ? 'Generating…' : <><FileText size={15} /> Generate Daily Operations Report</>}
        </button>

        {daily && (
          <div className="daily-report-card">
            <div className="topline">Daily Operations Report — {daily.report_date}</div>
            <table style={{ marginTop: 12 }}>
              <tbody>
                {DAILY_ROWS.map(([key, label]) => (
                  <tr key={key}>
                    <th style={{ width: 220 }}>{label}</th>
                    <td>{daily[key]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 12 }}>
              Generated {new Date(daily.generated_at).toLocaleString()}. "Delayed" counts shipments
              whose estimated delivery date has passed without being completed or cancelled.
            </div>
          </div>
        )}
      </div>

      <div className="topline" style={{ marginBottom: 12 }}>Saved Reports</div>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{r.report_type}</td>
              <td>{r.date_from}</td>
              <td>{r.date_to}</td>
            </tr>
          ))}
          {reports.length === 0 && !error && (
            <tr>
              <td colSpan={4} style={{ color: 'var(--text-dim)' }}>No saved reports yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </>
  )
}
