import { useState, useEffect, useRef } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

const STOPWORDS = new Set([
  'and', 'for', 'the', 'of', 'in', 'to', 'a', 'an', 'or', 'with',
  'from', 'by', 'on', 'at', 'as', 'is', 'are', 'its', 'any', 'all',
])

/**
 * Pull key tokens out of a section_ref string like "§ 14.1 — Term and Renewal"
 * Returns { number: "14.1", words: ["term", "renewal"] }
 */
function parseSectionRef(sectionRef) {
  if (!sectionRef) return { number: null, words: [] }

  // Extract section number: "14.1", "8", "6.2.3", etc.
  const numMatch = sectionRef.match(/\b(\d+(?:\.\d+)*)\b/)
  const number = numMatch ? numMatch[1] : null

  // Strip punctuation/symbols and extract meaningful words
  const words = sectionRef
    .replace(/[§—·.]/g, ' ')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(w => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))

  return { number, words }
}

/**
 * Score a page's text content against section tokens.
 * Higher score = better match.
 */
function scorePage(pageText, tokens) {
  let score = 0
  const lower = pageText.toLowerCase()

  // Section number match is the strongest signal
  if (tokens.number && lower.includes(tokens.number)) score += 20

  // Title word matches
  for (const word of tokens.words) {
    if (lower.includes(word)) score += 2
  }

  return score
}

/**
 * Use pdfjs to load the document text and find the page that best matches
 * the section_ref. Returns the 1-based page number, or null if not found.
 */
async function findSectionPage(contractId, sectionRef) {
  const tokens = parseSectionRef(sectionRef)
  if (!tokens.number && tokens.words.length === 0) return null

  const url = `/api/contracts/${contractId}/pdf`
  let pdfDoc
  try {
    pdfDoc = await pdfjs.getDocument(url).promise
  } catch {
    return null
  }

  let bestPage = null
  let bestScore = 0

  for (let i = 1; i <= pdfDoc.numPages; i++) {
    try {
      const page = await pdfDoc.getPage(i)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      const score = scorePage(pageText, tokens)
      if (score > bestScore) {
        bestScore = score
        bestPage = i
      }
    } catch {
      // skip unreadable page
    }
  }

  // Only return if we found something meaningful
  return bestScore >= 20 ? bestPage : null
}

export default function PdfViewer({ contractId, sectionRef, fallbackPage }) {
  const [numPages, setNumPages]     = useState(null)
  const [pageNum,  setPageNum]      = useState(fallbackPage || 1)
  const [width,    setWidth]        = useState(500)
  const [searching, setSearching]   = useState(false)
  const containerRef = useRef(null)

  // When sectionRef changes: search for the correct page in the PDF text
  useEffect(() => {
    if (!sectionRef || !contractId) {
      if (fallbackPage) setPageNum(fallbackPage)
      return
    }

    setSearching(true)
    findSectionPage(contractId, sectionRef).then(found => {
      setPageNum(found || fallbackPage || 1)
      setSearching(false)
    })
  }, [sectionRef, contractId])

  // Responsive width
  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect?.width
      if (w) setWidth(Math.floor(w) - 2)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  // Highlight spans that match the section number or 2+ title words
  const tokens = parseSectionRef(sectionRef)

  function customTextRenderer({ str }) {
    if (!sectionRef) return str
    const s = str.trim()
    if (!s) return str

    const sLower = s.toLowerCase()

    // Strong match: span contains the section number (e.g. "14.1")
    if (tokens.number && sLower.includes(tokens.number)) {
      return `<mark class="pdf-highlight">${str}</mark>`
    }

    // Medium match: span contains 2+ distinct title words
    const matchCount = tokens.words.filter(w => sLower.includes(w)).length
    if (matchCount >= 2) {
      return `<mark class="pdf-highlight">${str}</mark>`
    }

    return str
  }

  if (!contractId) return null

  return (
    <div className="pdf-viewer-wrap" ref={containerRef}>
      {/* Section reference banner */}
      {sectionRef && (
        <div className="pdf-snippet-banner">
          <span className="pdf-snippet-icon">📍</span>
          <span className="pdf-snippet-text">
            {searching ? 'Locating section…' : sectionRef}
          </span>
          {searching && <div className="loading-spin" style={{ width: 10, height: 10, flexShrink: 0 }} />}
        </div>
      )}

      {/* Page controls */}
      <div className="pdf-controls">
        <button
          className="pdf-nav-btn"
          onClick={() => setPageNum(p => Math.max(1, p - 1))}
          disabled={pageNum <= 1}
        >‹</button>
        <span className="pdf-page-indicator">
          Page {pageNum}{numPages ? ` of ${numPages}` : ''}
        </span>
        <button
          className="pdf-nav-btn"
          onClick={() => setPageNum(p => Math.min(numPages || p, p + 1))}
          disabled={numPages !== null && pageNum >= numPages}
        >›</button>
      </div>

      {/* PDF Document */}
      <div className="pdf-document-wrap">
        <Document
          file={`/api/contracts/${contractId}/pdf`}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="pdf-loading">
              <div className="loading-spin" /> Loading document…
            </div>
          }
          error={<div className="pdf-error">Could not load PDF</div>}
        >
          <Page
            key={`${pageNum}-${sectionRef}`}
            pageNumber={pageNum}
            width={width}
            customTextRenderer={customTextRenderer}
            renderAnnotationLayer={false}
            loading={
              <div className="pdf-loading" style={{ height: 600 }}>
                <div className="loading-spin" />
              </div>
            }
          />
        </Document>
      </div>
    </div>
  )
}
