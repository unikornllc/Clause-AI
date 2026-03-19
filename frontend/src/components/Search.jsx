import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import PdfViewer from './PdfViewer'

const SUGGESTIONS = [
  'What auto-renews in the next 90 days?',
  'Which contracts have a liability cap under $1M?',
  'Show me all IP ownership clauses',
  'Which contracts allow unilateral price changes?',
  'What have we committed to in Q2 2026?',
  'Which vendors have audit rights over our systems?',
]

const LS_KEY = 'clause_chats_v1'

function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function severityClass(s) {
  return { critical: 'bad', high: 'warn' }[s] || ''
}

function getActiveMention(text) {
  const idx = text.lastIndexOf('@')
  if (idx === -1) return null
  const after = text.slice(idx + 1)
  if (after.includes(' ')) return null
  return after.toLowerCase()
}

function relativeDate(ts) {
  const diff = Date.now() - ts
  if (diff < 86400000)  return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function loadChats() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]') }
  catch { return [] }
}

function saveChats(chats) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(chats.slice(0, 40))) }
  catch {}
}

// ── Contract PDF viewer card in the right panel ──────────────────────────────
function ContractPanel({ item, onClose, navigate }) {
  return (
    <div className="search-panel-card">
      <div className="search-panel-card-header">
        <div className="search-panel-card-meta">
          <span className={`risk-pill ${item.severity || 'info'}`} style={{ fontSize: 10 }}>
            {item.severity || 'info'}
          </span>
          <span className="search-panel-card-name">{item.contract_name}</span>
        </div>
        <button className="search-panel-close" onClick={onClose}>×</button>
      </div>
      {item.section_ref && (
        <div className="search-panel-section-ref">📍 {item.section_ref}</div>
      )}
      <div className="search-panel-relevant">{item.relevant_value}</div>
      {item.contract_id ? (
        <PdfViewer
          contractId={item.contract_id}
          sectionRef={item.section_ref || null}
          fallbackPage={1}
        />
      ) : (
        <div className="pdf-no-file" style={{ margin: '10px 0 0' }}>
          <div className="pdf-no-file-icon">📄</div>
          <div>No PDF on file for this contract</div>
        </div>
      )}
      {item.contract_id && navigate && (
        <button
          className="search-panel-brief-link"
          onClick={() => navigate('brief', item.contract_id)}
        >
          Open full Contract Brief →
        </button>
      )}
    </div>
  )
}

