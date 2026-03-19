import { useState, useRef } from 'react'
import { api } from '../api'

const STEPS = [
  'Uploading document',
  'Extracting text from PDF',
  'Identifying parties, dates & value',
  'Analysing risk clauses with AI…',
  'Generating Contract Brief',
  'Indexing for search',
]

export default function Upload({ navigate }) {
  const [file,     setFile]     = useState(null)
  const [step,     setStep]     = useState(-1)   // -1 = idle, 0-5 = steps, 99 = done, -99 = error
  const [error,    setError]    = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  async function handleFile(f) {
    if (!f) return
    setFile(f)
    setError(null)
    setStep(0)

    // Animate first 3 steps while waiting for API
    const t1 = setTimeout(() => setStep(1), 700)
    const t2 = setTimeout(() => setStep(2), 1600)
    const t3 = setTimeout(() => setStep(3), 2500)

    const fd = new FormData()
    fd.append('file', f)

    try {
      const result = await api.uploadContract(fd)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      setStep(4)
      setTimeout(() => setStep(5), 350)
      setTimeout(() => setStep(99), 750)
      setTimeout(() => navigate('brief', result.id), 1400)
    } catch (e) {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      setError(e.message)
      setStep(-99)
    }
  }

  function onDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const idle = step === -1

  return (
    <div className="content">
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Playfair Display, serif', fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
            Upload a Contract
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13 }}>
            PDF or plain text. Clause will extract everything automatically — parties, dates, risks, obligations — in seconds.
          </p>
        </div>

        {/* Drop zone */}
        {idle && (
          <>
            <div
              className={`upload-zone ${dragging ? 'dragging' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
            >
              <div className="upload-zone-icon">📂</div>
              <div className="upload-zone-title">Drop a contract here</div>
              <div className="upload-zone-sub">or click to browse files</div>
              <div className="upload-zone-fmt">PDF · DOCX · TXT</div>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              style={{ display: 'none' }}
              onChange={e => handleFile(e.target.files?.[0])}
            />
          </>
        )}

        {/* File info */}
        {file && step !== -1 && (
          <div className="upload-file-item" style={{ marginBottom: 16 }}>
            <span style={{ fontSize: 22 }}>📄</span>
            <div style={{ flex: 1 }}>
              <div className="upload-file-name">{file.name}</div>
              <div className="upload-file-size">
                {(file.size / 1024).toFixed(0)} KB
              </div>
            </div>
            <div className="upload-file-status">
              {step === 99  ? '✅ Complete' :
               step === -99 ? '❌ Failed'   : 'Processing…'}
            </div>
          </div>
        )}

        {/* Processing steps */}
        {step >= 0 && step !== 99 && (
          <div style={{ marginBottom: 20 }}>
            <div className="section-title" style={{ marginBottom: 12 }}>Processing</div>
            <div className="processing-card">
              {STEPS.map((label, i) => {
                const done   = i < step || step === 99
                const active = i === step
                const wait   = i > step
                return (
                  <div key={i} className="processing-row">
                    <div className="p-status">
                      {done   && <span className="p-done">✓</span>}
                      {active && <div className="p-spin" />}
                      {wait   && <div className="p-wait" />}
                    </div>
                    <div className={`p-label ${done ? 'done' : active ? 'active' : ''}`}>
                      {label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Success */}
        {step === 99 && (
          <div style={{ background: 'var(--green-dim)', border: '1px solid rgba(58,204,140,0.3)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>✅</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Contract processed successfully</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Redirecting to Contract Brief…</div>
            </div>
          </div>
        )}

        {/* Error */}
        {step === -99 && error && (
          <div className="error-banner" style={{ marginBottom: 16 }}>
            ❌ {error}
            <br />
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 10 }}
              onClick={() => { setFile(null); setStep(-1); setError(null) }}
            >
              Try again
            </button>
          </div>
        )}

        {/* Demo tip */}
        {idle && (
          <div style={{ marginTop: 24, padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-3)', marginBottom: 8, fontWeight: 600 }}>Demo tip</div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
              Five demo contracts are already loaded. Upload any real contract PDF to see live AI extraction — parties, dates, risk clauses, and obligations will be extracted automatically.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
