import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Upload from './components/Upload'
import ContractBrief from './components/ContractBrief'
import Search from './components/Search'
import RiskMap from './components/RiskMap'
import Obligations from './components/Obligations'
import Executive from './components/Executive'

const TOPBAR = {
  dashboard:   ['Dashboard',          '47 contracts · Live'],
  upload:      ['Upload Contract',    'Add contracts to your portfolio'],
  brief:       ['Contract Brief',     'AI-extracted insights'],
  search:      ['Ask Anything',       'Natural language search across all contracts'],
  risk:        ['Risk Map',           'Clause-level risk across your portfolio'],
  obligations: ['Obligations',        'What your contracts require you to do'],
  exec:        ['Executive Overview', 'Strategic portfolio summary'],
}

export default function App() {
  const [view, setView]                     = useState('dashboard')
  const [selectedContractId, setContractId] = useState(null)

  function navigate(v, id) {
    if (id !== undefined) setContractId(id)
    setView(v)
  }

  const [title, sub] = TOPBAR[view] || ['Clause', '']

  return (
    <div className="app">
      <Sidebar view={view} navigate={navigate} />

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
        {view === 'brief'       && <ContractBrief contractId={selectedContractId} navigate={navigate} />}
        {view === 'search'      && <Search       navigate={navigate} />}
        {view === 'risk'        && <RiskMap      navigate={navigate} />}
        {view === 'obligations' && <Obligations  navigate={navigate} />}
        {view === 'exec'        && <Executive    navigate={navigate} />}
      </div>
    </div>
  )
}
