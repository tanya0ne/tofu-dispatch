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
      padding: '3px 11px',
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 500,
      whiteSpace: 'nowrap',
      letterSpacing: '0.003em',
    }}>
      {LABELS[status] ?? status}
    </span>
  )
}
