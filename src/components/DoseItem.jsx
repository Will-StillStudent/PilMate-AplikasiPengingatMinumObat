import { Link } from 'react-router-dom';
import { formatTime } from '../lib/format';
import MedIconBadge from './MedIconBadge';

export default function DoseItem({
  dose,
  onSetStatus,
  disabled = false,
  isFirst = false,
  isLast = false
}) {
  const isTaken = dose.status === 'taken';
  const isSkipped = dose.status === 'skipped';
  const isDue = dose.status === 'due';

  // Tampilan Simpul Lingkaran di Sisi Kiri (1.png)
  let nodeIcon;
  let nodeBg = '#b8c9ea';
  let nodeColor = '#041e49';

  if (isTaken) {
    nodeBg = '#b8c9ea';
    nodeColor = '#003355';
    nodeIcon = (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="16 9 10 15 8 13" />
      </svg>
    );
  } else if (isSkipped) {
    nodeBg = '#b8c9ea';
    nodeColor = '#ba1a1a';
    nodeIcon = (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
    );
  } else if (isDue) {
    nodeBg = '#ffdad6';
    nodeColor = '#ba1a1a';
    nodeIcon = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="13" r="8" />
        <polyline points="12 9 12 13 14 15" />
        <line x1="4.5" y1="4.5" x2="7.5" y2="7.5" />
        <line x1="19.5" y1="4.5" x2="16.5" y2="7.5" />
      </svg>
    );
  } else {
    // Pending (1.png)
    nodeBg = '#b8c9ea';
    nodeColor = '#041e49';
    nodeIcon = (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  }

  // Aksi Klik Lingkaran Sebelah Kiri:
  // Jika pending/due -> langsung menjadi Taken (Centang ✔)
  // Jika sudah taken -> berganti menjadi Skipped (Silang ✖)
  // Jika skipped -> kembali ke Pending (Lonceng 🔔)
  const handleLeftNodeClick = (e) => {
    e.stopPropagation();
    if (disabled || !onSetStatus) return;

    if (dose.status === 'pending' || dose.status === 'due') {
      onSetStatus('taken');
    } else if (dose.status === 'taken') {
      onSetStatus('skipped');
    } else {
      onSetStatus('pending');
    }
  };

  return (
    <div className="timeline-item">
      {/* Kolom Garis Timeline + Simpul Lingkaran di Sebelah Kiri untuk Klik (1.png) */}
      <div className="timeline-track">
        {!isFirst && <div className="timeline-line timeline-line-top" />}
        <button
          type="button"
          className="timeline-node"
          style={{
            backgroundColor: nodeBg,
            color: nodeColor,
            border: 'none',
            cursor: 'pointer',
            outline: 'none',
            transition: 'transform 0.15s ease, background-color 0.15s ease'
          }}
          onClick={handleLeftNodeClick}
          title={
            isTaken
              ? 'Status: Taken (Click to mark as Skipped)'
              : isSkipped
                ? 'Status: Skipped (Click to mark as Pending)'
                : 'Click here to mark as Taken'
          }
        >
          {nodeIcon}
        </button>
        {!isLast && <div className="timeline-line timeline-line-bottom" />}
      </div>

      {/* Gray Dose Schedule Card */}
      <Link
        to={`/medications/${dose.medication_id}`}
        className="timeline-card"
        style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
        title={`View details for ${dose.medication_name}`}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', width: '100%' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Baris 1: Waktu & Ikon Kalender (1.png) */}
            <div className="timeline-time-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatTime(dose.time)}</span>
            </div>

            {/* Baris 2: Nama Obat (Dosis) (Jumlah) (1.png) */}
            <div className="timeline-title-row">
              <span className="timeline-med-name">{dose.medication_name}</span>
              {dose.dosage && <span className="timeline-med-dose"> ({dose.dosage})</span>}
              <span className="timeline-med-amount"> ({dose.amount || 1}{dose.amount && dose.amount > 1 ? ' pills' : ''})</span>
            </div>
          </div>

          {/* Sisi Kanan: Badge Logo Obat Berdasarkan Tags */}
          <MedIconBadge tags={dose.tags} name={dose.medication_name} color={dose.color} size={46} borderRadius={12} />
        </div>
      </Link>
    </div>
  );
}
