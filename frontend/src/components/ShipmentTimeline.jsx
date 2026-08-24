const STAGES = [
  { key: 'loading_date', label: 'Departure' },
  { key: 'border_crossing', label: 'Border Crossing' },
  { key: 'customs_released', label: 'Customs', altKey: 'customs_arrival' },
  { key: 'factory_arrival', label: 'Factory Arrival' },
  { key: 'factory_unloading', label: 'Factory Unloading' },
  { key: 'empty_container_return_date', label: 'Empty Container Return' },
]

export default function ShipmentTimeline({ shipment }) {
  return (
    <div className="timeline">
      {STAGES.map((stage, i) => {
        const value = shipment[stage.key] || (stage.altKey ? shipment[stage.altKey] : '')
        const done = Boolean(value)
        const inProgress = !done && stage.altKey && Boolean(shipment[stage.altKey])
        return (
          <div key={stage.key} className="timeline-stage">
            <div className="timeline-marker-col">
              <div className={`timeline-dot ${done ? 'done' : inProgress ? 'in-progress' : ''}`} />
              {i < STAGES.length - 1 && <div className={`timeline-line ${done ? 'done' : ''}`} />}
            </div>
            <div className="timeline-content">
              <div className="timeline-label">{stage.label}</div>
              <div className="timeline-date">
                {value || (inProgress ? 'In progress' : 'Not yet reached')}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
