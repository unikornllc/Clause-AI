import { useState, useEffect } from 'react'
import { api } from '../api'

function fmtDate(s) {
  if (!s) return '—'
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(s) {
  if (!s) return null
  return Math.round((new Date(s) - new Date()) / 86400000)
}

function cardClass(o) {
  if (o.status === 'completed')            return 'ok'
  if (o.trigger_type === 'event_based')    return 'event'
  const d = daysUntil(o.due_date)
  if (d === null)                          return 'ok'
  if (d < 0)                               return 'overdue'
  if (d < 30)                              return 'soon'
  return 'ok'
}

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function Obligations({ navigate }) {
  const [obligations, setObligations] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)

  useEffect(() => {
    api.getObligations().then(setObligations).catch(e => setError(e.message)).finally(() => setLoading(false))
  }, [])

  async function markComplete(id) {
    await api.completeObligation(id)
    setObligations(prev => prev.map(o => o.id === id ? { ...o, status: 'completed' } : o))
  }

  if (loading) return <div className="content"><div className="loading"><div className="loading-spin" />Loading…</div></div>
  if (error)   return <div className="content"><div className="error-banner">Error: {error}</div></div>

  const timed  = obligations.filter(o => o.trigger_type !== 'event_based')
  const events = obligations.filter(o => o.trigger_type === 'event_based')

  const overdue   = timed.filter(o => o.status !== 'completed' && daysUntil(o.due_date) !== null && daysUntil(o.due_date) < 0)
  const soon      = timed.filter(o => o.status !== 'completed' && daysUntil(o.due_date) !== null && daysUntil(o.due_date) >= 0 && daysUntil(o.due_date) < 30)
  const upcoming  = timed.filter(o => o.status !== 'completed' && daysUntil(o.due_date) !== null && daysUntil(o.due_date) >= 30)
  const undated   = timed.filter(o => o.status !== 'completed' && o.due_date == null)
  const completed = timed.filter(o => o.status === 'completed')

  function ObligationCard({ o }) {
    const cls  = cardClass(o)
    const days = daysUntil(o.due_date)
    return (
      <div className={`obl-card ${cls}`}>
        <div className="obl-contract">{o.contract_name}</div>
        <div className="obl-title">{o.title}</div>
        <div className="obl-due">
          {o.due_date ? (
            <>
              Due <span className={days < 0 ? 'overdue-text' : ''}>{fmtDate(o.due_date)}</span>
              {days !== null && days < 0 && ` · ${Math.abs(days)}d overdue`}
              {days !== null && days >= 0 && ` · ${days}d`}
            </>
          ) : '—'}
        </div>
        {o.description && (
          <div style={{ fontSize: 11.5, color: 'var(--text-3)', marginTop: 5, lineHeight: 1.5 }}>
            {o.description}
          </div>
        )}
        <div className="obl-actions">
          {o.status !== 'completed' && (
            <button className="btn btn-primary btn-sm" onClick={() => markComplete(o.id)}>
              ✓ Mark done
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('brief', o.contract_id)}
          >
            View contract
          </button>
        </div>
        <div className="obl-owner">
          <div className="owner-avatar">{initials(o.owner_team)}</div>
          {o.owner_team} team
          {o.status === 'completed' && <span style={{ color: 'var(--green)', marginLeft: 4 }}>✓ Done</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="content">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
          Obligation Monitor
        </h2>
        <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
          Everything your contracts require you to do — and when.
        </div>
      </div>

      {overdue.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div className="section-title">Overdue</div>
            <span className="nav-badge danger">{overdue.length}</span>
          </div>
          <div className="obl-grid">
            {overdue.map(o => <ObligationCard key={o.id} o={o} />)}
          </div>
        </div>
      )}

      {soon.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div className="section-title">Due Soon (30 days)</div>
            <span className="nav-badge warn">{soon.length}</span>
          </div>
          <div className="obl-grid">
            {soon.map(o => <ObligationCard key={o.id} o={o} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>Upcoming</div>
          <div className="obl-grid">
            {upcoming.map(o => <ObligationCard key={o.id} o={o} />)}
          </div>
        </div>
      )}

      {undated.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>No Due Date</div>
          <div className="obl-grid">
            {undated.map(o => <ObligationCard key={o.id} o={o} />)}
          </div>
        </div>
      )}

      {/* Event-based obligations */}
      {events.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ marginBottom: 12 }}>
            <div className="section-title">Event-Based Obligations</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>Triggered by incidents, not calendars</div>
          </div>
          <div className="card">
            <div className="event-obligations">
              {events.map(o => (
                <div key={o.id} className="event-row">
                  <span className="event-badge">⚡ EVENT</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{o.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-3)' }}>{o.description}</div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{o.contract_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div>
          <div className="section-title" style={{ marginBottom: 12, color: 'var(--text-3)' }}>Completed</div>
          <div className="obl-grid">
            {completed.map(o => <ObligationCard key={o.id} o={o} />)}
          </div>
        </div>
      )}

      {obligations.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">✅</div>
          <div className="empty-state-title">No obligations tracked</div>
          <div className="empty-state-sub">Upload contracts to automatically extract obligations.</div>
        </div>
      )}
    </div>
  )
}
