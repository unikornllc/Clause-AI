import { useState, useEffect } from 'react'
import { api } from '../api'
import PdfViewer from './PdfViewer'

function fmt(v, cur) {
  if (v == null) return '—'
  if (v >= 1_000_000) return `${cur || '$'}${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `${cur || '$'}${Math.round(v / 1_000)}k`
  return `${cur || '$'}${v}`
}

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(s) {
  if (!s) return null
  return Math.round((new Date(s) - new Date()) / 86400000)
}

// Render plain_english_summary with **bold** markdown
function Summary({ text }) {
  if (!text) return null
  const paras = text.split('\n\n').filter(Boolean)
  return (
    <>
      {paras.map((para, pi) => {
        const tokens = para.split(/(\*\*[^*]+\*\*)/g)
        return (
          <p key={pi}>
            {tokens.map((tok, ti) =>
              tok.startsWith('**') && tok.endsWith('**')
                ? <strong key={ti}>{tok.slice(2, -2)}</strong>
                : tok
            )}
          </p>
        )
      })}
    </>
  )
}

export default function ContractBrief({ contractId, navigate, focusClause }) {
  const [contract,     setContract]     = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)
  const [activeItem,   setActiveItem]   = useState(null)   // { page_number, text_snippet, id, kind }

  useEffect(() => {
    if (!contractId) { setLoading(false); return }
    api.getContract(contractId)
      .then(setContract)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [contractId])

  // Reset active item when contract changes
  useEffect(() => { setActiveItem(null) }, [contractId])

  // When a focusClause is provided (navigated from Risk Map drill-down),
  // highlight the matching risk clause and scroll to it
  useEffect(() => {
    if (!contract || !focusClause) return
    const match = contract.risk_clauses?.find(r => r.type === focusClause)
    if (!match) return
    setActiveItem({ ...match, kind: 'risk' })
    setTimeout(() => {
      document.getElementById(`risk-clause-${focusClause}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 120)
  }, [contract, focusClause])

  async function handleDelete() {
    if (!window.confirm(`Delete "${contract?.name}"? This cannot be undone.`)) return
    try {
      await api.deleteContract(contractId)
      navigate('dashboard')
    } catch (e) {
      alert('Delete failed: ' + e.message)
    }
  }

  function handleItemClick(item, kind) {
    const isSame = activeItem?.id === item.id && activeItem?.kind === kind
    setActiveItem(isSame ? null : { ...item, kind })
  }

  if (!contractId) return (
    <div className="content">
      <div className="empty-state">
        <div className="empty-state-icon">📄</div>
        <div className="empty-state-title">No contract selected</div>
        <div className="empty-state-sub">Click a contract from the Dashboard, or upload one.</div>
      </div>
    </div>
  )

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" />Loading…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>
  if (!contract) return null

  const days         = daysUntil(contract.expiration_date)
  const topSeverity  = contract.risk_clauses?.[0]?.severity || 'low'
  const autoNoticeBy = contract.expiration_date && contract.auto_renewal_notice_days
    ? new Date(new Date(contract.expiration_date) - contract.auto_renewal_notice_days * 86400000)
        .toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  const hasPdf = contract.has_pdf

  return (
    <div className="content">
      {/* Header */}
      <div className="brief-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <span className={`risk-pill ${topSeverity}`}>
            {topSeverity === 'critical' ? '⚠ Critical Risk' :
             topSeverity === 'high'     ? '⚡ High Risk'     :
             topSeverity === 'medium'   ? 'ℹ Medium Risk'   : '✓ Low Risk'}
          </span>
          <span className="mono" style={{ fontSize: 11 }}>
            {contract.contract_type} · {contract.governing_law || 'Governing law unspecified'}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('dashboard')}
            >
              ← All contracts
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
            >
              🗑 Delete
            </button>
          </div>
        </div>
        <h1 className="brief-title">{contract.name}</h1>
        <div className="brief-meta">
          {contract.effective_date  && <span>📅 Signed {fmtDate(contract.effective_date)}</span>}
          {contract.expiration_date && <span>⏱ Expires {fmtDate(contract.expiration_date)} {days !== null && `(${days > 0 ? days + 'd' : 'expired'})`}</span>}
          {contract.total_value     && <span>💰 {fmt(contract.total_value, contract.currency === 'USD' ? '$' : contract.currency === 'GBP' ? '£' : '€')}/year</span>}
          {contract.governing_law   && <span>⚖️ {contract.governing_law}</span>}
        </div>
      </div>

      {/* Main body — three columns when PDF exists, two otherwise */}
      <div className={hasPdf ? 'three-col' : 'two-col'}>

        {/* LEFT — Summary + Key Details */}
        <div>
          <div style={{ marginBottom: 18 }}>
            <div className="section-title" style={{ marginBottom: 10 }}>What you actually agreed to</div>
            <div className="plain-english">
              <Summary text={contract.plain_english_summary} />
            </div>
          </div>

          <div className="section-title" style={{ marginBottom: 10 }}>Key Details</div>
          <div className="detail-grid">
            <div className="detail-item">
              <div className="detail-key">Auto-renewal</div>
              <div className="detail-val" style={{ color: contract.auto_renewal ? 'var(--red)' : 'var(--green)' }}>
                {contract.auto_renewal
                  ? `🔴 Yes · ${contract.auto_renewal_term_years || 1}-year term`
                  : '🟢 No auto-renewal'}
              </div>
            </div>
            {autoNoticeBy && (
              <div className="detail-item">
                <div className="detail-key">Cancel-by date</div>
                <div className="detail-val mono" style={{ color: days !== null && days < 90 ? 'var(--red)' : 'var(--text)' }}>
                  {autoNoticeBy}
                </div>
              </div>
            )}
            <div className="detail-item">
              <div className="detail-key">Contract value</div>
              <div className="detail-val mono">
                {contract.total_value ? `${fmt(contract.total_value, '$')} / year` : '—'}
              </div>
            </div>
            <div className="detail-item">
              <div className="detail-key">Governing law</div>
              <div className="detail-val">{contract.governing_law || '—'}</div>
            </div>
            <div className="detail-item">
              <div className="detail-key">Parties</div>
              <div className="detail-val" style={{ fontSize: 12 }}>{(contract.parties || []).join(' · ')}</div>
            </div>
            <div className="detail-item">
              <div className="detail-key">Contract type</div>
              <div className="detail-val">{contract.contract_type || '—'}</div>
            </div>
          </div>
        </div>

        {/* MIDDLE — PDF Viewer (only when PDF exists) */}
        {hasPdf && (
          <div className="pdf-panel">
            <div className="section-title" style={{ marginBottom: 10 }}>
              Contract Document
              {activeItem?.section_ref && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 400, color: 'var(--text-3)' }}>
                  · {activeItem.section_ref}
                </span>
              )}
            </div>
            <PdfViewer
              contractId={contractId}
              sectionRef={activeItem?.section_ref || null}
              fallbackPage={activeItem?.page_number || 1}
            />
          </div>
        )}

        {/* RIGHT — Risk Flags + Obligations */}
        <div>
          <div className="section-title" style={{ marginBottom: 10 }}>
            Risk Flags
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
              ({contract.risk_clauses?.length || 0} found)
            </span>
            {hasPdf && (
              <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                · click to view in PDF
              </span>
            )}
          </div>
          {contract.risk_clauses?.length > 0 ? (
            <div className="risk-list">
              {contract.risk_clauses.map(r => {
                const isActive = activeItem?.id === r.id && activeItem?.kind === 'risk'
                return (
                  <div
                    key={r.id}
                    id={`risk-clause-${r.type}`}
                    className={`risk-item ${r.severity}${isActive ? ' risk-item-active' : ''}${hasPdf && r.page_number ? ' risk-item-clickable' : ''}`}
                    onClick={() => hasPdf && r.page_number && handleItemClick(r, 'risk')}
                  >
                    <div className={`risk-dot ${r.severity}`} />
                    <div style={{ flex: 1 }}>
                      <div className="risk-text-title">
                        {r.title}
                        {hasPdf && r.page_number && (
                          <span className="risk-page-badge">p.{r.page_number}</span>
                        )}
                      </div>
                      <div className="risk-text-desc">{r.description}</div>
                      {r.section_ref && <div className="risk-text-clause">{r.section_ref}</div>}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No risk clauses flagged.</div>
          )}

          {/* Obligations */}
          {contract.obligations?.length > 0 && (
            <div style={{ marginTop: 18 }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                Obligations
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                  ({contract.obligations.length})
                </span>
                {hasPdf && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                    · click to view in PDF
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {contract.obligations.map(o => {
                  const isActive = activeItem?.id === o.id && activeItem?.kind === 'obligation'
                  return (
                    <div
                      key={o.id}
                      className={`obligation-item${isActive ? ' obligation-item-active' : ''}${hasPdf && o.page_number ? ' risk-item-clickable' : ''}`}
                      onClick={() => hasPdf && o.page_number && handleItemClick(o, 'obligation')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{o.title}</span>
                        {hasPdf && o.page_number && (
                          <span className="risk-page-badge">p.{o.page_number}</span>
                        )}
                        {o.status === 'overdue'   && <span className="risk-pill critical" style={{ fontSize: 10 }}>overdue</span>}
                        {o.status === 'completed' && <span className="risk-pill low"      style={{ fontSize: 10 }}>done</span>}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontFamily: 'JetBrains Mono, monospace' }}>
                        {o.trigger_type === 'event_based' ? '⚡ Event-based' : o.due_date ? `Due ${fmtDate(o.due_date)}` : '—'}
                        {' · '}{o.owner_team}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* No PDF notice for seed contracts */}
          {!hasPdf && (
            <div className="pdf-no-file">
              <div className="pdf-no-file-icon">📄</div>
              <div>No PDF on file</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                Upload a contract PDF to see it here with mapped insights
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
