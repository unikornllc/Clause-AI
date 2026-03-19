import { useState, useEffect } from 'react'
import { api } from '../api'

function fmt(v) {
  if (!v && v !== 0) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1_000)}k`
  return `$${v}`
}

const BAR_COLORS = ['gold', 'b2', 'b3', 'b4', 'b5']

export default function Executive({ navigate }) {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    api.getStats().then(setStats).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" />Loading…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>

  const totalSpend  = (stats?.vendor_spend || []).reduce((s, v) => s + v.value, 0) || 1
  const maxQ        = Math.max(...(stats?.quarterly || []).map(q => q.value), 1)

  // Generate briefing from stats
  const renewing90  = stats?.renewing_90d || []
  const criticalNum = stats?.critical_risks || 0
  const topVendor   = stats?.vendor_spend?.[0]
  const topVendorPct = topVendor ? Math.round((topVendor.value / totalSpend) * 100) : 0

  return (
    <div className="content">
      <div style={{ marginBottom: 20 }}>
        <div className="section-header">
          <div>
            <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
              Executive Overview
            </h2>
            <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
              Strategic portfolio summary · {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm">📧 Send briefing</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="stats-grid">
        <div className="stat-card gold">
          <div className="stat-label">Total Committed</div>
          <div className="stat-value gold">{fmt(stats?.total_value)}</div>
          <div className="stat-sub">across {stats?.total_contracts} contracts</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-label">At-Risk Renewals</div>
          <div className="stat-value amber">{fmt(stats?.renewing_90d_value)}</div>
          <div className="stat-sub">renewing in 90 days</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Critical Risk Clauses</div>
          <div className="stat-value red">{criticalNum}</div>
          <div className="stat-sub">across portfolio</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Compliance Rate</div>
          <div className="stat-value green">{stats?.compliance_rate || 0}%</div>
          <div className="stat-sub">obligations met</div>
        </div>
      </div>

      <div className="exec-grid">
        {/* Vendor concentration */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Vendor Concentration</div>
          {(stats?.vendor_spend || []).slice(0, 6).map((v, i) => {
            const pct = Math.round((v.value / totalSpend) * 100)
            return (
              <div key={v.id} className="bar-row">
                <div className="bar-label" title={v.name}>{v.name}</div>
                <div className="bar-track">
                  <div className={`bar-fill ${BAR_COLORS[i] || 'b5'}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="bar-val">{pct}%</div>
                <div className="bar-amount">{fmt(v.value)}</div>
                {pct > 25 && <div className="bar-warn" title="Exceeds 25% concentration threshold">⚠</div>}
              </div>
            )
          })}
          {topVendorPct > 25 && (
            <div style={{ marginTop: 12, padding: '10px 12px', background: 'rgba(232,148,58,0.08)', border: '1px solid rgba(232,148,58,0.2)', borderRadius: 7, fontSize: 12, color: 'var(--amber)', lineHeight: 1.5 }}>
              ⚠ {topVendor?.name} represents {topVendorPct}% of total spend — above the recommended 25% single-vendor threshold.
            </div>
          )}
        </div>

        {/* Quarterly commitments */}
        <div className="card">
          <div className="section-title" style={{ marginBottom: 14 }}>Scheduled Payments by Quarter</div>
          {stats?.quarterly?.length > 0 ? (
            stats.quarterly.map(q => (
              <div key={q.quarter} className="quarterly-row">
                <div className="quarterly-header">
                  <span className="quarterly-label">{q.quarter}</span>
                  <span className="quarterly-val">{fmt(q.value)}</span>
                </div>
                <div className="quarterly-track">
                  <div className="quarterly-fill" style={{ width: `${Math.round((q.value / maxQ) * 100)}%` }} />
                </div>
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No payment data available.</div>
          )}
        </div>
      </div>

      {/* Auto-renewing contracts alert */}
      {renewing90.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Auto-Renewing in 90 Days
            <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--red)', fontWeight: 400 }}>
              {renewing90.length} contract{renewing90.length > 1 ? 's' : ''} · {fmt(stats.renewing_90d_value)} at stake
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {renewing90.map(r => (
              <div
                key={r.id}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-raised)', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }}
                onClick={() => navigate('brief', r.id)}
              >
                <span className={`days-chip ${r.days_until_cancel < 0 ? 'danger' : r.days_until_cancel < 30 ? 'danger' : 'warn'}`}>
                  {r.days_until} d
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                    Cancel by: {r.cancel_by} · {r.days_until_cancel < 0 ? `${Math.abs(r.days_until_cancel)}d overdue` : `${r.days_until_cancel}d left`}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'JetBrains Mono, monospace' }}>
                  {fmt(r.value)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Weekly Briefing */}
      <div className="briefing-card">
        <div className="briefing-label">AI Weekly Briefing</div>
        <div className="briefing-text">
          {renewing90.length > 0 && (
            <>
              <strong>{renewing90.length} contract{renewing90.length > 1 ? 's' : ''} require immediate attention</strong> — their auto-renewal cancellation windows are approaching or have passed.
              {renewing90.slice(0, 2).map(r => ` ${r.name} (${r.days_until}d to renewal)`).join(',')} represent{' '}
              <span style={{ color: 'var(--amber)' }}>{fmt(stats?.renewing_90d_value)} in annual commitments</span> that
              could lock in automatically without action.
              <br /><br />
            </>
          )}
          {criticalNum > 0 && (
            <>
              Your portfolio contains <strong>{criticalNum} critical risk clauses</strong> that require legal review — including
              IP ownership claims and liability caps well below enterprise standards.
              {topVendorPct > 25 && (
                <>
                  {' '}Additionally, <span style={{ color: 'var(--amber)' }}>{topVendor?.name} represents {topVendorPct}% of total vendor spend</span>, exceeding
                  the recommended 25% single-vendor concentration threshold — a strategic supply-chain risk.
                </>
              )}
              <br /><br />
            </>
          )}
          <strong>Recommended this week:</strong> Prioritise renewal negotiations for the highest-value auto-renewing contracts,
          and assign the {criticalNum} critical risk clauses to Legal for review before the next board meeting.
        </div>
      </div>
    </div>
  )
}
