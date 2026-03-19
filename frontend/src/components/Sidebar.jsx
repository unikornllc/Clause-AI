const NAV = [
  { id: 'dashboard',   label: 'Dashboard',         icon: '⬛', section: 'Overview' },
  { id: 'exec',        label: 'Executive View',    icon: '📊', section: null },
  { id: 'upload',      label: 'Upload Contract',   icon: '⬆', section: 'Contracts' },
  { id: 'library',     label: 'Contract Library',  icon: '📚', section: null },
  { id: 'brief',       label: 'Contract Brief',    icon: '📄', section: null },
  { id: 'search',      label: 'Ask Anything',      icon: '💬', section: 'Intelligence' },
  { id: 'risk',        label: 'Risk Map',          icon: '🔥', section: null },
  { id: 'obligations', label: 'Obligations',       icon: '✅', section: null },
  { id: 'negotiate',   label: 'Negotiations',      icon: '🤝', section: null },
]

const ROLE_LABELS = {
  legal:       'Legal Counsel',
  procurement: 'Procurement',
  executive:   'Executive',
}

export default function Sidebar({ view, navigate, obligationBadge, user, onLogout, allowedViews }) {
  let lastSection = null

  const visibleNav = NAV.filter(n => allowedViews.includes(n.id))

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <div className="logo-icon">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2 2h8l4 4v8H2V2z" fill="#07080D" />
              <path d="M10 2v4h4" stroke="#07080D" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M4 8h8M4 11h5" stroke="#C9A84C" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="logo-name">Clause</div>
            <div className="logo-sub">Contract Intel</div>
          </div>
        </div>
      </div>

      <div className="sidebar-nav">
        {visibleNav.map(n => {
          const showSection = n.section && n.section !== lastSection
          if (n.section) lastSection = n.section
          return (
            <div key={n.id}>
              {showSection && <div className="nav-section-label">{n.section}</div>}
              <div
                className={`nav-item ${view === n.id ? 'active' : ''}`}
                onClick={() => navigate(n.id)}
              >
                <span className="nav-icon">{n.icon}</span>
                {n.label}
                {n.id === 'obligations' && obligationBadge && (
                  <span className="nav-badge danger">{obligationBadge}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {user?.full_name?.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[user?.role] || user?.role}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} title="Sign out">
            ⎋
          </button>
        </div>
      </div>
    </div>
  )
}
