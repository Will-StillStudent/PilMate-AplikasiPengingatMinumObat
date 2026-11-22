import { Link } from 'react-router-dom';
import { getExpiryStatus, formatTime } from '../lib/format';
import MedIconBadge from './MedIconBadge';

export default function MedCard({ med }) {
  const isLowStock = med.stock <= (med.low_stock_at || 0);
  const expiryInfo = getExpiryStatus(med.expires_on);

  const reminders = med.reminders || [];
  const reminderCount = reminders.length;
  const timesList = reminderCount > 0
    ? reminders.map(r => formatTime(r.time)).join(', ')
    : 'No reminders';

  return (
    <Link to={`/medications/${med.id}`} className="card med-card-m3">
      {/* Sisi Kiri: Badge Ikon Obat Berdasarkan Tags */}
      <MedIconBadge tags={med.tags} name={med.name} color={med.color} size={50} borderRadius={14} />

      {/* Konten Tengah (2.png) */}
      <div className="med-card-body">
        <div className="med-card-header">
          <strong className="med-card-name">
            {med.name}
            {med.dosage && ` (${med.dosage})`}
          </strong>
          {/* Info sisa obat & tanggal expired (2.png) */}
          <span className="med-card-stock-info">
            {' ('}{med.stock} pills left{isLowStock ? ' ⚠' : ''}
            {med.expires_on ? `, ${new Date(med.expires_on).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })}` : ''}
            {')'}
          </span>
        </div>

        {/* Jumlah Reminders (2.png) */}
        <p className="med-card-reminders">
          {reminderCount} reminder{reminderCount !== 1 ? 's' : ''}
        </p>

        {/* Jam Pengingat (2.png) */}
        <p className="med-card-times">
          {timesList}
        </p>

        {/* Tags Kategori: Chip biru muda (2.png) */}
        {med.tags && med.tags.length > 0 && (
          <div className="med-card-tags">
            {med.tags.map(tag => (
              <button
                key={tag}
                type="button"
                className="tag-chip"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.dispatchEvent(new CustomEvent('select-med-tag', { detail: tag }));
                }}
                style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
                title={`Filter berdasarkan tag: ${tag}`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sisi Kanan: Handle 6 Titik Reorder (2.png) */}
      <div className="med-card-handle" title="Reorder">
        <svg width="20" height="24" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="8" cy="6" r="2" />
          <circle cx="16" cy="6" r="2" />
          <circle cx="8" cy="12" r="2" />
          <circle cx="16" cy="12" r="2" />
          <circle cx="8" cy="18" r="2" />
          <circle cx="16" cy="18" r="2" />
        </svg>
      </div>
    </Link>
  );
}
