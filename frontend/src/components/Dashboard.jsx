import { useState, useEffect, useCallback } from 'react'
import { api } from '../api'

function fmt(v) {
  if (!v) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

function daysClass(d) {
  if (d < 30) return 'danger'
  if (d < 90) return 'warn'
  return 'ok'
}

function riskClass(r) {
  return { critical: 'critical', high: 'high', medium: 'medium', low: 'low' }[r] || 'low'
}

export default function Dashboard({ navigate }) {
  const [stats,     setStats]     = useState(null)
  const [contracts, setContracts] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  useEffect(() => {
    Promise.all([api.getStats(), api.getContracts()])
      .then(([s, c]) => { setStats(s); setContracts(c) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleDelete(e, contractId) {
    e.stopPropagation()   // don't navigate to brief
    if (!window.confirm('Delete this contract? This cannot be undone.')) return
    try {
      await api.deleteContract(contractId)
      setContracts(prev => prev.filter(c => c.id !== contractId))
      // refresh stats silently
      api.getStats().then(setStats).catch(() => {})
    } catch (err) {
      alert('Delete failed: ' + err.message)
    }
  }

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" /> Loading portfolio…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>

  // Build timeline data — map to % across 180-day window
  const today    = new Date()
  const range_ms = 180 * 24 * 60 * 60 * 1000
  const tl = (stats?.timeline || []).filter(t => t.days_until >= 0 && t.days_until <= 180)

  function pct(dateStr) {
    const diff = new Date(dateStr) - today
    return Math.max(2, Math.min(96, (diff / range_ms) * 100))
  }

  const months = []
  for (let i = 0; i <= 5; i++) {
    const d = new Date(today)
    d.setMonth(d.getMonth() + i)
    months.push(d.toLocaleString('default', { month: 'short' }).toUpperCase())
  }

  return (
    <div className="content">
      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card gold">
          <div className="stat-label">Total Committed</div>
          <div className="stat-value gold">{fmt(stats?.total_value)}</div>
          <div className="stat-sub">across {stats?.total_contracts || 0} contracts</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Auto-renewing (90d)</div>
          <div className="stat-value red">{stats?.renewing_90d_count || 0}</div>
          <div className="stat-sub">{fmt(stats?.renewing_90d_value)} at stake</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">Critical Risks</div>
          <div className="stat-value amber">{stats?.critical_risks || 0}</div>
          <div className="stat-sub">Needs legal review</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Obligations Met</div>
          <div className="stat-value green">{stats?.compliance_rate || 0}%</div>
          <div className="stat-sub">of all tracked obligations</div>
        </div>
      </div>

      {/* Renewal Timeline */}
      <div className="timeline-wrap">
        <div className="section-header">
          <div className="section-title">Renewal Timeline — next 180 days</div>
        </div>
        <div style={{ position: 'relative' }}>
          <div className="timeline-track">
            <div className="timeline-now-line" style={{ left: '0%' }}>TODAY</div>
            {tl.map((t, i) => (
              <div
                key={t.id}
                className="timeline-item"
                style={{ left: `${pct(t.expiration_date)}%` }}
                onClick={() => navigate('brief', t.id)}
              >
                <div className={`timeline-dot ${t.status}`} />
                <div className="timeline-label" style={{ top: i % 2 === 0 ? 16 : 40 }}>
                  <div className="t-name">{t.name.split(' ')[0]}</div>
                  <div className="t-date">
                    {new Date(t.expiration_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </div>
                  <div className={`t-badge ${t.status}`}>{t.days_until}d</div>
                </div>
              </div>
            ))}
          </div>
          <div className="month-labels" style={{ marginTop: 70 }}>
            {months.map(m => <span key={m} className="month-label">{m}</span>)}
          </div>
        </div>
      </div>

      {/* Contract table */}
      <div className="card" style={{ padding: '0 0 4px' }}>
        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid var(--border)' }}>
          <div className="section-header" style={{ margin: 0 }}>
            <div className="section-title">Active Contracts</div>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('upload')}>+ Upload</button>
          </div>
        </div>
        <table className="contract-table">
          <thead>
            <tr>
              <th>Contract</th>
              <th>Type</th>
              <th>Value</th>
              <th>Expires</th>
              <th>Days Left</th>
              <th>Risk</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => {
              const exp     = c.expiration_date ? new Date(c.expiration_date) : null
              const dLeft   = exp ? Math.round((exp - today) / 86400000) : null
              const topRisk = c.risk_clauses?.[0]?.severity || 'low'
              return (
                <tr key={c.id} onClick={() => navigate('brief', c.id)}>
                  <td>
                    <div className="contract-name">{c.name}</div>
                    <div className="contract-party">{(c.parties || []).join(' · ')}</div>
                  </td>
                  <td><span className="mono">{c.contract_type || '—'}</span></td>
                  <td><span className="mono">{fmt(c.total_value)}</span></td>
                  <td>
                    <span className="mono">
                      {exp ? exp.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                  </td>
                  <td>
                    {dLeft !== null
                      ? <span className={`days-chip ${daysClass(dLeft)}`}>{dLeft}d</span>
                      : '—'}
                  </td>
                  <td>
                    <span className={`risk-pill ${riskClass(topRisk)}`}>{topRisk}</span>
                  </td>
                  <td>
                    <button
                      className="delete-row-btn"
                      title="Delete contract"
                      onClick={e => handleDelete(e, c.id)}
                    >
                      🗑
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
