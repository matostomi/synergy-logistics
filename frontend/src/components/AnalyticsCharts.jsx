import { useEffect, useState } from 'react'
import { dashboardService } from '../services/api'

const PALETTE = ['#ff7a30', '#4fb286', '#e0b13c', '#d8564a', '#6f8fd6', '#b47fd6', '#5fb6c9', '#c9945f']

function Panel({ title, subtitle, children }) {
  return (
    <div className="analytics-panel">
      <div className="topline" style={{ marginBottom: 2 }}>{title}</div>
      {subtitle && (
        <p style={{ color: 'var(--text-dim)', fontSize: 12, marginTop: 0, marginBottom: 12 }}>{subtitle}</p>
      )}
      {children}
    </div>
  )
}

function BarChart({ data, labelKey, valueKey, height = 160 }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height, padding: '0 4px' }}>
      {data.map((d, i) => {
        const barHeight = Math.round((d[valueKey] / max) * (height - 28))
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{d[valueKey] || ''}</div>
            <div
              title={`${d[labelKey]}: ${d[valueKey]}`}
              style={{
                width: '100%',
                height: Math.max(barHeight, d[valueKey] > 0 ? 3 : 0),
                background: 'var(--signal)',
                borderRadius: '3px 3px 0 0',
              }}
            />
            <div style={{ fontSize: 10, color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.2 }}>
              {d[labelKey]}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DonutChart({ data, labelKey, valueKey, size = 150 }) {
  const total = data.reduce((sum, d) => sum + d[valueKey], 0) || 1
  const radius = size / 2
  const stroke = radius * 0.4
  const r = radius - stroke / 2
  const circumference = 2 * Math.PI * r
  let offset = 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${radius} ${radius})`}>
          {data.map((d, i) => {
            const frac = d[valueKey] / total
            const dash = frac * circumference
            const segment = (
              <circle
                key={i}
                cx={radius}
                cy={radius}
                r={r}
                fill="none"
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={stroke}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
              />
            )
            offset += dash
            return segment
          })}
        </g>
        <text x={radius} y={radius} textAnchor="middle" dominantBaseline="middle" fontSize="18" fontWeight="700" fill="var(--paper)">
          {total}
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
        {data.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length], display: 'inline-block' }} />
            <span>{d[labelKey]}</span>
            <span style={{ color: 'var(--text-dim)' }}>{d[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HBarList({ data, labelKey, valueKey }) {
  const max = Math.max(1, ...data.map((d) => d[valueKey]))
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {data.map((d, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span>{d[labelKey] || '—'}</span>
            <span style={{ color: 'var(--text-dim)' }}>{d[valueKey]}</span>
          </div>
          <div style={{ background: 'var(--line)', borderRadius: 4, height: 8 }}>
            <div
              style={{
                width: `${(d[valueKey] / max) * 100}%`,
                background: 'var(--signal)',
                height: 8,
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      ))}
      {data.length === 0 && <div style={{ color: 'var(--text-dim)', fontSize: 12 }}>No data yet</div>}
    </div>
  )
}

const KPI_TILES = [
  { key: 'total_shipments', label: 'Total Shipments' },
  { key: 'active_shipments', label: 'Active Shipments' },
  { key: 'completed_shipments', label: 'Completed' },
  { key: 'on_time_delivery_rate', label: 'On-Time Rate', suffix: '%', fallback: 'N/A' },
  { key: 'total_customers', label: 'Active Customers' },
]

const REFRESH_INTERVAL_MS = 30_000 // 

export default function AnalyticsCharts() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)
  const [secondsAgo, setSecondsAgo] = useState(0)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      dashboardService
        .analytics(12)
        .then(({ data: res }) => {
          if (cancelled) return
          setData(res)
          setLastUpdated(Date.now())
          setError('')
        })
        .catch(() => {
          if (!cancelled) setError('Could not load analytics data.')
        })
    }

    load()
    const intervalId = setInterval(load, REFRESH_INTERVAL_MS)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    if (!lastUpdated) return
    const tickId = setInterval(() => {
      setSecondsAgo(Math.round((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(tickId)
  }, [lastUpdated])

  if (error && !data) {
    return <div style={{ color: 'var(--danger)', fontSize: 13 }}>{error}</div>
  }
  if (!data) {
    return <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Loading analytics…</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
          {error ? 'Refresh failed — showing last known data' : `Updated ${secondsAgo}s ago`}
        </span>
      </div>
      <div className="analytics-grid">
        <Panel title="Performance KPIs">
          <div className="kpi-tile-row">
            {KPI_TILES.map((tile) => {
              const raw = data.kpis[tile.key]
              const display = raw === null || raw === undefined
                ? (tile.fallback ?? '0')
                : `${tile.prefix ?? ''}${typeof raw === 'number' ? raw.toLocaleString() : raw}${tile.suffix ?? ''}`
              return (
                <div key={tile.key} className="kpi-tile">
                  <div className="kpi-tile-value">{display}</div>
                  <div className="kpi-tile-label">{tile.label}</div>
                </div>
              )
            })}
          </div>
        </Panel>

        <Panel title="Monthly Shipments" subtitle="Shipments created per month, last 12 months">
          <BarChart data={data.monthly_shipments} labelKey="label" valueKey="count" />
        </Panel>

        <Panel title="Shipments by Status">
          <DonutChart
            data={data.status_breakdown.filter((d) => d.count > 0)}
            labelKey="label"
            valueKey="count"
          />
        </Panel>

        <Panel title="Container Type Mix">
          <DonutChart data={data.container_type_stats.filter((d) => d.count > 0)} labelKey="type" valueKey="count" />
        </Panel>

        <Panel title="Top Customers" subtitle="By shipment volume">
          <HBarList data={data.customer_stats} labelKey="name" valueKey="count" />
        </Panel>

        <Panel title="Top Destinations" subtitle="By shipment volume">
          <HBarList data={data.destination_stats} labelKey="destination" valueKey="count" />
        </Panel>
      </div>
    </div>
  )
}
