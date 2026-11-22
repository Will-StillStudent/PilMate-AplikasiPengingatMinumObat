import { NavLink } from 'react-router-dom';

export default function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigasi Utama">
      <NavLink
        to="/"
        end
        onClick={() => {
          // Lepas semua filter saat tab Overview diklik agar seluruh obat tampil
          window.dispatchEvent(new CustomEvent('reset-overview-filter'));
        }}
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </div>
        <span>Overview</span>
      </NavLink>

      <NavLink
        to="/medications"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M10.5 13.5L3.5 6.5C2.12 5.12 2.12 2.88 3.5 1.5C4.88 0.12 7.12 0.12 8.5 1.5L15.5 8.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 10L14 17" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M13.5 10.5L20.5 17.5C21.88 18.88 21.88 21.12 20.5 22.5C19.12 23.88 16.88 23.88 15.5 22.5L8.5 15.5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>Medicine</span>
      </NavLink>

      <NavLink
        to="/history"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M18 20V10M12 20V4M6 20v-6" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span>Analysis</span>
      </NavLink>

      <NavLink
        to="/about"
        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-icon-container">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="9" strokeWidth="2"/>
            <line x1="12" y1="16" x2="12" y2="12" strokeWidth="2" strokeLinecap="round"/>
            <line x1="12" y1="8" x2="12.01" y2="8" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <span>About</span>
      </NavLink>
    </nav>
  );
}
