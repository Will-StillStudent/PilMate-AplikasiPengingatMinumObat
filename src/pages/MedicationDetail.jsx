import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDateShort, formatReminderDays, getExpiryStatus } from '../lib/format';
import LoadingState from '../components/LoadingState';

export default function MedicationDetail({ isOnline = true }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [med, setMed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchMed = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getMedication(id);
        setMed(data);
      } catch (err) {
        console.error(err);
        setError('Medication not found or failed to load data.');
      } finally {
        setLoading(false);
      }
    };

    fetchMed();
  }, [id]);

  const handleDelete = async () => {
    if (!isOnline) {
      alert('You are offline, cannot delete medication right now.');
      return;
    }
    setActionLoading(true);
    try {
      await api.deleteMedication(id);
      navigate('/medications');
    } catch (err) {
      alert(`Failed to delete medication: ${err.message}`);
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading medication details..." />;
  }

  if (error || !med) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error || 'Medication data not found.'}</p>
        <Link to="/medications" className="btn btn-secondary">
          ← Back to Medications
        </Link>
      </div>
    );
  }

  const isLowStock = med.stock <= (med.low_stock_at || 0);
  const expiryInfo = getExpiryStatus(med.expires_on);

  return (
    <div>
      {/* Header Card (Tanpa border warna dan tanpa bulatan warna) */}
      <div className="card" style={{ position: 'relative' }}>
        <div>
          <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Medicine Details
          </span>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginTop: '2px', color: 'var(--ink)' }}>
            {med.name}
          </h2>
          {med.dosage && (
            <p style={{ fontSize: '1rem', color: 'var(--muted)', marginTop: '2px', fontWeight: '500' }}>
              {med.dosage}
            </p>
          )}
        </div>

        {med.notes && (
          <div style={{ marginTop: '14px', padding: '10px 12px', backgroundColor: 'var(--paper)', borderRadius: 'var(--radius-sm)', fontSize: '0.92rem' }}>
            <span style={{ fontWeight: '600', display: 'block', marginBottom: '2px' }}>Instructions & Notes:</span>
            {med.notes}
          </div>
        )}

        {med.tags && med.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
            {med.tags.map(t => (
              <span key={t} className="tag-chip">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stock & Expiration Info */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>
          Inventory & Expiration
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Remaining Stock</span>
            <div style={{ textAlign: 'right' }}>
              <strong>{med.stock} pills</strong>
              <div style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                Low stock threshold: {med.low_stock_at || 0} pills
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Expiration Date</span>
            <span>{med.expires_on ? formatDateShort(med.expires_on) : 'Not set'}</span>
          </div>

          {/* Alert Peringatan jika Stok Rendah / Expired */}
          {isLowStock && (
            <div className="alert-box alert-warning" style={{ margin: '4px 0 0 0' }}>
              <span>⚠</span>
              <span>Low medication stock! Please refill your supply soon.</span>
            </div>
          )}

          {expiryInfo && expiryInfo.status !== 'valid' && (
            <div className={`alert-box ${expiryInfo.status === 'expired' ? 'alert-danger' : 'alert-warning'}`} style={{ margin: '4px 0 0 0' }}>
              <span>⌛</span>
              <span>{expiryInfo.label}. Please check medication condition before taking.</span>
            </div>
          )}
        </div>
      </div>

      {/* Reminder Schedules */}
      <div className="card">
        <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '12px' }}>
          Reminder Schedules
        </h3>

        {!med.reminders || med.reminders.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No reminder schedules set for this medication.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {med.reminders.map((rem, idx) => (
              <div
                key={rem.id || idx}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px 14px',
                  backgroundColor: 'var(--paper)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div>
                  <strong style={{ fontSize: '1.1rem' }}>{rem.time}</strong>
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '2px' }}>
                    {formatReminderDays(rem.days)}
                  </div>
                </div>
                <span className="badge badge-taken">
                  {rem.amount || 1} {rem.amount > 1 ? 'pills' : 'pill'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
        <Link
          to={`/medications/${med.id}/edit`}
          className="btn btn-secondary"
          style={{ flex: 1, textDecoration: 'none' }}
        >
          ✏ Edit Medicine
        </Link>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => setShowDeleteModal(true)}
          disabled={!isOnline}
        >
          🗑 Delete
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete Medication?</h3>
            <p className="modal-body">
              Are you sure you want to delete <strong>{med.name}</strong> along with all its reminder schedules? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
