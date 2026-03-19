import { useState, useEffect } from 'react'
import { api } from '../api'
import PdfViewer from './PdfViewer'

// ── Helpers ───────────────────────────────────────────────────
const CONTRACT_TYPES = ['SaaS', 'NDA', 'MSA', 'Employment', 'Services', 'Data', 'Cloud', 'Other']

const RISK_TYPES = [
  { key: 'liability_cap',   label: 'Liability Cap' },
  { key: 'ip_ownership',    label: 'IP Ownership' },
  { key: 'auto_renewal',    label: 'Auto-Renewal' },
  { key: 'price_change',    label: 'Price Change' },
  { key: 'termination',     label: 'Termination' },
  { key: 'indemnification', label: 'Indemnification' },
  { key: 'audit_rights',    label: 'Audit Rights' },
  { key: 'data_ownership',  label: 'Data Ownership' },
  { key: 'non_compete',     label: 'Non-Compete' },
  { key: 'sla_penalty',     label: 'SLA Penalty' },
]

const SEV_COLOR = { critical: 'var(--red)', high: 'var(--amber)', medium: 'var(--blue)', low: 'var(--green)' }
const SEV_BG    = { critical: 'var(--red-dim)', high: '#FEF3C7', medium: '#DBEAFE', low: 'var(--green-dim)' }
const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

