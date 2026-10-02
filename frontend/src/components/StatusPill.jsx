const STATUS_LABELS = {
  operation_fully_completed: 'Fully Operation Completed',
  delivered: 'Fully Operation Completed',
}

export default function StatusPill({ status }) {
  const label = STATUS_LABELS[status] || status?.replace(/_/g, ' ')
  return <span className={`status-pill status-${status}`}>{label}</span>
}
