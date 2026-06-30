export default function TraceTimeline({ trace }) {
  if (!trace) return null

  return (
    <div className="timeline-container">
      {(trace || []).map((step, idx) => (
        <div key={idx} className="timeline-item">
          <div className="timeline-dot" />
          <div className="timeline-content">{step}</div>
        </div>
      ))}
    </div>
  )
}