function fmt(v) {
  if (!v) return null
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(s) {
  if (!s) return null
  return Math.round((new Date(s) - new Date()) / 86400000)
}

// ── Left panel: single contract card ─────────────────────────
function ContractCard({ contract, selected, compareMode, onSelect, onCompare }) {
  const days = daysUntil(contract.expiration_date)
  const topSev = contract.risk_clauses?.[0]?.severity || 'low'

  return (
    <div
      className={`lib-card${selected ? ' lib-card-active' : ''}`}
      onClick={() => onSelect(contract.id)}
    >
      <div className="lib-card-header">
        <span className={`risk-pill ${topSev}`} style={{ fontSize: 10 }}>
          {topSev === 'critical' ? '⚠ Critical' : topSev === 'high' ? '⚡ High' : topSev === 'medium' ? 'ℹ Medium' : '✓ Low'}
        </span>
        <span className="lib-type-badge">{contract.contract_type || '—'}</span>
      </div>
      <div className="lib-card-name">{contract.name}</div>
      <div className="lib-card-meta">
        {fmt(contract.total_value) && <span>{fmt(contract.total_value)}/yr</span>}
        {days !== null && (
          <span style={{ color: days < 30 ? 'var(--red)' : days < 90 ? 'var(--amber)' : 'var(--text-3)' }}>
            {days > 0 ? `${days}d left` : 'Expired'}
          </span>
        )}
        {contract.has_pdf && <span className="lib-pdf-badge">PDF</span>}
      </div>
      {compareMode && (
        <button
          className={`lib-compare-btn${selected ? ' active' : ''}`}
          onClick={e => { e.stopPropagation(); onCompare(contract.id) }}
        >
          {selected ? '✓ In comparison' : '+ Compare'}
        </button>
      )}
    </div>
  )
}

// ── Clause / obligation row ───────────────────────────────────
function ClauseItem({ item, kind, isActive, hasPdf, onClick }) {
  const sev = item.severity
  return (
    <div
      className={`lib-clause-item${isActive ? ' active' : ''}${hasPdf && item.page_number ? ' clickable' : ''}`}
      onClick={() => hasPdf && item.page_number && onClick()}
    >
      <div className="lib-clause-row">
        {kind === 'risk' ? (
          <span className="lib-clause-kind-dot" style={{ background: SEV_COLOR[sev] || 'var(--text-3)' }} />
        ) : (
          <span className="lib-clause-kind-dot" style={{ background: 'var(--gold)' }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="lib-clause-title" dir="auto">{item.title}</div>
          <div className="lib-clause-desc" dir="auto">{item.description}</div>
          {item.section_ref && (
            <div className="lib-clause-ref" dir="auto">{item.section_ref}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flexShrink: 0 }}>
          {kind === 'risk' && sev && (
            <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 5px', borderRadius: 3,
              color: SEV_COLOR[sev], background: SEV_BG[sev] }}>
              {sev.toUpperCase()}
            </span>
          )}
          {hasPdf && item.page_number && (
            <span className="risk-page-badge">p.{item.page_number}</span>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Single contract detail panel ──────────────────────────────
function ContractDetail({ contract, activeItem, onItemClick, compact = false }) {
  const [tab, setTab] = useState('risks')

  const risks = [...(contract.risk_clauses || [])].sort(
    (a, b) => (SEV_ORDER[a.severity] ?? 9) - (SEV_ORDER[b.severity] ?? 9)
  )
  const obligations = contract.obligations || []
  const hasPdf = contract.has_pdf

  const items = tab === 'risks'
    ? risks.map(r => ({ item: r, kind: 'risk' }))
    : tab === 'obligations'
      ? obligations.map(o => ({ item: o, kind: 'obligation' }))
      : [
          ...risks.map(r => ({ item: r, kind: 'risk' })),
          ...obligations.map(o => ({ item: o, kind: 'obligation' })),
        ]

  return (
    <div className="lib-detail">
      {/* Contract header */}
      <div className="lib-detail-header">
        <div className="lib-detail-name">{contract.name}</div>
        <div className="lib-detail-meta">
          <span className="lib-type-badge">{contract.contract_type}</span>
          {fmt(contract.total_value) && <span>{fmt(contract.total_value)}/yr</span>}
          {contract.expiration_date && (
            <span>Expires {fmtDate(contract.expiration_date)}</span>
          )}
          {(contract.parties || []).length > 0 && (
            <span style={{ color: 'var(--text-3)' }}>{(contract.parties || []).join(' · ')}</span>
          )}
        </div>
      </div>

      {/* Body: clauses list + PDF */}
      <div className="lib-detail-body">
        {/* Clauses panel */}
        <div className="lib-clauses-panel">
          {/* Tab bar */}
          <div className="lib-tabs">
            {[['risks', `Risks (${risks.length})`], ['obligations', `Obligations (${obligations.length})`], ['all', 'All']].map(([k, label]) => (
              <button key={k} className={`lib-tab${tab === k ? ' active' : ''}`} onClick={() => setTab(k)}>
                {label}
              </button>
            ))}
            {hasPdf && activeItem && (
              <span className="lib-pdf-hint">· click to navigate PDF</span>
            )}
          </div>

          {/* Items */}
          <div className="lib-clauses-scroll">
            {items.length === 0 ? (
              <div style={{ padding: '16px 14px', color: 'var(--text-3)', fontSize: 12 }}>None found.</div>
            ) : items.map(({ item, kind }) => {
              const isActive = activeItem?.id === item.id && activeItem?.kind === kind
              return (
                <ClauseItem
                  key={`${kind}-${item.id}`}
                  item={item} kind={kind}
                  isActive={isActive} hasPdf={hasPdf}
                  onClick={() => onItemClick(contract.id, item, kind)}
                />
              )
            })}
          </div>
        </div>

        {/* PDF panel */}
        {hasPdf && (
          <div className="lib-pdf-panel">
            <div className="lib-pdf-label">
              Contract PDF
              {activeItem?.section_ref && (
                <span style={{ marginLeft: 8, fontWeight: 400, color: 'var(--text-3)', fontSize: 11 }}>
                  · {activeItem.section_ref}
                </span>
              )}
            </div>
            <PdfViewer
              contractId={contract.id}
              sectionRef={activeItem?.section_ref || null}
              fallbackPage={activeItem?.page_number || 1}
            />
          </div>
        )}

        {!hasPdf && (
          <div className="lib-no-pdf">
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>No PDF on file</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
              Upload the contract PDF to enable section navigation
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Compare: aligned risk table + side-by-side obligations ────
function CompareView({ contracts, activeItems, onItemClick }) {
  const [section, setSection] = useState('risks')

  const [a, b] = contracts

  // Aligned risk rows: all clause types present in either contract
  const presentTypes = RISK_TYPES.filter(t =>
    a.risk_clauses?.some(r => r.type === t.key) ||
    b.risk_clauses?.some(r => r.type === t.key)
  )

  function getClause(contract, typeKey) {
    return contract.risk_clauses?.find(r => r.type === typeKey) || null
  }

  return (
    <div className="lib-compare">
      {/* Compare tab bar */}
      <div className="lib-compare-tabs">
        <button className={`lib-tab${section === 'risks' ? ' active' : ''}`} onClick={() => setSection('risks')}>
          Risk Clauses
        </button>
        <button className={`lib-tab${section === 'obligations' ? ' active' : ''}`} onClick={() => setSection('obligations')}>
          Obligations
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--text-3)', alignSelf: 'center' }}>
          Click a clause to view in PDF ↓
        </span>
      </div>

      {section === 'risks' && (
        <>
          {/* Aligned clause comparison table */}
          <div className="lib-compare-table">
            <div className="lib-compare-thead">
              <div className="lib-compare-label-col">Clause Type</div>
              <div className="lib-compare-contract-col">{a.name}</div>
              <div className="lib-compare-contract-col">{b.name}</div>
            </div>
            <div className="lib-compare-tbody">
              {presentTypes.map(t => {
                const ca = getClause(a, t.key)
                const cb = getClause(b, t.key)
                const activeA = activeItems[a.id]?.id === ca?.id && activeItems[a.id]?.kind === 'risk'
                const activeB = activeItems[b.id]?.id === cb?.id && activeItems[b.id]?.kind === 'risk'
                return (
                  <div key={t.key} className="lib-compare-row">
                    <div className="lib-compare-label-col">
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-2)' }}>{t.label}</span>
                    </div>
                    <div
                      className={`lib-compare-cell${activeA ? ' active' : ''}${ca && a.has_pdf ? ' clickable' : ''}`}
                      onClick={() => ca && a.has_pdf && onItemClick(a.id, ca, 'risk')}
                    >
                      {ca ? (
                        <>
                          <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '1px 5px',
                            borderRadius: 3, marginBottom: 4,
                            color: SEV_COLOR[ca.severity], background: SEV_BG[ca.severity] }}>
                            {ca.severity.toUpperCase()}
                          </span>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }} dir="auto">{ca.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }} dir="auto">{ca.description}</div>
                          {ca.section_ref && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }} dir="auto">{ca.section_ref}</div>}
                          {a.has_pdf && ca.page_number && <span className="risk-page-badge" style={{ marginTop: 4, display: 'inline-block' }}>p.{ca.page_number}</span>}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>— Not present</span>
                      )}
                    </div>
                    <div
                      className={`lib-compare-cell${activeB ? ' active' : ''}${cb && b.has_pdf ? ' clickable' : ''}`}
                      onClick={() => cb && b.has_pdf && onItemClick(b.id, cb, 'risk')}
                    >
                      {cb ? (
                        <>
                          <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '1px 5px',
                            borderRadius: 3, marginBottom: 4,
                            color: SEV_COLOR[cb.severity], background: SEV_BG[cb.severity] }}>
                            {cb.severity.toUpperCase()}
                          </span>
                          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }} dir="auto">{cb.title}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }} dir="auto">{cb.description}</div>
                          {cb.section_ref && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }} dir="auto">{cb.section_ref}</div>}
                          {b.has_pdf && cb.page_number && <span className="risk-page-badge" style={{ marginTop: 4, display: 'inline-block' }}>p.{cb.page_number}</span>}
                        </>
                      ) : (
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontStyle: 'italic' }}>— Not present</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {section === 'obligations' && (
        <div className="lib-compare-obl">
          <div className="lib-compare-obl-col">
            <div className="lib-compare-obl-header">{a.name}</div>
            {(a.obligations || []).length === 0
              ? <div style={{ padding: 12, color: 'var(--text-3)', fontSize: 12 }}>No obligations.</div>
              : (a.obligations || []).map(o => {
                  const isActive = activeItems[a.id]?.id === o.id && activeItems[a.id]?.kind === 'obligation'
                  return (
                    <ClauseItem key={o.id} item={o} kind="obligation"
                      isActive={isActive} hasPdf={a.has_pdf}
                      onClick={() => onItemClick(a.id, o, 'obligation')} />
                  )
                })}
          </div>
          <div className="lib-compare-obl-col" style={{ borderLeft: '1px solid var(--border)' }}>
            <div className="lib-compare-obl-header">{b.name}</div>
            {(b.obligations || []).length === 0
              ? <div style={{ padding: 12, color: 'var(--text-3)', fontSize: 12 }}>No obligations.</div>
              : (b.obligations || []).map(o => {
                  const isActive = activeItems[b.id]?.id === o.id && activeItems[b.id]?.kind === 'obligation'
                  return (
                    <ClauseItem key={o.id} item={o} kind="obligation"
                      isActive={isActive} hasPdf={b.has_pdf}
                      onClick={() => onItemClick(b.id, o, 'obligation')} />
                  )
                })}
          </div>
        </div>
      )}

      {/* PDF viewers — always visible, one per contract */}
      <div className="lib-compare-pdfs">
        {[a, b].map(contract => (
          <div key={contract.id} className="lib-compare-pdf-col">
            {contract.has_pdf ? (
              <PdfViewer
                contractId={contract.id}
                sectionRef={activeItems[contract.id]?.section_ref || null}
                fallbackPage={activeItems[contract.id]?.page_number || 1}
              />
            ) : (
              <div className="lib-no-pdf" style={{ flex: 1 }}>
                <div style={{ fontSize: 22 }}>📄</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>No PDF on file</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────
export default function ContractLibrary({ navigate }) {
  const [contracts,    setContracts]   = useState([])
  const [loading,      setLoading]     = useState(true)
  const [error,        setError]       = useState(null)
  const [filterType,   setFilterType]  = useState('all')
  const [search,       setSearch]      = useState('')
  const [compareMode,  setCompareMode] = useState(false)
  const [selectedIds,  setSelectedIds] = useState([])    // [id] or [id, id]
  const [activeItems,  setActiveItems] = useState({})    // { contractId: { ...item, kind } }

  useEffect(() => {
    api.getContracts()
      .then(data => setContracts(data.filter(c => c.status === 'completed')))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Filter + search
  const filtered = contracts.filter(c => {
    const matchType = filterType === 'all' || c.contract_type === filterType
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.parties || []).some(p => p.toLowerCase().includes(search.toLowerCase()))
    return matchType && matchSearch
  })

  // Types present in current contracts
  const presentTypes = ['all', ...CONTRACT_TYPES.filter(t => contracts.some(c => c.contract_type === t))]

  function handleSelect(id) {
    if (compareMode) {
      setSelectedIds(prev => {
        if (prev.includes(id)) return prev.filter(x => x !== id)
        if (prev.length >= 2)  return [prev[1], id]
        return [...prev, id]
      })
    } else {
      setSelectedIds(prev => prev[0] === id ? [] : [id])
    }
  }

  function handleCompareToggle() {
    setCompareMode(m => {
      if (!m) {
        // entering compare mode: keep up to 2 already selected
        setSelectedIds(prev => prev.slice(0, 2))
      } else {
        // leaving compare mode: keep first selected only
        setSelectedIds(prev => prev.slice(0, 1))
      }
      return !m
    })
  }

  function handleItemClick(contractId, item, kind) {
    setActiveItems(prev => {
      const current = prev[contractId]
      const isSame  = current?.id === item.id && current?.kind === kind
      return { ...prev, [contractId]: isSame ? null : { ...item, kind } }
    })
  }

  const selectedContracts = selectedIds
    .map(id => contracts.find(c => c.id === id))
    .filter(Boolean)

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" />Loading…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>

  return (
    <div className="library-layout">

      {/* ── Left: contract list ── */}
      <div className="library-sidebar">
        {/* Search */}
        <div className="library-search-wrap">
          <input
            className="library-search"
            placeholder="Search contracts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <div className="library-type-filters">
          {presentTypes.map(t => (
            <button
              key={t}
              className={`lib-type-chip${filterType === t ? ' active' : ''}`}
              onClick={() => setFilterType(t)}
            >
              {t === 'all' ? 'All' : t}
            </button>
          ))}
        </div>

        {/* Compare toggle */}
        <div className="library-compare-toggle">
          <button
            className={`lib-compare-toggle-btn${compareMode ? ' active' : ''}`}
            onClick={handleCompareToggle}
          >
            {compareMode ? '✓ Compare mode' : '⇄ Compare two'}
          </button>
          {compareMode && (
            <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
              {selectedIds.length}/2 selected
            </span>
          )}
        </div>

        {/* Contract list */}
        <div className="library-list">
          {filtered.length === 0 ? (
            <div style={{ padding: '20px 14px', color: 'var(--text-3)', fontSize: 12 }}>No contracts match.</div>
          ) : filtered.map(c => (
            <ContractCard
              key={c.id}
              contract={c}
              selected={selectedIds.includes(c.id)}
              compareMode={compareMode}
              onSelect={handleSelect}
              onCompare={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* ── Right: detail / compare ── */}
      <div className="library-main">
        {selectedContracts.length === 0 && (
          <div className="lib-empty">
            <div style={{ fontSize: 36, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              Select a contract
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              {compareMode
                ? 'Select two contracts from the list to compare side by side.'
                : 'Click any contract on the left to view its clauses and PDF.'}
            </div>
          </div>
        )}

        {!compareMode && selectedContracts.length === 1 && (
          <ContractDetail
            contract={selectedContracts[0]}
            activeItem={activeItems[selectedContracts[0].id]}
            onItemClick={handleItemClick}
          />
        )}

        {compareMode && selectedContracts.length === 2 && (
          <CompareView
            contracts={selectedContracts}
            activeItems={activeItems}
            onItemClick={handleItemClick}
          />
        )}

        {compareMode && selectedContracts.length === 1 && (
          <div className="lib-empty">
            <div style={{ fontSize: 28, marginBottom: 10 }}>⇄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              Select one more contract
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
              "{selectedContracts[0].name}" is selected. Pick a second contract to compare.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
