export default function ProgressBar({ percent, statusLabel }) {
  if (percent === null || percent === undefined) {
    return <div style={{ color: 'var(--text-dim)', fontSize: 13 }}>Progress not tracked for this status.</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-dim)', marginBottom: 6 }}>
        <span>Pending</span>
        <span>{statusLabel}</span>
        <span>Completed</span>
      </div>
      <div style={{ background: 'var(--line)', borderRadius: 100, height: 8, overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: 'var(--signal)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
