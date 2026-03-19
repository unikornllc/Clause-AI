import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Upload from './components/Upload'
import ContractBrief from './components/ContractBrief'
import Search from './components/Search'
import RiskMap from './components/RiskMap'
import Obligations from './components/Obligations'
import Executive from './components/Executive'
import Login from './components/Login'
import { api } from './api'

// Which nav items each role can access
const ROLE_VIEWS = {
  legal:       ['dashboard', 'upload', 'brief', 'search', 'risk', 'obligations'],
  procurement: ['dashboard', 'upload', 'brief', 'search', 'obligations'],
  executive:   ['exec', 'dashboard', 'upload', 'brief', 'search', 'risk', 'obligations'],
}

// Default landing view per role
const ROLE_HOME = {
  legal:       'dashboard',
  procurement: 'dashboard',
  executive:   'exec',
}

const TOPBAR = {
  dashboard:   ['Dashboard',          'Live portfolio overview'],
  upload:      ['Upload Contract',    'Add contracts to your portfolio'],
  brief:       ['Contract Brief',     'AI-extracted insights'],
  search:      ['Ask Anything',       'Natural language search across all contracts'],
  risk:        ['Risk Map',           'Clause-level risk across your portfolio'],
  obligations: ['Obligations',        'What your contracts require you to do'],
  exec:        ['Executive Overview', 'Strategic portfolio summary'],
}

function urgentCount(obligations) {
  const now = new Date()
  return obligations.filter(o => {
    if (o.status === 'completed' || o.trigger_type === 'event_based' || !o.due_date) return false
    const days = Math.round((new Date(o.due_date) - now) / 86400000)
    return days < 30
  }).length
}

export default function App() {
  const [user,    setUser]    = useState(null)   // null = not logged in
  const [authChecked, setAuthChecked] = useState(false)

  const [view,               setView]        = useState('dashboard')
  const [selectedContractId, setContractId]  = useState(null)
  const [focusClause,        setFocusClause] = useState(null)
  const [obligationBadge,    setObligationBadge] = useState(null)

  // On mount, validate stored token
  useEffect(() => {
    const token = localStorage.getItem('clause_token')
    if (!token) { setAuthChecked(true); return }
    api.me()
      .then(u => {
        setUser(u)
        setView(ROLE_HOME[u.role] || 'dashboard')
      })
      .catch(() => {
        localStorage.removeItem('clause_token')
      })
      .finally(() => setAuthChecked(true))
  }, [])

  // Load obligation badge whenever user logs in
  useEffect(() => {
    if (!user) return
    api.getObligations()
      .then(data => {
        const count = urgentCount(data)
        setObligationBadge(count > 0 ? String(count) : null)
      })
      .catch(() => {})
  }, [user])

  function handleLogin(userData) {
    setUser(userData)
    setView(ROLE_HOME[userData.role] || 'dashboard')
  }

  function handleLogout() {
    api.logout().catch(() => {})
    localStorage.removeItem('clause_token')
    setUser(null)
    setContractId(null)
    setFocusClause(null)
  }

  function navigate(v, id, clauseType) {
    // Guard: only allow views this role has access to
    const allowed = user ? ROLE_VIEWS[user.role] || [] : []
    if (!allowed.includes(v)) return
    if (id !== undefined) setContractId(id)
    setFocusClause(clauseType || null)
    setView(v)
  }

  // Still checking token validity
  if (!authChecked) return null

  // Not logged in
  if (!user) return <Login onLogin={handleLogin} />

  const [title, sub] = TOPBAR[view] || ['Clause', '']

  return (
    <div className="app">
      <Sidebar
        view={view}
        navigate={navigate}
        obligationBadge={obligationBadge}
        user={user}
        onLogout={handleLogout}
        allowedViews={ROLE_VIEWS[user.role] || []}
      />

      <div className="main">
        <div className="topbar">
          <div>
            <div className="topbar-title">{title}</div>
            {sub && <div className="topbar-sub">{sub}</div>}
          </div>
          <div className="topbar-right">
            <button className="btn btn-primary btn-sm" onClick={() => navigate('upload')}>
              + Upload Contract
            </button>
          </div>
        </div>

        {view === 'dashboard'   && <Dashboard   navigate={navigate} />}
        {view === 'upload'      && <Upload       navigate={navigate} />}
        {view === 'brief'       && <ContractBrief contractId={selectedContractId} navigate={navigate} focusClause={focusClause} />}
        {view === 'search'      && <Search       navigate={navigate} />}
        {view === 'risk'        && <RiskMap      navigate={navigate} />}
        {view === 'obligations' && <Obligations  navigate={navigate} />}
        {view === 'exec'        && <Executive    navigate={navigate} />}
      </div>
    </div>
  )
}
