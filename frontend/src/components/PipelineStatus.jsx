export default function PipelineStatus({ routingPath, executionTimeMs }) {
  const isEscalation = routingPath === 'escalation'

  const steps = isEscalation
    ? [
        { name: 'Planner Classification', status: 'done', icon: '' },
        { name: 'Context Agent', status: 'done', icon: '' },
        { name: 'Reasoning Agent', status: 'done', icon: '' },
        { name: 'Recommendation Agent', status: 'done', icon: '' },
        { name: 'Explanation Agent', status: 'done', icon: '' },
        { name: 'Human Approval Gate', status: 'paused', icon: '' },
      ]
    : [
        { name: 'Planner Classification', status: 'done', icon: '' },
        { name: 'Context Agent', status: 'done', icon: '' },
        { name: 'Standard Recommendation', status: 'done', icon: '' },
        { name: 'Explanation Agent', status: 'done', icon: '' },
        { name: 'Human Approval Gate', status: 'paused', icon: '' },
      ]

  return (
    <div className="pipeline-status">
      <div className="pipeline-header">
        <div className={`pipeline-badge ${isEscalation ? 'pipeline-badge-escalation' : 'pipeline-badge-standard'}`}>
          {isEscalation ? 'Escalation Path' : 'Standard Path'}
        </div>
        {executionTimeMs && (
          <span className="pipeline-time">{executionTimeMs}ms</span>
        )}
      </div>
      <div className="pipeline-steps">
        {steps.map((step, i) => (
          <div key={i} className={`pipeline-step pipeline-step-${step.status}`}>
            <span className="pipeline-step-icon">{step.icon}</span>
            <span className="pipeline-step-name">{step.name}</span>
            <span className="pipeline-step-status">
              {step.status === 'done' ? '✓' : '⏸'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
