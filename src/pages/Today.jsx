import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import DoseItem from '../components/DoseItem';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function Today({ isOnline = true }) {
  const [doses, setDoses] = useState([]);
  const [meds, setMeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showExtraModal, setShowExtraModal] = useState(false);

  // Filter status: 'all' | 'taken' | 'skipped' | 'pending' | 'due'
  const [statusFilter, setStatusFilter] = useState('all');
  // Tag filter state
  const [tagFilter, setTagFilter] = useState('all');
  const [showTagFilter, setShowTagFilter] = useState(false);

  // Selected date on horizontal strip (default: today)
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  });

  const getCurrentTimeStr = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [extraMedId, setExtraMedId] = useState('');
  const [extraAmount, setExtraAmount] = useState(1);
  const [extraTime, setExtraTime] = useState(getCurrentTimeStr());
  const [extraNote, setExtraNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [todayDoses, allMeds] = await Promise.all([
        api.getToday(),
        api.getMedications()
      ]);
      setDoses(todayDoses || []);
      setMeds(allMeds || []);
      if (allMeds && allMeds.length > 0 && !extraMedId) {
        setExtraMedId(allMeds[0].id);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load today schedule.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Event listener for Tags button in TopBar & chips on cards
    const handleToggleTag = () => setShowTagFilter(prev => !prev);
    const handleSelectTag = (e) => {
      if (e.detail) {
        setTagFilter(e.detail);
        setShowTagFilter(true);
      }
    };

    // Reset filter when Overview tab is clicked in BottomNav
    const handleResetFilter = () => {
      setStatusFilter('all');
      setTagFilter('all');
      setShowTagFilter(false);
      loadData();
    };

    window.addEventListener('toggle-tag-filter', handleToggleTag);
    window.addEventListener('select-med-tag', handleSelectTag);
    window.addEventListener('reset-overview-filter', handleResetFilter);

    return () => {
      window.removeEventListener('toggle-tag-filter', handleToggleTag);
      window.removeEventListener('select-med-tag', handleSelectTag);
      window.removeEventListener('reset-overview-filter', handleResetFilter);
    };
  }, []);

  // Track reminder_ids yang sedang disimpan (cegah double-click)
  const [savingIds, setSavingIds] = useState(new Set());

  // Set status for a specific dose item
  const handleSetStatus = async (dose, newStatus) => {
    if (!isOnline) {
      alert('You are offline, action cannot be saved.');
      return;
    }
    // Cegah double-click pada reminder yang sama
    if (savingIds.has(dose.reminder_id)) return;

    // Optimistic update — tampilan berubah langsung
    setSavingIds(prev => new Set([...prev, dose.reminder_id]));
    setDoses(prev => prev.map(d =>
      d.reminder_id === dose.reminder_id
        ? { ...d, status: newStatus }
        : d
    ));

    try {
      const now = new Date();
      const [h, m] = dose.time.split(':');
      const schedDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(h), Number(m), 0);

      if (newStatus === 'pending' || newStatus === 'due') {
        // Supabase hanya boleh: taken/skipped/extra
        // Status pending/due = TIDAK ADA log → hapus log jika ada
        if (dose.log_id) {
          await api.deleteLog(dose.log_id);
        }
        // Jika tidak ada log_id, sudah pending secara default — tidak perlu action
      } else if (dose.log_id) {
        // Log sudah ada → update status
        await api.updateLog(dose.log_id, {
          status: newStatus,
          amount: dose.amount || 1,
          note: `Schedule ${dose.time} changed to ${newStatus}`
        });
      } else {
        // Belum ada log → buat baru (hanya untuk taken/skipped)
        await api.createLog({
          medication_id: dose.medication_id,
          medication_name: dose.medication_name,
          time: dose.time,
          scheduled_at: schedDate.toISOString(),
          acted_at: now.toISOString(),
          status: newStatus,
          amount: dose.amount || 1,
          note: `Schedule ${dose.time} changed to ${newStatus}`
        });
      }
      // Refresh data dari server
      await loadData();
    } catch (err) {
      // Rollback jika gagal
      await loadData();
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setSavingIds(prev => { const n = new Set(prev); n.delete(dose.reminder_id); return n; });
    }
  };

  const handleSaveExtra = async (e) => {
    e.preventDefault();
    if (!extraMedId) return;
    setActionLoading(true);
    try {
      const selectedMed = meds.find(m => m.id === extraMedId);
      const chosenDateTime = new Date();
      if (extraTime && /^\d{2}:\d{2}$/.test(extraTime)) {
        const [hours, minutes] = extraTime.split(':').map(Number);
        chosenDateTime.setHours(hours, minutes, 0, 0);
      }
      const isoTime = chosenDateTime.toISOString();

      await api.createLog({
        medication_id: extraMedId,
        medication_name: selectedMed ? selectedMed.name : 'Medication',
        dosage: selectedMed ? selectedMed.dosage : '',
        scheduled_at: isoTime,
        acted_at: isoTime,
        status: 'taken',
        amount: Number(extraAmount) || 1,
        note: extraNote ? `Additional dose: ${extraNote}` : 'Additional dose / unscheduled'
      });
      setShowExtraModal(false);
      setExtraNote('');
      await loadData();
    } catch (err) {
      alert(`Failed to record additional dose: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Generate 7-day horizontal strip around selected date (1.png)
  const dayStripDays = useMemo(() => {
    const days = [];
    const base = new Date(selectedDate);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let offset = -3; offset <= 3; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      days.push({
        dateObj: d,
        dayName: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isSelected: d.toDateString() === selectedDate.toDateString()
      });
    }
    return days;
  }, [selectedDate]);

  const changeWeek = (direction) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + (direction * 7));
    setSelectedDate(d);
  };

  const availableTags = ['Vitamins', 'Supplements', 'Energy', 'Important'];

  // Filter doses by selected status filter and tag filter
  const filteredDoses = useMemo(() => {
    return doses.filter(d => {
      // 1. Status Filter
      if (statusFilter !== 'all' && d.status !== statusFilter) {
        return false;
      }
      // 2. Tag Filter
      if (tagFilter !== 'all') {
        if (!d.tags || !d.tags.some(t => String(t).trim().toLowerCase() === tagFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [doses, statusFilter, tagFilter]);

  const hasActiveTagFilter = tagFilter !== 'all';

  const resetTagFilter = () => {
    setTagFilter('all');
    setShowTagFilter(false);
  };

  const toggleFilter = (type) => {
    setStatusFilter(prev => prev === type ? 'all' : type);
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Tag Filter Bar when Tags button in TopBar is clicked */}
      {(showTagFilter || tagFilter !== 'all') && (
        <div style={{ padding: '8px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', backgroundColor: '#eef2f9', borderRadius: '12px', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--ink)' }}>Tags:</span>
          <button
            type="button"
            className={`tag-chip ${tagFilter === 'all' ? 'active' : ''}`}
            onClick={() => setTagFilter('all')}
            style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
          >
            All Tags
          </button>
          {availableTags.map(tag => (
            <button
              key={tag}
              type="button"
              className={`tag-chip ${tagFilter.toLowerCase() === tag.toLowerCase() ? 'active' : ''}`}
              onClick={() => setTagFilter(tag)}
              style={{ cursor: 'pointer', border: 'none', font: 'inherit' }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Reset Tag Filter Notification Bar */}
      {hasActiveTagFilter && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', marginBottom: '10px', fontSize: '0.82rem', color: 'var(--muted)' }}>
          <span>Showing {filteredDoses.length} of {doses.length} doses</span>
          <button
            type="button"
            onClick={resetTagFilter}
            style={{ background: 'none', border: 'none', color: '#ba1a1a', fontWeight: '600', cursor: 'pointer', padding: 0 }}
          >
            ✖ Reset Tag Filter
          </button>
        </div>
      )}
      {/* 1. Date Strip Navigation (1.png) */}
      <div className="date-strip-container">
        <button
          type="button"
          className="date-strip-arrow"
          onClick={() => changeWeek(-1)}
          aria-label="Previous week"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        <div className="date-strip-days">
          {dayStripDays.map((item, index) => (
            <button
              key={index}
              type="button"
              className={`day-cell ${item.isSelected ? 'active' : ''}`}
              onClick={() => setSelectedDate(item.dateObj)}
            >
              <span className="day-cell-name">{item.dayName}</span>
              <span className="day-cell-number">{item.dayNum}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="date-strip-arrow"
          onClick={() => changeWeek(1)}
          aria-label="Next week"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* 2. Filter Box with notch label (Filter ✔ ✖ 🔔 ⏰ in 1.png) */}
      <div className="filter-box-outer">
        <div className="filter-segmented-pill">
          {/* Label Notch Filter: click to clear filter and show all medications */}
          <button
            type="button"
            className={`filter-segmented-label ${statusFilter !== 'all' ? 'active-filter' : ''}`}
            onClick={() => setStatusFilter('all')}
            title="Click to clear filter and show all medications"
          >
            Filter
          </button>

          {/* 1. Circle Checkmark (Taken) */}
          <button
            type="button"
            className={`filter-icon-btn ${statusFilter === 'taken' ? 'active' : ''}`}
            onClick={() => toggleFilter('taken')}
            title="Filter Taken (Only taken doses)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="16 9 10 15 8 13" />
            </svg>
          </button>

          {/* 2. Circle Cross (Skipped) */}
          <button
            type="button"
            className={`filter-icon-btn ${statusFilter === 'skipped' ? 'active' : ''}`}
            onClick={() => toggleFilter('skipped')}
            title="Filter Skipped (Only skipped doses)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </button>

          {/* 3. Bell (Pending) */}
          <button
            type="button"
            className={`filter-icon-btn ${statusFilter === 'pending' ? 'active' : ''}`}
            onClick={() => toggleFilter('pending')}
            title="Filter Pending (Only pending doses)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>

          {/* 4. Alarm Clock (Due) */}
          <button
            type="button"
            className={`filter-icon-btn ${statusFilter === 'due' ? 'active' : ''}`}
            onClick={() => toggleFilter('due')}
            title="Filter Due (Only doses due now)"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="13" r="8" />
              <polyline points="12 9 12 13 14 15" />
              <line x1="4.5" y1="4.5" x2="7.5" y2="7.5" />
              <line x1="19.5" y1="4.5" x2="16.5" y2="7.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* 3. Timeline Layout (1.png) */}
      <div>
        {loading ? (
          <LoadingState message="Loading reminder schedules..." />
        ) : error ? (
          <div className="alert-box alert-danger">{error}</div>
        ) : filteredDoses.length === 0 ? (
          <EmptyState
            title="No Doses"
            description={
              hasActiveTagFilter
                ? `No doses found for tag "${tagFilter}"${statusFilter !== 'all' ? ` and status "${statusFilter}"` : ''}.`
                : statusFilter !== 'all'
                  ? `No doses found with filter "${statusFilter}". Click filter again to show all.`
                  : 'No doses scheduled for this day.'
            }
            action={
              (hasActiveTagFilter || statusFilter !== 'all') ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setStatusFilter('all');
                    setTagFilter('all');
                    setShowTagFilter(false);
                  }}
                >
                  Clear All Filters
                </button>
              ) : null
            }
          />
        ) : (
          <div className="timeline-list">
            {filteredDoses.map((dose, idx) => (
              <DoseItem
                key={dose.reminder_id || idx}
                dose={dose}
                onSetStatus={(status) => handleSetStatus(dose, status)}
                disabled={!isOnline}
                isSaving={savingIds.has(dose.reminder_id)}
                isFirst={idx === 0}
                isLast={idx === filteredDoses.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      {/* 4. Extended FAB (Log additional dose in 1.png) */}
      <button
        type="button"
        className="extended-fab"
        onClick={() => {
          setExtraTime(getCurrentTimeStr());
          setShowExtraModal(true);
        }}
        disabled={!isOnline || meds.length === 0}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'rotate(-45deg)' }}>
          <rect x="7" y="2" width="10" height="20" rx="5" />
          <line x1="7" y1="12" x2="17" y2="12" />
        </svg>
        <span>Log additional dose</span>
      </button>

      {/* Modal Additional Dose */}
      {showExtraModal && (
        <div className="modal-overlay" onClick={() => setShowExtraModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Log Additional Dose</h3>
            <p className="modal-body">
              Record medication taken outside regular schedules (e.g. pain relief when needed).
            </p>
            <form onSubmit={handleSaveExtra}>
              <div className="form-group">
                <label className="form-label" htmlFor="extra-med">Select Medication</label>
                <select
                  id="extra-med"
                  className="form-select"
                  value={extraMedId}
                  onChange={e => setExtraMedId(e.target.value)}
                  required
                >
                  {meds.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.dosage || 'no dosage'}) - Stock: {m.stock}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" htmlFor="extra-amount">Dose Amount</label>
                  <input
                    id="extra-amount"
                    type="number"
                    min="0.5"
                    step="0.5"
                    className="form-input"
                    value={extraAmount}
                    onChange={e => setExtraAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="extra-time">Time</label>
                  <input
                    id="extra-time"
                    type="time"
                    className="form-input"
                    value={extraTime}
                    onChange={e => setExtraTime(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="extra-notes">Notes (optional)</label>
                <input
                  id="extra-notes"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Sudden headache"
                  value={extraNote}
                  onChange={e => setExtraNote(e.target.value)}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowExtraModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : 'Save Dose'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
