import { useNavigate, useLocation } from 'react-router-dom';

export default function TopBar({ title, subtitle, back, actions }) {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname;

  const handleBack = () => {
    if (typeof back === 'string') {
      navigate(back);
    } else {
      navigate(-1);
    }
  };

  // Render actions based on screen if not explicitly passed
  const renderActions = () => {
    if (actions) return actions;

    const aboutButton = (
      <button
        type="button"
        className="btn-icon"
        title="About"
        aria-label="About"
        onClick={() => navigate('/about')}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
    );

    if (path === '/') {
      return (
        <>
          <button
            type="button"
            className="btn-icon"
            title="Tags"
            aria-label="Tags"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-tag-filter'))}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </button>
          {aboutButton}
        </>
      );
    }

    if (path === '/medications') {
      return (
        <>
          <button
            type="button"
            className="btn-icon"
            title="Tags"
            aria-label="Tags"
            onClick={() => window.dispatchEvent(new CustomEvent('toggle-tag-filter'))}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
          </button>
          {aboutButton}
        </>
      );
    }

    return aboutButton;
  };

  return (
    <header className="top-bar">
      <div className="top-bar-left">
        {back && (
          <button
            type="button"
            className="btn-icon"
            onClick={handleBack}
            aria-label="Kembali"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
        )}
        <div>
          <h1 className="top-bar-title">{title}</h1>
          {subtitle && <p className="top-bar-subtitle">{subtitle}</p>}
        </div>
      </div>

      <div className="top-bar-actions">
        {renderActions()}
      </div>
    </header>
  );
}
