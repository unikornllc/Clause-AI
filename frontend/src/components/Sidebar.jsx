const NAV = [
  { id: 'dashboard',   label: 'Dashboard',         icon: '⬛', section: 'Overview' },
  { id: 'upload',      label: 'Upload Contract',   icon: '⬆', section: null },
  { id: 'brief',       label: 'Contract Brief',    icon: '📄', section: 'Intelligence' },
  { id: 'search',      label: 'Ask Anything',      icon: '💬', section: null },
  { id: 'risk',        label: 'Risk Map',          icon: '🔥', section: null },
  { id: 'obligations', label: 'Obligations',       icon: '✅', section: null, badge: '2', badgeType: 'danger' },
  { id: 'exec',        label: 'Executive View',    icon: '📊', section: 'Reporting' },
]

export default function Sidebar({ view, navigate }) {
  let lastSection = null

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
        {NAV.map(n => {
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
                {n.badge && (
                  <span className={`nav-badge ${n.badgeType || ''}`}>{n.badge}</span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="sidebar-footer">
        <div className="org-badge">
          <div className="org-avatar">AC</div>
          <div>
            <div className="org-name">Acme Corp</div>
            <div className="org-plan">Enterprise Plan</div>
          </div>
        </div>
      </div>
    </div>
  )
}
