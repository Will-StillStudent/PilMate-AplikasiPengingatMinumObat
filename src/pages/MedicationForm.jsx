import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import MedForm from '../components/MedForm';
import LoadingState from '../components/LoadingState';

export default function MedicationForm({ isOnline = true }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isEditing) {
      setLoading(true);
      api.getMedication(id)
        .then(data => {
          setInitialData(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setError('Failed to load medication data.');
          setLoading(false);
        });
    }
  }, [id, isEditing]);

  const handleSubmit = async (formData) => {
    if (!isOnline) {
      alert('You are offline, cannot save changes at this time.');
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await api.updateMedication(id, formData);
        navigate(`/medications/${id}`);
      } else {
        const created = await api.createMedication(formData);
        navigate(`/medications/${created.id}`);
      }
    } catch (err) {
      alert(`Failed to save data: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isEditing) {
      navigate(`/medications/${id}`);
    } else {
      navigate('/medications');
    }
  };

  if (loading) {
    return <LoadingState message="Loading medication form..." />;
  }

  if (error) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '24px' }}>
        <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={handleCancel}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
          {isEditing ? 'Edit Medicine' : 'Add Medicine'}
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          {isEditing
            ? 'Update medicine details, stock, and daily reminder times.'
            : 'Fill in the form to start tracking your medicine schedule and doses.'}
        </p>
      </div>

      <div className="card">
        <MedForm
          initial={initialData || {}}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          loading={submitting}
        />
      </div>
    </div>
  );
}
