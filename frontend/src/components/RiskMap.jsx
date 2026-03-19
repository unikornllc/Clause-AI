import { useState, useEffect } from 'react'
import { api } from '../api'

const CLAUSE_COLS = [
  { key: 'liability_cap',   label: 'Liability Cap' },
  { key: 'ip_ownership',    label: 'IP Ownership' },
  { key: 'termination',     label: 'Termination' },
  { key: 'price_change',    label: 'Pricing' },
  { key: 'sla_penalty',     label: 'SLA Penalty' },
  { key: 'indemnification', label: 'Indemnity' },
]

const SEV_EMOJI = { critical: '🔴', high: '🟡', medium: '🔵', low: '🟢' }
const SEV_CELL  = { critical: 'c',  high: 'h',  medium: 'm',  low: 'l' }

function fmt(v) {
  if (!v) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

export default function RiskMap({ navigate }) {
  const [contracts, setContracts] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [tooltip,   setTooltip]   = useState(null)  // { text, sev }

  useEffect(() => {
    api.getContracts()
      .then(data => setContracts(data.filter(c => c.status === 'completed')))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" />Loading…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>

  // Build a lookup: contract.id → { clause_type: { severity, description } }
  function getCell(contract, clauseKey) {
    const match = contract.risk_clauses?.find(r => r.type === clauseKey)
    return match || null
  }

  // Priority actions — top risks across portfolio
  const allRisks = contracts.flatMap(c =>
    (c.risk_clauses || []).map(r => ({ ...r, contract_name: c.name, contract_id: c.id }))
  ).filter(r => r.severity === 'critical' || r.severity === 'high')
    .sort((a, b) => (a.severity === 'critical' ? -1 : 1))
    .slice(0, 5)

  // Portfolio insight
  const criticalCount = contracts.reduce((sum, c) =>
    sum + (c.risk_clauses?.filter(r => r.severity === 'critical').length || 0), 0)
  const ipRiskCount = contracts.filter(c =>
    c.risk_clauses?.some(r => r.type === 'ip_ownership')
  ).length

  return (
    <div className="content">
      <div style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              Risk Heat Map
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              Clause-level risk across {contracts.length} vendor contracts
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
            <span>🔴 Critical</span>
            <span>🟡 High</span>
            <span>🔵 Medium</span>
            <span>🟢 Low</span>
          </div>
        </div>
      </div>

      {/* Heatmap table */}
      <div className="card" style={{ padding: '0 0 4px', marginBottom: 20 }}>
        <table className="heatmap-table">
          <thead>
            <tr>
              <th>Vendor</th>
              {CLAUSE_COLS.map(c => <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {contracts.map(c => (
              <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate('brief', c.id)}>
                <td>
                  <div className="hm-vendor">{c.name}</div>
                  <div className="hm-value">{fmt(c.total_value) || '—'}</div>
                </td>
                {CLAUSE_COLS.map(col => {
                  const cell = getCell(c, col.key)
                  return (
                    <td key={col.key}>
                      {cell ? (
                        <div
                          className={`hm-cell ${SEV_CELL[cell.severity] || 'l'}`}
                          title={`${cell.title}: ${cell.description}`}
                        >
                          {SEV_EMOJI[cell.severity] || '🟢'}
                        </div>
                      ) : (
                        <div className="hm-cell n" title="Not applicable">—</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Portfolio insight */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Portfolio Insight</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.75 }}>
            {criticalCount > 0 && (
              <p>
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>{criticalCount} critical risk clauses</span> detected
                across your portfolio. These require legal review before the next renewal.
              </p>
            )}
            {ipRiskCount > 0 && (
              <p style={{ marginTop: 10 }}>
                <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{ipRiskCount} of {contracts.length} vendors</span> include
                clauses that claim rights over derivative works or data — a material IP risk if you're building
                internal analytics or AI tools.
              </p>
            )}
            {criticalCount === 0 && ipRiskCount === 0 && (
              <p>No critical risks detected across your portfolio.</p>
            )}
          </div>
        </div>

        {/* Priority actions */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 12 }}>Priority Actions</div>
          {allRisks.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allRisks.map((r, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 7, cursor: 'pointer' }}
                  onClick={() => navigate('brief', r.contract_id)}
                >
                  <span className={`risk-pill ${r.severity}`} style={{ fontSize: 10, flexShrink: 0 }}>
                    {r.severity}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{r.contract_name}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No high-priority actions.</div>
          )}
        </div>
      </div>
    </div>
  )
}