// ── Single Q&A exchange in the chat thread ────────────────────────────────────
function ChatMessage({ message, onTogglePin, isPinned }) {
  const { question, taggedContract, result, error } = message

  return (
    <div className="chat-exchange">
      {/* Question bubble */}
      <div className="chat-question-row">
        <div className="chat-question-bubble">
          {taggedContract && (
            <span className="chat-q-tag">@{taggedContract.name}</span>
          )}
          {question}
        </div>
      </div>

      {/* Error */}
      {error && <div className="error-banner">{error}</div>}

      {/* Answer card */}
      {result && (
        <div className="answer-card">
          <div className="answer-header">
            <span className="answer-ai-badge">AI Answer</span>
            {taggedContract && (
              <span className="answer-context-tag">@ {taggedContract.name}</span>
            )}
          </div>

          <div className="answer-body">{result.answer}</div>

          {result.results?.length > 0 && (
            <div className="answer-results">
              {result.results.some(r => r.contract_id) && (
                <div className="answer-results-hint">
                  Click a result to view its clause in the PDF panel →
                </div>
              )}
              {result.results.map((r, i) => {
                const pinnable = !!r.contract_id
                const pinned   = isPinned(r)
                return (
                  <div
                    key={i}
                    className={`answer-row${pinnable ? ' answer-row-clickable' : ''}${pinned ? ' answer-row-pinned' : ''}`}
                    onClick={() => pinnable && onTogglePin(r)}
                  >
                    <div className="answer-row-top">
                      <span className="answer-num">{String(i + 1).padStart(2, '0')}</span>
                      <span className="answer-row-name">{r.contract_name}</span>
                      {r.section_ref && <span className="answer-cite">{r.section_ref}</span>}
                      {r.severity && r.severity !== 'info' && (
                        <span className={`risk-pill ${r.severity}`} style={{ fontSize: 10, marginLeft: 'auto' }}>
                          {r.severity}
                        </span>
                      )}
                      {pinnable && (
                        <span className={`answer-pin-indicator${pinned ? ' pinned' : ''}`}>
                          {pinned ? '▶ Viewing' : '▶ View'}
                        </span>
                      )}
                    </div>
                    <div className={`answer-row-val ${severityClass(r.severity)}`}>
                      {r.relevant_value}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {result.recommendation && (
            <div style={{ margin: '0 18px 16px', padding: '11px 14px', background: 'rgba(108,71,255,0.07)', border: '1px solid rgba(108,71,255,0.2)', borderRadius: 8, fontSize: 13, color: 'var(--gold)', lineHeight: 1.6 }}>
              💡 {result.recommendation}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Search component ─────────────────────────────────────────────────────
export default function Search({ navigate }) {
  const [chats,       setChats]       = useState(loadChats)
  const [activeChatId, setActiveChatId] = useState(() => loadChats()[0]?.id || null)

  const [query,          setQuery]          = useState('')
  const [taggedContract, setTaggedContract] = useState(null)
  const [loading,        setLoading]        = useState(false)

  // @ mention
  const [allContracts,  setAllContracts]  = useState([])
  const [mentionFilter, setMentionFilter] = useState(null)
  const [dropdownOpen,  setDropdownOpen]  = useState(false)

  // Right PDF panel (ephemeral — not persisted)
  const [pinnedItems, setPinnedItems] = useState([])

  const inputRef  = useRef(null)
  const dropRef   = useRef(null)
  const threadRef = useRef(null)

  const activeChat = chats.find(c => c.id === activeChatId) || null
  const messages   = activeChat?.messages || []
  const panelOpen  = pinnedItems.length > 0

  // Persist chats
  useEffect(() => { saveChats(chats) }, [chats])

  // Scroll thread to bottom on new messages
  useEffect(() => {
    if (!threadRef.current) return
    setTimeout(() => {
      if (threadRef.current)
        threadRef.current.scrollTop = threadRef.current.scrollHeight
    }, 60)
  }, [messages.length, loading])

  // Load contracts for @ mention dropdown
  useEffect(() => {
    api.getContracts().then(setAllContracts).catch(() => {})
  }, [])

  // Close @ dropdown on outside click
  useEffect(() => {
    function onMouseDown(e) {
      if (dropRef.current  && !dropRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [])

  const filteredContracts = mentionFilter === null
    ? allContracts
    : allContracts.filter(c =>
        c.name.toLowerCase().includes(mentionFilter) ||
        (c.contract_type || '').toLowerCase().includes(mentionFilter)
      )

  // ── Actions ──────────────────────────────────────────────────────────────

  function newChat() {
    const id   = genId()
    const chat = { id, title: 'New conversation', createdAt: Date.now(), messages: [] }
    setChats(prev => [chat, ...prev])
    setActiveChatId(id)
    setQuery('')
    setTaggedContract(null)
    setPinnedItems([])
  }

  function switchChat(id) {
    if (id === activeChatId) return
    setActiveChatId(id)
    setPinnedItems([])
    setQuery('')
    setTaggedContract(null)
  }

  function deleteChat(e, id) {
    e.stopPropagation()
    setChats(prev => {
      const next = prev.filter(c => c.id !== id)
      if (activeChatId === id) {
        setActiveChatId(next[0]?.id || null)
        setPinnedItems([])
      }
      return next
    })
  }

  function handleInputChange(e) {
    const val = e.target.value
    setQuery(val)
    const mention = getActiveMention(val)
    if (mention !== null) { setMentionFilter(mention); setDropdownOpen(true) }
    else { setDropdownOpen(false); setMentionFilter(null) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !dropdownOpen) submit()
    if (e.key === 'Escape') setDropdownOpen(false)
  }

  function selectMentionContract(contract) {
    const idx = query.lastIndexOf('@')
    setQuery(query.slice(0, idx).trim())
    setTaggedContract(contract)
    setDropdownOpen(false)
    setMentionFilter(null)
    inputRef.current?.focus()
  }

  // overrideTagged lets handleChip pass null without relying on stale state
  async function submit(overrideQuery, overrideTagged) {
    const question  = (overrideQuery || query).trim()
    if (!question || loading) return

    const tagged = overrideTagged !== undefined ? overrideTagged : taggedContract

    // Ensure active chat exists
    let chatId = activeChatId
    if (!chatId || !chats.find(c => c.id === chatId)) {
      chatId = genId()
      setChats(prev => [{ id: chatId, title: question.slice(0, 60), createdAt: Date.now(), messages: [] }, ...prev])
      setActiveChatId(chatId)
    }

    setQuery('')
    setLoading(true)

    const msgId = genId()
    try {
      const r   = await api.search(question, tagged?.id ?? null)
      const msg = { id: msgId, question, taggedContract: tagged, result: r, createdAt: Date.now() }
      setChats(prev => prev.map(c => {
        if (c.id !== chatId) return c
        return {
          ...c,
          title:    c.messages.length === 0 ? question.slice(0, 60) : c.title,
          messages: [...c.messages, msg],
        }
      }))
    } catch (e) {
      const msg = { id: msgId, question, taggedContract: tagged, error: e.message, createdAt: Date.now() }
      setChats(prev => prev.map(c =>
        c.id !== chatId ? c : { ...c, messages: [...c.messages, msg] }
      ))
    } finally {
      setLoading(false)
    }
  }

  function handleChip(q) { submit(q, null) }

  function togglePin(item) {
    if (!item.contract_id) return
    const key    = r => `${r.contract_id}::${r.section_ref}`
    const exists = pinnedItems.some(p => key(p) === key(item))
    setPinnedItems(prev =>
      exists ? prev.filter(p => key(p) !== key(item)) : [...prev, item].slice(-3)
    )
  }

  function isPinned(item) {
    if (!item.contract_id) return false
    const key = r => `${r.contract_id}::${r.section_ref}`
    return pinnedItems.some(p => key(p) === key(item))
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="search-page">
      <div className="search-history-layout">

        {/* ── Conversation sidebar ── */}
        <div className="conv-sidebar">
          <div className="conv-sidebar-header">
            <button className="new-chat-btn" onClick={newChat}>+ New chat</button>
          </div>
          <div className="conv-list">
            {chats.length === 0 && (
              <div className="conv-empty">No conversations yet</div>
            )}
            {chats.map(c => (
              <div
                key={c.id}
                className={`conv-item${c.id === activeChatId ? ' active' : ''}`}
                onClick={() => switchChat(c.id)}
              >
                <div className="conv-item-title">{c.title}</div>
                <div className="conv-item-meta">
                  <span>{relativeDate(c.createdAt)}</span>
                  <span className="conv-item-count">{c.messages.length}msg</span>
                </div>
                <button
                  className="conv-delete-btn"
                  onClick={e => deleteChat(e, c.id)}
                  title="Delete"
                >×</button>
              </div>
            ))}
          </div>
        </div>

        {/* ── Main chat area ── */}
        <div className="conv-main">

          {/* Scrollable message thread */}
          <div className="chat-thread" ref={threadRef}>
            {messages.length === 0 && !loading && (
              <div className="search-hero">
                <div className="search-hero-title">Ask anything about your contracts</div>
                <div className="search-hero-sub">
                  Natural language search across your entire portfolio — powered by Clause.
                  Type <strong style={{ color: 'var(--gold)' }}>@</strong> to focus on a specific contract.
                </div>
                <div className="query-chips" style={{ marginTop: 20 }}>
                  {SUGGESTIONS.map(s => (
                    <div key={s} className="query-chip" onClick={() => handleChip(s)}>{s}</div>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onTogglePin={togglePin}
                isPinned={isPinned}
              />
            ))}

            {loading && (
              <div className="chat-loading">
                <div className="loading-spin" />
                <span>
                  {taggedContract
                    ? `Analysing ${taggedContract.name}…`
                    : 'Searching your contracts…'}
                </span>
              </div>
            )}
          </div>

          {/* Tagged-contract context banner */}
          {taggedContract && (
            <div className="mention-context-banner" style={{ margin: '0 20px 4px' }}>
              <span style={{ fontSize: 13 }}>
                🎯 Searching within <strong>{taggedContract.name}</strong> only
              </span>
              <button className="mention-context-clear" onClick={() => setTaggedContract(null)}>
                Search all contracts instead
              </button>
            </div>
          )}

          {/* Input bar — always at bottom */}
          <div className="chat-input-area">
            <div className="search-bar-wrap" style={{ position: 'relative' }}>
              <span className="search-icon">🔍</span>

              {taggedContract && (
                <div className="mention-chip-inline">
                  <span className="mention-chip-at">@</span>
                  <span className="mention-chip-name">{taggedContract.name}</span>
                  <button className="mention-chip-remove" onClick={() => setTaggedContract(null)}>×</button>
                </div>
              )}

              <input
                ref={inputRef}
                className={`search-bar ${taggedContract ? 'search-bar-with-chip' : ''}`}
                placeholder={
                  messages.length === 0
                    ? 'e.g. Which vendor contracts have a liability cap under $1M?'
                    : 'Ask a follow-up or a new question…'
                }
                value={query}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
              />

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
                >@</button>
              )}

              <button
                className="search-submit-btn"
                onClick={() => submit()}
                disabled={loading || !query.trim()}
              >
                {loading
                  ? <span className="loading-spin" style={{ width: 12, height: 12 }} />
                  : '↵'}
              </button>

              {/* @ mention dropdown — opens upward since input is at bottom */}
              {dropdownOpen && filteredContracts.length > 0 && (
                <div className="mention-dropdown mention-dropdown-up" ref={dropRef}>
                  <div className="mention-dropdown-header">Select a contract</div>
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
          </div>
        </div>

        {/* ── Right PDF panel ── */}
        {panelOpen && (
          <div className="search-panel">
            <div className="search-panel-header">
              <span className="search-panel-title">
                {pinnedItems.length === 1 ? 'Contract View' : `Comparing ${pinnedItems.length} contracts`}
              </span>
              <button className="search-panel-clear" onClick={() => setPinnedItems([])}>
                Close all ×
              </button>
            </div>
            <div className="search-panel-items">
              {pinnedItems.map((item, i) => (
                <ContractPanel
                  key={`${item.contract_id}::${item.section_ref}::${i}`}
                  item={item}
                  navigate={navigate}
                  onClose={() => togglePin(item)}
                />
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
