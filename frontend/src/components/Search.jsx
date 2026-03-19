import { useState, useEffect, useRef } from 'react'
import { api } from '../api'

const SUGGESTIONS = [
  'What auto-renews in the next 90 days?',
  'Which contracts have a liability cap under $1M?',
  'Show me all IP ownership clauses',
  'Which contracts allow unilateral price changes?',
  'What have we committed to in Q2 2026?',
  'Which vendors have audit rights over our systems?',
]

function severityClass(s) {
  return { critical: 'bad', high: 'warn' }[s] || ''
}

// Extract the active @mention from a query string.
// Returns the text after the last '@' if it has no space, or null.
function getActiveMention(text) {
  const idx = text.lastIndexOf('@')
  if (idx === -1) return null
  const after = text.slice(idx + 1)
  if (after.includes(' ')) return null   // mention was completed or abandoned
  return after.toLowerCase()
}

export default function Search() {
  const [query,           setQuery]           = useState('')
  const [taggedContract,  setTaggedContract]  = useState(null)   // { id, name }
  const [result,          setResult]          = useState(null)
  const [loading,         setLoading]         = useState(false)
  const [error,           setError]           = useState(null)
  const [asked,           setAsked]           = useState('')

  // @ mention dropdown state
  const [allContracts,    setAllContracts]    = useState([])
  const [mentionFilter,   setMentionFilter]   = useState(null)   // string | null
  const [dropdownOpen,    setDropdownOpen]    = useState(false)

  const inputRef  = useRef(null)
  const dropRef   = useRef(null)

  // Load contracts once for the mention dropdown
  useEffect(() => {
    api.getContracts().then(setAllContracts).catch(() => {})
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Filtered contract list for dropdown
  const filteredContracts = mentionFilter === null
    ? allContracts
    : allContracts.filter(c =>
        c.name.toLowerCase().includes(mentionFilter) ||
        (c.contract_type || '').toLowerCase().includes(mentionFilter)
      )

  function handleInputChange(e) {
    const val = e.target.value
    setQuery(val)

    const mention = getActiveMention(val)
    if (mention !== null) {
      setMentionFilter(mention)
      setDropdownOpen(true)
    } else {
      setDropdownOpen(false)
      setMentionFilter(null)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !dropdownOpen) submit()
    if (e.key === 'Escape') setDropdownOpen(false)
  }

  function selectMentionContract(contract) {
    // Strip the @... from the query and tag the contract
    const idx     = query.lastIndexOf('@')
    const newQuery = query.slice(0, idx).trim()
    setQuery(newQuery)
    setTaggedContract(contract)
    setDropdownOpen(false)
    setMentionFilter(null)
    inputRef.current?.focus()
  }

  function clearTag() {
    setTaggedContract(null)
  }

  async function submit(overrideQuery) {
    const question = (overrideQuery || query).trim()
    if (!question) return
    setLoading(true)
    setError(null)
    setResult(null)
    setAsked(question)
    try {
      const r = await api.search(question, taggedContract?.id ?? null)
      setResult(r)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function handleChip(q) {
    setQuery(q)
    setTaggedContract(null)
    submit(q)
  }

  function handleReset() {
    setResult(null)
    setQuery('')
    setTaggedContract(null)
    setAsked('')
  }

  return (
    <div className="content">
      <div className="search-wrap">
        <div className="search-hero">
          <div className="search-hero-title">Ask anything about your contracts</div>
          <div className="search-hero-sub">
            Natural language search across your entire portfolio — powered by Clause.
            Type <strong style={{ color: 'var(--gold)' }}>@</strong> to focus on a specific contract.
          </div>
        </div>

        {/* Search bar + mention dropdown */}
        <div className="search-bar-wrap" style={{ position: 'relative' }}>
          <span className="search-icon">🔍</span>

          {/* Tagged contract chip inside the bar */}
          {taggedContract && (
            <div className="mention-chip-inline">
              <span className="mention-chip-at">@</span>
              <span className="mention-chip-name">{taggedContract.name}</span>
              <button className="mention-chip-remove" onClick={clearTag} title="Remove context">×</button>
            </div>
          )}

          <input
            ref={inputRef}
            className={`search-bar ${taggedContract ? 'search-bar-with-chip' : ''}`}
            placeholder={
              taggedContract
                ? `Ask about ${taggedContract.name}…`
                : 'e.g. Which vendor contracts have a liability cap under $1M?'
            }
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
          />

          {/* @ hint button */}
          {!taggedContract && (
            <button
              className="search-at-btn"
              title="Tag a specific contract"
              onClick={() => {
                setQuery(prev => prev + '@')
                setMentionFilter('')
                setDropdownOpen(true)
                inputRef.current?.focus()
              }}
            >
              @
            </button>
          )}

          {/* Submit button */}
          <button
            className="search-submit-btn"
            onClick={() => submit()}
            disabled={loading || (!query.trim() && !taggedContract)}
          >
            {loading ? <span className="loading-spin" style={{ width: 12, height: 12 }} /> : '↵'}
          </button>

          {/* @ mention dropdown */}
          {dropdownOpen && filteredContracts.length > 0 && (
            <div className="mention-dropdown" ref={dropRef}>
              <div className="mention-dropdown-header">
                Select a contract
              </div>
              {filteredContracts.slice(0, 8).map(c => (
                <div
                  key={c.id}
                  className="mention-dropdown-item"
                  onMouseDown={e => { e.preventDefault(); selectMentionContract(c) }}
                >
                  <div className="mention-dropdown-name">{c.name}</div>
                  <div className="mention-dropdown-meta">
                    <span>{c.contract_type || '—'}</span>
                    {c.expiration_date && (
                      <span>expires {new Date(c.expiration_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}</span>
                    )}
                    {c.risk_clauses?.[0]?.severity === 'critical' && (
                      <span style={{ color: 'var(--red)' }}>⚠ critical risk</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active context banner */}
        {taggedContract && (
          <div className="mention-context-banner">
            <span style={{ fontSize: 13 }}>
              🎯 Searching within <strong>{taggedContract.name}</strong> only
            </span>
            <button className="mention-context-clear" onClick={clearTag}>
              Search all contracts instead
            </button>
          </div>
        )}

        {/* Suggestion chips */}
        {!result && !loading && (
          <div className="query-chips">
            {SUGGESTIONS.map(s => (
              <div key={s} className="query-chip" onClick={() => handleChip(s)}>{s}</div>
            ))}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-3)', padding: '16px 0', fontSize: 13 }}>
            <div className="loading-spin" />
            {taggedContract
              ? `Clause is analysing ${taggedContract.name}…`
              : 'Clause is searching your contracts…'}
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}

        {result && (
          <div className="answer-card">
            <div className="answer-header">
              <span className="answer-ai-badge">AI Answer</span>
              {taggedContract && (
                <span className="answer-context-tag">
                  @ {taggedContract.name}
                </span>
              )}
              <span className="answer-q">"{asked}"</span>
            </div>

            <div className="answer-body">{result.answer}</div>

            {result.results?.length > 0 && (
              <div className="answer-results">
                {result.results.map((r, i) => (
                  <div key={i} className="answer-row">
                    <div className="answer-row-top">
                      <span className="answer-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="answer-row-name">{r.contract_name}</span>
                      {r.section_ref && (
                        <span className="answer-cite">{r.section_ref}</span>
                      )}
                      {r.severity && r.severity !== 'info' && (
                        <span className={`risk-pill ${r.severity}`} style={{ fontSize: 10, marginLeft: 'auto' }}>
                          {r.severity}
                        </span>
                      )}
                    </div>
                    <div className={`answer-row-val ${severityClass(r.severity)}`}>
                      {r.relevant_value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result.recommendation && (
              <div style={{ margin: '0 18px 16px', padding: '11px 14px', background: 'rgba(108,71,255,0.07)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--gold)', lineHeight: 1.6 }}>
                💡 {result.recommendation}
              </div>
            )}

            <div className="answer-actions">
              <button className="btn btn-ghost btn-sm" onClick={handleReset}>New search</button>
              <button className="btn btn-ghost btn-sm">📋 Copy results</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
