import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatDateTime } from '../lib/format';
import LoadingState from '../components/LoadingState';

export default function LogDetail({ isOnline = true }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [log, setLog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState('taken');
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(1);

  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const fetchLog = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await api.getLog(id);
        setLog(data);
        setStatus(data.status);
        setNote(data.note || '');
        setAmount(data.amount || 1);
      } catch (err) {
        console.error(err);
        setError('Dose log record not found.');
      } finally {
        setLoading(false);
      }
    };

    fetchLog();
  }, [id]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!isOnline) {
      alert('You are offline, cannot update log right now.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.updateLog(id, {
        status,
        note: note.trim(),
        amount: Number(amount) || 1
      });
      setLog(updated);
      setIsEditing(false);
    } catch (err) {
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isOnline) {
      alert('You are offline, cannot delete log right now.');
      return;
    }
    setSaving(true);
    try {
      await api.deleteLog(id);
      navigate('/history');
    } catch (err) {
      alert(`Failed to delete log: ${err.message}`);
    } finally {
      setSaving(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading dose record details..." />;
  }

  if (error || !log) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error || 'Data not found.'}</p>
        <Link to="/history" className="btn btn-secondary">
          ← Back to Analysis
        </Link>
      </div>
    );
  }

  const getStatusBadge = (st) => {
    switch (st) {
      case 'taken':
        return <span className="badge badge-taken">✔ Taken</span>;
      case 'skipped':
        return <span className="badge badge-skipped">✖ Skipped</span>;
      case 'extra':
        return <span className="badge badge-extra">+ Extra Dose</span>;
      default:
        return <span className="badge">{st}</span>;
    }
  };

  return (
    <div>
      <div className="card">
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Dose Record Details
        </span>
        <h2 style={{ fontSize: '1.35rem', fontWeight: '800', marginTop: '2px', color: 'var(--ink)' }}>
          {log.medication_name || 'Medication'}
        </h2>
        {log.dosage && (
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', marginTop: '2px' }}>
            {log.dosage}
          </p>
        )}

        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.95rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Status</span>
            <div>{getStatusBadge(log.status)}</div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Scheduled Time</span>
            <span>{log.scheduled_at ? formatDateTime(log.scheduled_at) : '-'}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Confirmed Time</span>
            <strong>{formatDateTime(log.acted_at)}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '8px', borderBottom: '1px solid var(--line)' }}>
            <span style={{ color: 'var(--muted)' }}>Dose Amount</span>
            <span>{log.amount || 1} {log.amount && log.amount > 1 ? 'pills' : 'pill'}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '8px' }}>
            <span style={{ color: 'var(--muted)' }}>Notes</span>
            <div style={{ padding: '8px 12px', backgroundColor: 'var(--paper)', borderRadius: 'var(--radius-sm)', minHeight: '38px' }}>
              {log.note || <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>No notes recorded</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="card">
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', marginBottom: '14px' }}>
            Edit Dose Record
          </h3>
          <form onSubmit={handleUpdate}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-status">Dose Status</label>
              <select
                id="edit-status"
                className="form-select"
                value={status}
                onChange={e => setStatus(e.target.value)}
              >
                <option value="taken">✔ Taken</option>
                <option value="skipped">✖ Skipped</option>
                <option value="extra">+ Extra Dose</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-amount">Amount</label>
              <input
                id="edit-amount"
                type="number"
                min="0.5"
                step="0.5"
                className="form-input"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="edit-note">Notes</label>
              <input
                id="edit-note"
                type="text"
                className="form-input"
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="e.g. Delayed due to meeting"
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: 1 }}
                disabled={saving || !isOnline}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => setIsEditing(true)}
            disabled={!isOnline}
          >
            ✏ Edit Status / Notes
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => setShowDeleteModal(true)}
            disabled={!isOnline}
          >
            🗑 Delete Record
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Delete This Record?</h3>
            <p className="modal-body">
              Are you sure you want to delete this dose history entry? This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
                disabled={saving}
              >
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
