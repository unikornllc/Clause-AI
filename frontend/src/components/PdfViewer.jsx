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
 * Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to Western digits (0-9).
 * This lets us match section numbers regardless of which digit form is used
 * in the contract or the PDF text layer.
 */
function normalizeDigits(str) {
  return str.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
}

/**
 * Parse a section_ref into tokens for page matching.
 * Handles English ("§ 14.1 — Term and Renewal") and Arabic ("المادة ٥ — السرية").
 * Returns { number, words, arabicWords, isArabic }
 */
function parseSectionRef(sectionRef) {
  if (!sectionRef) return { number: null, words: [], arabicWords: [], isArabic: false }

  const hasArabic = isArabicText(sectionRef)

  // Normalize Arabic-Indic digits before extracting the section number
  const normalized = normalizeDigits(sectionRef)
  const numMatch   = normalized.match(/\b(\d+(?:\.\d+)*)\b/)
  const number     = numMatch ? numMatch[1] : null

  // English words (strip Arabic chars + punctuation first)
  const words = sectionRef
    .replace(/[§—·.()\u0600-\u06FF]/g, ' ')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .filter(w => w.length > 3 && !STOPWORDS.has(w) && !/^\d+$/.test(w))

  // Arabic words (strip digits + punctuation)
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
 * Normalizes Arabic-Indic digits in page text before number comparison.
 */
function scorePage(pageText, tokens) {
  let score = 0

  // Normalize page text digits for number comparison
  const normalizedPage = normalizeDigits(pageText)

  // Section number match — strongest signal, language-independent
  if (tokens.number && normalizedPage.includes(tokens.number)) score += 20

  // English title word matches (case-insensitive)
  const lowerPage = pageText.toLowerCase()
  for (const word of tokens.words) {
    if (lowerPage.includes(word)) score += 2
  }

  // Arabic word matches (direct — Arabic is case-invariant)
  for (const word of tokens.arabicWords) {
    if (pageText.includes(word)) score += 3  // slightly higher weight for Arabic words
  }

  return score
}

/**
 * Given a known page number, confirm the section is there by scoring
 * just that page. If the score is too low, try the one page before and
 * after (Claude's page numbers can be off by ±1 due to cover pages).
 * Returns the best matching page number among the candidates.
 */
async function findSectionPage(contractId, sectionRef, knownPage) {
  const tokens = parseSectionRef(sectionRef)
  // If we have no tokens to match on, just trust the saved page number
  if (!tokens.number && tokens.words.length === 0 && tokens.arabicWords.length === 0) {
    return knownPage || null
  }

  const url = `/api/contracts/${contractId}/pdf`
  let pdfDoc
  try {
    pdfDoc = await pdfjs.getDocument(url).promise
  } catch {
    return knownPage || null
  }

  const totalPages = pdfDoc.numPages

  // Candidate pages: saved page ± 1 (handles off-by-one from cover pages)
  const base = knownPage || 1
  const candidates = [...new Set([base, base - 1, base + 1])]
    .filter(p => p >= 1 && p <= totalPages)

  let bestPage  = base   // default to the saved page number
  let bestScore = -1

  for (const pageNum of candidates) {
    try {
      const page    = await pdfDoc.getPage(pageNum)
      const content = await page.getTextContent()
      const pageText = content.items.map(item => item.str).join(' ')
      const score   = scorePage(pageText, tokens)
      if (score > bestScore) {
        bestScore = score
        bestPage  = pageNum
      }
    } catch {
      // skip unreadable page
    }
  }

  return bestPage
}

export default function PdfViewer({ contractId, sectionRef, fallbackPage }) {
  const [numPages, setNumPages]     = useState(null)
  const [pageNum,  setPageNum]      = useState(fallbackPage || 1)
  const [width,    setWidth]        = useState(500)
  const [searching, setSearching]   = useState(false)
  const containerRef = useRef(null)

  // When sectionRef/fallbackPage changes: jump to the saved page, then
  // confirm/refine within the ±1 window using section text matching.
  useEffect(() => {
    if (!contractId) return

    if (!sectionRef) {
      setPageNum(fallbackPage || 1)
      return
    }

    // Show the saved page immediately so the user isn't waiting on a blank screen
    if (fallbackPage) setPageNum(fallbackPage)
    setSearching(true)

    findSectionPage(contractId, sectionRef, fallbackPage).then(found => {
      setPageNum(found || fallbackPage || 1)
      setSearching(false)
    })
  }, [sectionRef, fallbackPage, contractId])

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

    // Strong match: section number — normalize digits on both sides
    if (tokens.number && normalizeDigits(str).includes(tokens.number)) {
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
