import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const CLAUSE_COLS = [
  { key: 'liability_cap',   label: 'Liability Cap' },
  { key: 'ip_ownership',    label: 'IP Ownership' },
  { key: 'termination',     label: 'Termination' },
  { key: 'price_change',    label: 'Pricing' },
  { key: 'sla_penalty',     label: 'SLA Penalty' },
  { key: 'indemnification', label: 'Indemnity' },
]

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }
const SEV_EMOJI = { critical: '🔴', high: '🟡', medium: '🔵', low: '🟢' }
const SEV_CELL  = { critical: 'c',  high: 'h',  medium: 'm',  low: 'l' }

function fmt(v) {
  if (!v) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

function getCell(contract, clauseKey) {
  return contract.risk_clauses?.find(r => r.type === clauseKey) || null
}

// ── Drill-down panel ─────────────────────────────────────────────────────────

const SEV_STYLE = {
  critical: { color: 'var(--red)',   bg: 'var(--red-dim)' },
  high:     { color: 'var(--amber)', bg: '#FEF3C7' },
  medium:   { color: 'var(--blue)',  bg: '#DBEAFE' },
  low:      { color: 'var(--green)', bg: 'var(--green-dim)' },
}

function DrillPanel({ clauseKey, clauseLabel, contracts, focusId, onClose, navigate }) {
  const focusRef = useRef(null)

  // Sort: focused first, then by severity, absent last
  const entries = contracts.map(c => ({ contract: c, cell: getCell(c, clauseKey) }))
  entries.sort((a, b) => {
    if (a.contract.id === focusId) return -1
    if (b.contract.id === focusId) return  1
    if (!a.cell && !b.cell) return 0
    if (!a.cell) return  1
    if (!b.cell) return -1
    return (SEV_ORDER[a.cell.severity] ?? 9) - (SEV_ORDER[b.cell.severity] ?? 9)
  })

  useEffect(() => {
    focusRef.current?.scrollIntoView({ block: 'nearest' })
  }, [clauseKey, focusId])

  const present = entries.filter(e => e.cell).length

  return (
    <div style={{
      width: 380, minWidth: 380,
      borderLeft: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-raised)',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>{clauseLabel}</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
            {present} of {contracts.length} contracts · side-by-side comparison
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: 'var(--text-3)', lineHeight: 1,
            padding: '2px 4px', borderRadius: 4,
          }}
          title="Close"
        >×</button>
      </div>

      {/* Entries */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
        {entries.map(({ contract, cell }) => {
          const isFocused = contract.id === focusId
          const sev = SEV_STYLE[cell?.severity]
          return (
            <div
              key={contract.id}
              ref={isFocused ? focusRef : null}
              style={{
                margin: '0 12px 8px',
                padding: '12px 14px',
                borderRadius: 8,
                border: isFocused
                  ? '1.5px solid var(--gold)'
                  : '1px solid var(--border)',
                background: isFocused
                  ? 'rgba(108,71,255,0.04)'
                  : 'var(--surface)',
              }}
            >
              {/* Contract name + severity */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: cell ? 8 : 0 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                    onClick={() => navigate('brief', contract.id, clauseKey)}
                  >
                    {contract.name}
                  </span>
                  {contract.counterparty && (
                    <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 6 }}>
                      · {contract.counterparty}
                    </span>
                  )}
                </div>
                {cell && sev && (
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
                    padding: '2px 7px', borderRadius: 4, flexShrink: 0,
                    color: sev.color, background: sev.bg,
                  }}>
                    {cell.severity.toUpperCase()}
                  </span>
                )}
                {!cell && (
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontStyle: 'italic' }}>absent</span>
                )}
              </div>

              {cell ? (
                <>
                  {/* Section title */}
                  <div style={{
                    fontSize: 11, fontFamily: 'JetBrains Mono, monospace',
                    color: 'var(--text-3)', marginBottom: 6,
                  }}>
                    {cell.title}
                  </div>
                  {/* Quoted clause text */}
                  <div style={{
                    fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6,
                    borderLeft: `3px solid ${sev?.color || 'var(--border-2)'}`,
                    paddingLeft: 10, fontStyle: 'italic',
                  }}>
                    "{cell.description}"
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontStyle: 'italic' }}>
                  No {clauseLabel.toLowerCase()} clause identified in this contract.
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RiskMap({ navigate }) {
  const [contracts,  setContracts]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [drilldown,  setDrilldown]  = useState(null) // { key, label, focusId }

  useEffect(() => {
    api.getContracts()
      .then(data => setContracts(data.filter(c => c.status === 'completed')))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" />Loading…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>

  function openDrill(key, label, focusId = null, e) {
    e?.stopPropagation()
    setDrilldown(prev =>
      prev?.key === key && prev?.focusId === focusId ? null : { key, label, focusId }
    )
  }

  const allRisks = contracts.flatMap(c =>
    (c.risk_clauses || []).map(r => ({ ...r, contract_name: c.name, contract_id: c.id }))
  ).filter(r => r.severity === 'critical' || r.severity === 'high')
    .sort((a, b) => (a.severity === 'critical' ? -1 : 1))
    .slice(0, 5)

  const criticalCount = contracts.reduce((sum, c) =>
    sum + (c.risk_clauses?.filter(r => r.severity === 'critical').length || 0), 0)
  const ipRiskCount = contracts.filter(c =>
    c.risk_clauses?.some(r => r.type === 'ip_ownership')
  ).length

  return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* ── Left: main content ── */}
      <div className="content" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ marginBottom: 20 }}>
          <div className="section-header">
            <div>
              <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Risk Heat Map
              </h2>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                Clause-level risk across {contracts.length} vendor contracts
                {drilldown && (
                  <span style={{ marginLeft: 8, color: 'var(--gold)', fontWeight: 600 }}>
                    · viewing {drilldown.label}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 12, color: 'var(--text-3)', flexWrap: 'wrap' }}>
              <span>🔴 Critical</span>
              <span>🟡 High</span>
              <span>🔵 Medium</span>
              <span>🟢 Low</span>
              {!drilldown && (
                <span style={{ color: 'var(--text-3)', fontStyle: 'italic' }}>
                  Click a column or cell to compare
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Heatmap table */}
        <div className="card" style={{ padding: '0 0 4px', marginBottom: 20 }}>
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Vendor</th>
                {CLAUSE_COLS.map(col => {
                  const isActive = drilldown?.key === col.key
                  return (
                    <th
                      key={col.key}
                      onClick={e => openDrill(col.key, col.label, null, e)}
                      style={{
                        cursor: 'pointer',
                        color: isActive ? 'var(--gold)' : undefined,
                        borderBottom: isActive ? '2px solid var(--gold)' : undefined,
                        userSelect: 'none',
                      }}
                      title={`Compare ${col.label} across all contracts`}
                    >
                      {col.label}
                      {isActive && <span style={{ marginLeft: 4, fontSize: 8 }}>▼</span>}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div
                      className="hm-vendor"
                      style={{ cursor: 'pointer', color: 'var(--gold)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                      onClick={() => navigate('brief', c.id)}
                    >{c.name}</div>
                    <div className="hm-value">{fmt(c.total_value) || '—'}</div>
                  </td>
                  {CLAUSE_COLS.map(col => {
                    const cell = getCell(c, col.key)
                    const isColActive = drilldown?.key === col.key
                    const isCellFocused = drilldown?.key === col.key && drilldown?.focusId === c.id
                    return (
                      <td
                        key={col.key}
                        style={{ background: isColActive ? 'rgba(108,71,255,0.03)' : undefined }}
                      >
                        {cell ? (
                          <div
                            className={`hm-cell ${SEV_CELL[cell.severity] || 'l'}`}
                            title={`Click to compare ${col.label} across all contracts`}
                            onClick={e => openDrill(col.key, col.label, c.id, e)}
                            style={{
                              outline: isCellFocused ? '2px solid var(--gold)' : undefined,
                              outlineOffset: 2,
                            }}
                          >
                            {SEV_EMOJI[cell.severity] || '🟢'}
                          </div>
                        ) : (
                          <div
                            className="hm-cell n"
                            title="Not present — click to compare"
                            onClick={e => openDrill(col.key, col.label, c.id, e)}
                          >—</div>
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
                    style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '9px 10px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 7 }}
                  >
                    <span className={`risk-pill ${r.severity}`} style={{ fontSize: 10, flexShrink: 0 }}>
                      {r.severity}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{r.title}</div>
                      <div
                        style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}
                        onClick={() => navigate('brief', r.contract_id)}
                      >{r.contract_name}</div>
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

      {/* ── Right: drill-down panel ── */}
      {drilldown && (
        <DrillPanel
          clauseKey={drilldown.key}
          clauseLabel={drilldown.label}
          contracts={contracts}
          focusId={drilldown.focusId}
          onClose={() => setDrilldown(null)}
          navigate={navigate}
        />
      )}
    </div>
  )
}
