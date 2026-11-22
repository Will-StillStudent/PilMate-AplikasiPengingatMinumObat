export default function LoadingState({ message = 'Loading data...' }) {
  return (
    <div className="state-box">
      <div className="spinner" />
      <p style={{ marginTop: '14px', fontSize: '0.9rem', color: 'var(--muted)', fontWeight: '500' }}>
        {message}
      </p>
    </div>
  );
}

