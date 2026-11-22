import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import MedCard from '../components/MedCard';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function Medications({ isOnline = true }) {
  const [medications, setMedications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [tagFilter, setTagFilter] = useState('all');
  const [showTagFilter, setShowTagFilter] = useState(false);

  const loadMedications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getMedications();
      setMedications(data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load medications.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedications();

    // Event listener for Tags button in TopBar & chips on cards
    const handleToggleTag = () => setShowTagFilter(prev => !prev);
    const handleSelectTag = (e) => {
      if (e.detail) {
        setTagFilter(e.detail);
        setShowTagFilter(true);
      }
    };

    window.addEventListener('toggle-tag-filter', handleToggleTag);
    window.addEventListener('select-med-tag', handleSelectTag);

    return () => {
      window.removeEventListener('toggle-tag-filter', handleToggleTag);
      window.removeEventListener('select-med-tag', handleSelectTag);
    };
  }, []);

  // 4 Authorized tag options
  const availableTags = ['Vitamins', 'Supplements', 'Energy', 'Important'];

  // Filter medications by tag
  const filteredMedications = useMemo(() => {
    return medications.filter(med => {
      if (tagFilter !== 'all') {
        if (!med.tags || !med.tags.some(t => String(t).trim().toLowerCase() === tagFilter.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }, [medications, tagFilter]);

  const hasActiveFilter = tagFilter !== 'all';

  const resetAllFilters = () => {
    setTagFilter('all');
    setShowTagFilter(false);
  };

  return (
    <div style={{ paddingBottom: '32px' }}>
      {/* Tag Filter Bar when Tags button is clicked */}
      {(showTagFilter || tagFilter !== 'all') && (
        <div style={{ padding: '8px 12px 12px', display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', backgroundColor: '#eef2f9', borderRadius: '12px', marginBottom: '10px' }}>
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

      {/* Reset Filter Notification Bar */}
      {hasActiveFilter && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', marginBottom: '8px', fontSize: '0.82rem', color: 'var(--muted)' }}>
          <span>Showing {filteredMedications.length} of {medications.length} medications</span>
          <button
            type="button"
            onClick={resetAllFilters}
            style={{ background: 'none', border: 'none', color: '#ba1a1a', fontWeight: '600', cursor: 'pointer', padding: 0 }}
          >
            ✖ Reset Filter
          </button>
        </div>
      )}

      {loading ? (
        <LoadingState message="Loading medicines..." />
      ) : error ? (
        <div className="alert-box alert-danger">{error}</div>
      ) : filteredMedications.length === 0 ? (
        <EmptyState
          title={hasActiveFilter ? 'No Matching Medications' : 'No Medications Added'}
          description={hasActiveFilter ? 'No medications found for the selected tag.' : 'Add your first medication to start managing schedules and reminders.'}
          action={
            hasActiveFilter ? (
              <button type="button" className="btn btn-secondary" onClick={resetAllFilters}>
                Clear Filter
              </button>
            ) : (
              <Link to="/medications/new" className="btn btn-primary">
                + Add medicine
              </Link>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {filteredMedications.map(med => (
            <MedCard key={med.id} med={med} />
          ))}
        </div>
      )}

      {/* Extended FAB: ⊕ Add medicine (2.png) */}
      <Link
        to="/medications/new"
        className="extended-fab"
        title="Add medicine"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        <span>Add medicine</span>
      </Link>
    </div>
  );
}
