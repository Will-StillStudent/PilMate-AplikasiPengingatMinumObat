import { Link } from 'react-router-dom';
import { formatDateTime } from '../lib/format';

export default function LogRow({ log }) {
  const getStatusBadge = () => {
    switch (log.status) {
      case 'taken':
        return <span className="badge badge-taken">✔ Taken</span>;
      case 'skipped':
        return <span className="badge badge-skipped">✖ Skipped</span>;
      case 'extra':
        return <span className="badge badge-extra">+ Extra</span>;
      default:
        return <span className="badge">{log.status}</span>;
    }
  };

  return (
    <Link to={`/history/${log.id}`} className="log-row">
      <div className="log-left">
        <span className="log-date">{formatDateTime(log.acted_at)}</span>
        <span className="log-med">{log.medication_name || 'Medication'}</span>
        <span className="log-detail">
          {log.amount || 1} dosis
          {log.note ? ` · "${log.note}"` : ''}
        </span>
      </div>

      <div className="log-right">
        {getStatusBadge()}
        <div style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

