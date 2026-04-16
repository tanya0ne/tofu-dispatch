const LABELS: Record<string, string> = {
  confirmed:   'Confirmed',
  on_way:      'On the way',
  on_site:     'On site',
  completed:   'Completed',
  delayed:     'Delayed',
  scheduled:   'Scheduled',
  cancelled:   'Cancelled',
  pending:     'Pending',
  resolved:    'Resolved',
  dismissed:   'Dismissed',
  no_response: 'Not responding',
  overrun:     'Over time',
  delay:       'Running late',
}

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge-${status}`} style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '2px 9px',
      borderRadius: 100,
      fontSize: 11.5,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {LABELS[status] ?? status}
    </span>
  )
}
