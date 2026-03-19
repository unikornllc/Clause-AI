import { useState, useEffect } from 'react'
import { api } from '../api'

function fmt(v) {
  if (!v && v !== 0) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

const PRIORITY_STYLE = {
  critical: { color: 'var(--red)',   bg: 'var(--red-dim)',   label: 'CRITICAL' },
  high:     { color: 'var(--amber)', bg: '#FEF3C7',          label: 'HIGH' },
  medium:   { color: 'var(--blue)',  bg: '#DBEAFE',          label: 'MEDIUM' },
  low:      { color: 'var(--green)', bg: 'var(--green-dim)', label: 'LOW' },
}

const BENCHMARK_STYLE = {
  below_average:  { color: 'var(--red)',   icon: '↓', label: 'Below avg' },
  average:        { color: 'var(--amber)', icon: '→', label: 'Average' },
  above_average:  { color: 'var(--green)', icon: '↑', label: 'Above avg' },
  favorable:      { color: 'var(--green)', icon: '✓', label: 'Favorable' },
  no_data:        { color: 'var(--text-3)',icon: '?', label: 'No data' },
}

function LeverageBar({ score }) {
  const pct   = Math.round((score / 5) * 100)
  const color = score >= 4 ? 'var(--red)' : score >= 3 ? 'var(--amber)' : 'var(--green)'
  const label = score >= 4 ? 'Strong leverage — many unfavourable terms to push back on'
              : score >= 3 ? 'Moderate leverage — some key points to negotiate'
              :               'Weak leverage — terms are broadly acceptable'
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
        <span style={{ color: 'var(--text-2)' }}>Negotiation leverage</span>
        <span style={{ fontWeight: 700, color }}>{score}/5</span>
      </div>
      <div style={{ height: 8, background: 'var(--surface-2)', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.6s ease' }} />
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{label}</div>
    </div>
  )
}

function ClauseCard({ clause }) {
  const [open, setOpen] = useState(false)
  const p = PRIORITY_STYLE[clause.priority] || PRIORITY_STYLE.low
  const b = BENCHMARK_STYLE[clause.benchmark_rating] || BENCHMARK_STYLE.no_data

  return (
    <div
      style={{
        border: `1px solid var(--border)`,
        borderLeft: `3px solid ${p.color}`,
        borderRadius: 8, background: 'var(--surface)',
        marginBottom: 8, overflow: 'hidden',
      }}
    >
      {/* Header row */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', cursor: 'pointer' }}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, flexShrink: 0, color: p.color, background: p.bg }}>
          {p.label}
        </span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{clause.label}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: b.color, flexShrink: 0 }}>
          {b.icon} {b.label}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* Two-col summary — always visible */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, borderTop: '1px solid var(--border)' }}>
        <div style={{ padding: '10px 14px', borderRight: '1px solid var(--border)' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-3)', marginBottom: 4 }}>Your position</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{clause.your_position}</div>
        </div>
        <div style={{ padding: '10px 14px' }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-3)', marginBottom: 4 }}>Portfolio benchmark</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>{clause.portfolio_benchmark}</div>
        </div>
      </div>

      {/* Expanded: talking point + suggested ask */}
      {open && (
        <div style={{ borderTop: '1px solid var(--border)', padding: '12px 14px', background: 'var(--bg-raised)' }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-3)', marginBottom: 5 }}>Negotiation talking point</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, fontStyle: 'italic' }}>"{clause.talking_point}"</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 12px', background: 'rgba(108,71,255,0.06)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 7 }}>
            <span style={{ fontSize: 13, flexShrink: 0 }}>💡</span>
            <div>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--gold)', fontWeight: 700, marginBottom: 3 }}>Suggested ask</div>
              <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{clause.suggested_ask}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Negotiations({ navigate }) {
  const [contracts,    setContracts]    = useState([])
  const [selected,     setSelected]     = useState(null)
  const [result,       setResult]       = useState(null)
  const [loading,      setLoading]      = useState(false)
  const [loadingData,  setLoadingData]  = useState(true)
  const [error,        setError]        = useState(null)
  const [streamStatus, setStreamStatus] = useState(null)

  useEffect(() => {
    api.getContracts()
      .then(data => {
        const completed = data.filter(c => c.status === 'completed')
        setContracts(completed)
        if (completed.length > 0) setSelected(completed[0].id)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoadingData(false))
  }, [])

  // Auto-load cached analysis when contract changes
  useEffect(() => {
    if (!selected) return
    setResult(null)
    setError(null)
    api.getNegotiation(selected)
      .then(r => { if (r.cached) setResult(r) })
      .catch(() => {})
  }, [selected])

  async function runAnalysis() {
    if (!selected || loading) return
    setLoading(true)
    setError(null)
    setStreamStatus('Connecting…')
    try {
      const token = localStorage.getItem('clause_token')
      const res = await fetch(`/api/negotiations/${selected}/analyze`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        let msg = `HTTP ${res.status}`
        try { const d = await res.json(); msg = d.detail || msg } catch {}
        throw new Error(msg)
      }
      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let chars  = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = JSON.parse(line.slice(6))
          if (data.error) throw new Error(data.error)
          if (data.t) { chars += data.t.length; setStreamStatus(`Analysing… ${chars} chars`) }
          if (data.done) { setResult(data); setStreamStatus(null) }
        }
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
      setStreamStatus(null)
    }
  }

  const selectedContract = contracts.find(c => c.id === selected)
  const analysis = result?.analysis

  if (loadingData) return (
    <div className="content">
      <div className="loading"><div className="loading-spin" />Loading contracts…</div>
    </div>
  )

  return (
    <div className="content">
      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              Negotiations Assistant
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              Benchmark a contract's clauses against your portfolio before you negotiate
            </div>
          </div>
        </div>
      </div>

      {/* Contract selector + run button */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-3)', marginBottom: 6 }}>Select contract to analyse</div>
          <select
            value={selected || ''}
            onChange={e => setSelected(Number(e.target.value))}
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 7, fontSize: 13,
              border: '1px solid var(--border-2)', background: 'var(--bg-raised)',
              color: 'var(--text)', outline: 'none', cursor: 'pointer',
            }}
          >
            {contracts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} {c.contract_type ? `· ${c.contract_type}` : ''} {c.total_value ? `· ${fmt(c.total_value)}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <button
            className="btn btn-primary"
            onClick={runAnalysis}
            disabled={loading || !selected || contracts.length < 2}
            style={{ minWidth: 160 }}
          >
            {loading
              ? <><span className="loading-spin" style={{ width: 12, height: 12, marginRight: 6 }} />{streamStatus || 'Analysing…'}</>
              : result ? '🔄 Refresh Analysis' : '🤝 Run Analysis'}
          </button>
          {result && (
            <div style={{ fontSize: 11, color: result.stale ? 'var(--amber)' : 'var(--text-3)' }}>
              {result.stale ? '⚠ Portfolio changed — refresh recommended' : `✓ Analysed ${new Date(result.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </div>
          )}
          {contracts.length < 2 && (
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Need ≥2 contracts to benchmark</div>
          )}
        </div>
      </div>

      {error && <div className="error-banner" style={{ marginBottom: 16 }}>Error: {error}</div>}

      {/* Empty state */}
      {!analysis && !loading && (
        <div className="empty-state">
          <div className="empty-state-icon">🤝</div>
          <div className="empty-state-title">Select a contract and run the analysis</div>
          <div className="empty-state-sub">
            Claude will compare every clause against your portfolio and generate negotiation talking points.
          </div>
        </div>
      )}

      {/* Results */}
      {analysis && (
        <>
          {/* Summary row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Overall position */}
            <div className="card" style={{ gridColumn: '1 / 3' }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>Overall position</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{analysis.overall_position}</div>
            </div>
            {/* Leverage score */}
            <div className="card">
              <LeverageBar score={analysis.leverage_score || 0} />
              <button
                className="btn btn-ghost btn-sm"
                style={{ width: '100%', marginTop: 4 }}
                onClick={() => navigate('brief', selected)}
              >
                Open Contract Brief →
              </button>
            </div>
          </div>

          {/* Top asks + red flags */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {/* Top asks */}
            {analysis.top_asks?.length > 0 && (
              <div className="card">
                <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--gold)', fontWeight: 700, marginBottom: 10 }}>Top negotiation asks</div>
                <ol style={{ paddingLeft: 18, margin: 0 }}>
                  {analysis.top_asks.map((ask, i) => (
                    <li key={i} style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 7, lineHeight: 1.5 }}>{ask}</li>
                  ))}
                </ol>
              </div>
            )}
            {/* Red flags + favorable */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {analysis.red_flags?.length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--red)', fontWeight: 700, marginBottom: 10 }}>Red flags</div>
                  {analysis.red_flags.map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--red)', flexShrink: 0 }}>⚠</span>{f}
                    </div>
                  ))}
                </div>
              )}
              {analysis.favorable_terms?.length > 0 && (
                <div className="card">
                  <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.2, color: 'var(--green)', fontWeight: 700, marginBottom: 10 }}>Favourable terms</div>
                  {analysis.favorable_terms.map((t, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 7, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>{t}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Clause-by-clause breakdown */}
          {analysis.clauses?.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>
                Clause-by-clause breakdown
                <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-3)', fontWeight: 400 }}>
                  ({analysis.clauses.length} clauses · click any row to expand talking points)
                </span>
              </div>
              {analysis.clauses
                .sort((a, b) => {
                  const order = { critical: 0, high: 1, medium: 2, low: 3 }
                  return (order[a.priority] ?? 4) - (order[b.priority] ?? 4)
                })
                .map((clause, i) => (
                  <ClauseCard key={i} clause={clause} />
                ))
              }
            </div>
          )}
        </>
      )}
    </div>
  )
}
