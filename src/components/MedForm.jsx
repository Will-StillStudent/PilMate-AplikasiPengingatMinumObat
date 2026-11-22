import { useState } from 'react';

const DAYS_NAME = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const ALLOWED_TAGS = ['Vitamins', 'Supplements', 'Energy', 'Important'];

const TAG_CARDS_DATA = [
  { name: 'Vitamins', image: '/Gambar tags/vitamin.jpg' },
  { name: 'Supplements', image: '/Gambar tags/Supplements.jpg' },
  { name: 'Energy', image: '/Gambar tags/energy.jpg' },
  { name: 'Important', image: '/Gambar tags/important.png' }
];

export default function MedForm({ initial = {}, onSubmit, onCancel, loading = false }) {
  const [name, setName] = useState(initial.name || '');
  const [dosage, setDosage] = useState(initial.dosage || '');
  const [notes, setNotes] = useState(initial.notes || '');
  const [selectedTags, setSelectedTags] = useState(() => {
    if (Array.isArray(initial.tags)) {
      return initial.tags
        .map(t => ALLOWED_TAGS.find(a => a.toLowerCase() === String(t).trim().toLowerCase()))
        .filter(Boolean);
    }
    return [];
  });
  const [stock, setStock] = useState(initial.stock !== undefined ? initial.stock : 10);
  const [lowStockAt, setLowStockAt] = useState(initial.low_stock_at !== undefined ? initial.low_stock_at : 5);
  const [expiresOn, setExpiresOn] = useState(initial.expires_on || '');

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Reminders
  const [reminders, setReminders] = useState(
    initial.reminders && initial.reminders.length > 0
      ? initial.reminders
      : [{ id: `new-rem-${Date.now()}`, time: '08:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1 }]
  );

  const [errors, setErrors] = useState({});

  const handleAddReminder = () => {
    setReminders([
      ...reminders,
      { id: `new-rem-${Date.now()}`, time: '12:00', days: [0, 1, 2, 3, 4, 5, 6], amount: 1 }
    ]);
  };

  const handleRemoveReminder = (index) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const handleUpdateReminder = (index, field, value) => {
    const updated = [...reminders];
    updated[index] = { ...updated[index], [field]: value };
    setReminders(updated);
  };

  const handleToggleDay = (reminderIndex, dayNumber) => {
    const reminder = reminders[reminderIndex];
    let days = reminder.days || [];
    if (days.includes(dayNumber)) {
      days = days.filter(d => d !== dayNumber);
    } else {
      days = [...days, dayNumber].sort((a, b) => a - b);
    }
    handleUpdateReminder(reminderIndex, 'days', days);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Medication name is required';
    if (stock < 0) newErrors.stock = 'Stock cannot be negative';
    if (lowStockAt < 0) newErrors.lowStockAt = 'Low stock threshold cannot be negative';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSubmit({
      name: name.trim(),
      dosage: dosage.trim(),
      notes: notes.trim(),
      color: '#3b5b82',
      tags: selectedTags,
      stock: Number(stock),
      low_stock_at: Number(lowStockAt),
      expires_on: expiresOn || null,
      reminders
    });
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Medication Name */}
      <div className="form-group">
        <label className="form-label" htmlFor="med-name">Medication Name *</label>
        <input
          id="med-name"
          type="text"
          className="form-input"
          placeholder="e.g. Paracetamol"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        {errors.name && <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '4px' }}>{errors.name}</p>}
      </div>

      {/* Dosage & Expiry Date */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="med-dosage">Dosage / Strength</label>
          <input
            id="med-dosage"
            type="text"
            className="form-input"
            placeholder="e.g. 500 mg, 1 capsule"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="med-expires">Expiration Date</label>
          <input
            id="med-expires"
            type="date"
            className="form-input"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
          />
        </div>
      </div>

      {/* Instructions / Notes */}
      <div className="form-group">
        <label className="form-label" htmlFor="med-notes">Notes & Instructions</label>
        <textarea
          id="med-notes"
          className="form-textarea"
          rows={2}
          placeholder="e.g. Take after meal, avoid dairy"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {/* Medicine Tags (Cards) */}
      <div className="form-group">
        <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
          Medicine Tags
        </label>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            marginTop: '4px'
          }}
        >
          {TAG_CARDS_DATA.map(tag => {
            const isSelected = selectedTags.includes(tag.name);
            return (
              <div
                key={tag.name}
                role="button"
                tabIndex={0}
                onClick={() => handleToggleTag(tag.name)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggleTag(tag.name);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 10px',
                  borderRadius: '12px',
                  border: isSelected ? '2px solid var(--accent)' : '1px solid #d5dbe5',
                  backgroundColor: isSelected ? '#edf8f5' : '#ffffff',
                  boxShadow: isSelected ? '0 2px 8px rgba(31, 138, 112, 0.16)' : '0 1px 3px rgba(0,0,0,0.04)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  userSelect: 'none',
                  position: 'relative'
                }}
              >
                {/* Gambar Tag */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    flexShrink: 0,
                    backgroundColor: '#eef2f6'
                  }}
                >
                  <img
                    src={tag.image}
                    alt={tag.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                  />
                </div>

                {/* Tulisan / Nama Tag (Khusus Supplements font size dikecilkan agar leluasa) */}
                <div style={{ flex: 1, minWidth: 0, paddingRight: '4px' }}>
                  <div
                    style={{
                      fontWeight: isSelected ? '700' : '600',
                      color: isSelected ? 'var(--accent)' : 'var(--ink)',
                      fontSize: tag.name === 'Supplements' ? '0.76rem' : '0.84rem',
                      lineHeight: '1.2',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                    title={tag.name}
                  >
                    {tag.name}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: isSelected ? 'var(--accent)' : 'var(--muted)', marginTop: '2px' }}>
                    {isSelected ? 'Selected' : 'Select'}
                  </div>
                </div>

                {/* Indikator Checkmark */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    border: isSelected ? '2px solid var(--accent)' : '2px solid #cbd5e1',
                    backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    flexShrink: 0
                  }}
                >
                  {isSelected && '✓'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stock Information */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label" htmlFor="med-stock">Stock Quantity</label>
          <input
            id="med-stock"
            type="number"
            min="0"
            className="form-input"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="med-low-stock">Low Stock Threshold</label>
          <input
            id="med-low-stock"
            type="number"
            min="0"
            className="form-input"
            value={lowStockAt}
            onChange={(e) => setLowStockAt(e.target.value)}
          />
          <p className="form-hint">Alert triggers when stock ≤ this limit</p>
        </div>
      </div>

      {/* Reminder Schedules Section */}
      <div className="card" style={{ marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: '700' }}>Reminder Schedules</h3>
            <p className="form-hint">Set daily reminder times</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={handleAddReminder}
          >
            + Add Time
          </button>
        </div>

        {reminders.map((rem, idx) => (
          <div
            key={rem.id || idx}
            style={{
              padding: '12px',
              backgroundColor: 'var(--paper)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '10px',
              border: '1px solid var(--line)'
            }}
          >
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Reminder Time</label>
                <input
                  type="time"
                  className="form-input"
                  style={{ padding: '6px 10px' }}
                  value={rem.time}
                  onChange={(e) => handleUpdateReminder(idx, 'time', e.target.value)}
                />
              </div>

              <div style={{ width: '90px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--muted)', display: 'block', marginBottom: '4px' }}>Amount</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  className="form-input"
                  style={{ padding: '6px 10px' }}
                  value={rem.amount || 1}
                  onChange={(e) => handleUpdateReminder(idx, 'amount', e.target.value)}
                />
              </div>

              {reminders.length > 1 && (
                <button
                  type="button"
                  className="btn-icon"
                  style={{ color: 'var(--danger)', marginTop: '18px' }}
                  onClick={() => handleRemoveReminder(idx)}
                  title="Remove this schedule"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Active Days Selector */}
            <div>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', marginBottom: '6px' }}>Active Days:</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {DAYS_NAME.map((dName, dayIdx) => {
                  const isSelected = (rem.days || []).includes(dayIdx);
                  return (
                    <button
                      key={dayIdx}
                      type="button"
                      onClick={() => handleToggleDay(idx, dayIdx)}
                      style={{
                        flex: 1,
                        padding: '4px 0',
                        fontSize: '0.75rem',
                        fontWeight: isSelected ? '700' : '400',
                        borderRadius: '4px',
                        border: '1px solid var(--line)',
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--panel)',
                        color: isSelected ? '#ffffff' : 'var(--muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {dName}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ flex: 1 }}
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Medication'}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
