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

// Arabic stopwords (articles, prepositions, conjunctions)
const ARABIC_STOPWORDS = new Set([
  'في', 'من', 'إلى', 'على', 'عن', 'مع', 'أو', 'و', 'ال', 'هذا', 'هذه',
  'التي', 'الذي', 'كل', 'أي', 'لا', 'ما', 'أن', 'إن', 'كان', 'يكون',
])

function isArabicText(str) {
  return /[\u0600-\u06FF]/.test(str)
}

/**
 * Parse a section_ref into tokens for page matching.
 * Handles both English ("§ 14.1 — Term and Renewal") and
 * Arabic ("Art. 5 — Confidentiality (المادة ٥ — السرية)") refs.
 * Returns { number, words, arabicWords, isArabic }
 */
function parseSectionRef(sectionRef) {
  if (!sectionRef) return { number: null, words: [], arabicWords: [], isArabic: false }

  const hasArabic = isArabicText(sectionRef)

  // Extract Western digits and Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩)
  const numMatch = sectionRef.match(/\b(\d+(?:\.\d+)*)\b/) ||
                   sectionRef.match(/([٠-٩]+(?:\.[٠-٩]+)*)/)
  const number = numMatch ? numMatch[1] : null

  // English words
  const words = sectionRef
    .replace(/[§—·.()\u0600-\u06FF]/g, ' ')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(w => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))

  // Arabic words
  const arabicWords = hasArabic
    ? sectionRef
        .replace(/[§—·.()\d٠-٩]/g, ' ')
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2 && isArabicText(w) && !ARABIC_STOPWORDS.has(w))
    : []

  return { number, words, arabicWords, isArabic: hasArabic }
}

/**
 * Score a page's text content against section tokens.
 * Works for both English and Arabic.
 */
function scorePage(pageText, tokens) {
  let score = 0

  // Section number match (strongest signal — language-independent)
  if (tokens.number && pageText.includes(tokens.number)) score += 20

  // English title word matches
  const lower = pageText.toLowerCase()
  for (const word of tokens.words) {
    if (lower.includes(word)) score += 2
  }

  // Arabic word matches (direct string match — no lowercasing needed)
  for (const word of tokens.arabicWords) {
    if (pageText.includes(word)) score += 2
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

    // Strong match: section number (works for both scripts)
    if (tokens.number && str.includes(tokens.number)) {
      return `<mark class="pdf-highlight">${str}</mark>`
    }

    if (tokens.isArabic) {
      // Arabic: match against Arabic words directly
      const matchCount = tokens.arabicWords.filter(w => str.includes(w)).length
      if (matchCount >= 2) return `<mark class="pdf-highlight">${str}</mark>`
    } else {
      // English: case-insensitive word matching
      const sLower = s.toLowerCase()
      const matchCount = tokens.words.filter(w => sLower.includes(w)).length
      if (matchCount >= 2) return `<mark class="pdf-highlight">${str}</mark>`
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
