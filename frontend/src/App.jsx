import { useState, useEffect } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Upload from './components/Upload'
import ContractBrief from './components/ContractBrief'
import Search from './components/Search'
import RiskMap from './components/RiskMap'
import Obligations from './components/Obligations'
import Executive from './components/Executive'
import ContractLibrary from './components/ContractLibrary'
import Login from './components/Login'
import { api } from './api'

const ROLE_VIEWS = {
  legal:       ['dashboard', 'upload', 'library', 'brief', 'search', 'risk', 'obligations'],
  procurement: ['dashboard', 'upload', 'library', 'brief', 'search', 'obligations'],
  executive:   ['exec', 'dashboard', 'upload', 'library', 'brief', 'search', 'risk', 'obligations'],
}

const ROLE_HOME = {
  legal:       'dashboard',
  procurement: 'dashboard',
  executive:   'exec',
}

const TOPBAR = {
  dashboard:   ['Dashboard',          'Live portfolio overview'],
  library:     ['Contract Library',   'Browse, compare and explore contracts'],
  upload:      ['Upload Contract',    'Add contracts to your portfolio'],
  brief:       ['Contract Brief',     'AI-extracted insights'],
  search:      ['Ask Anything',       'Natural language search across all contracts'],
  risk:        ['Risk Map',           'Clause-level risk across your portfolio'],
  obligations: ['Obligations',        'What your contracts require you to do'],
  exec:        ['Executive Overview', 'Strategic portfolio summary'],
}

// ── Hash helpers ──────────────────────────────────────────────
function buildHash(view, id, clauseType) {
  if (id != null && clauseType) return `#${view}/${id}/${clauseType}`
  if (id != null)               return `#${view}/${id}`
  return `#${view}`
}

function parseHash(hash) {
  const parts = (hash || '').replace(/^#/, '').split('/')
  return {
    view:       parts[0] || null,
    id:         parts[1] ? parseInt(parts[1], 10) : null,
    clauseType: parts[2] || null,
  }
}

// ── Obligation badge ──────────────────────────────────────────
function urgentCount(obligations) {
  const now = new Date()
  return obligations.filter(o => {
    if (o.status === 'completed' || o.trigger_type === 'event_based' || !o.due_date) return false
    return Math.round((new Date(o.due_date) - now) / 86400000) < 30
  }).length
}

export default function App() {
  const [user,           setUser]           = useState(null)
  const [authChecked,    setAuthChecked]    = useState(false)
  const [view,           setView]           = useState('dashboard')
  const [selectedContractId, setContractId] = useState(null)
  const [focusClause,    setFocusClause]    = useState(null)
  const [obligationBadge, setObligationBadge] = useState(null)

  // ── On mount: validate stored token, then apply initial hash ──
  useEffect(() => {
    const token = localStorage.getItem('clause_token')
    if (!token) { setAuthChecked(true); return }
    api.me()
      .then(u => {
        setUser(u)
        applyHash(window.location.hash, u)
      })
      .catch(() => localStorage.removeItem('clause_token'))
      .finally(() => setAuthChecked(true))
  }, [])

  // ── Browser back / forward ─────────────────────────────────
  useEffect(() => {
    function onPop() {
      if (!user) return
      applyHash(window.location.hash, user)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [user])

  function applyHash(hash, u) {
    const { view: v, id, clauseType } = parseHash(hash)
    const allowed = ROLE_VIEWS[u.role] || []
    const target  = v && TOPBAR[v] && allowed.includes(v) ? v : ROLE_HOME[u.role] || 'dashboard'
    setView(target)
    setContractId(id)
    setFocusClause(clauseType || null)
  }

  // ── Load obligation badge on login ─────────────────────────
  useEffect(() => {
    if (!user) return
    api.getObligations()
      .then(data => setObligationBadge(urgentCount(data) > 0 ? String(urgentCount(data)) : null))
      .catch(() => {})
  }, [user])

  function handleLogin(userData) {
    setUser(userData)
    // Apply hash if present, otherwise go to role home
    const { view: v, id, clauseType } = parseHash(window.location.hash)
    const allowed = ROLE_VIEWS[userData.role] || []
    const target  = v && TOPBAR[v] && allowed.includes(v) ? v : ROLE_HOME[userData.role] || 'dashboard'
    setView(target)
    setContractId(id)
    setFocusClause(clauseType || null)
    // Write initial hash so back-button works from first page
    window.history.replaceState(null, '', buildHash(target, id, clauseType))
  }

  function handleLogout() {
    api.logout().catch(() => {})
    localStorage.removeItem('clause_token')
    setUser(null)
    setContractId(null)
    setFocusClause(null)
    window.history.replaceState(null, '', '#')
  }

  function navigate(v, id, clauseType) {
    const allowed = user ? ROLE_VIEWS[user.role] || [] : []
    if (!allowed.includes(v)) return
    setView(v)
    setContractId(id !== undefined ? id : null)
    setFocusClause(clauseType || null)
    const hash = buildHash(v, id, clauseType)
    window.history.pushState(null, '', hash)
  }

  if (!authChecked) return null
  if (!user)        return <Login onLogin={handleLogin} />

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
        {view === 'library'     && <ContractLibrary navigate={navigate} />}
        {view === 'obligations' && <Obligations  navigate={navigate} />}
        {view === 'exec'        && <Executive    navigate={navigate} />}
      </div>
    </div>
  )
}
