from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean,
    Float, Text, DateTime, ForeignKey, text,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.types import JSON as SAJson
from contextlib import asynccontextmanager
from datetime import datetime, date, timedelta
from typing import Optional, List
from pydantic import BaseModel
import anthropic
import pdfplumber
import json
import os
import io
import hashlib
import secrets
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────────────────────
# Database
# ─────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.environ.get("UPLOAD_DIR", os.path.join(BASE_DIR, "uploads"))
os.makedirs(UPLOADS_DIR, exist_ok=True)

_default_db = f"sqlite:///{os.path.join(BASE_DIR, 'contracts.db')}"
engine = create_engine(
    os.environ.get("DATABASE_URL", _default_db),
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Models
# ─────────────────────────────────────────────────────────────
class Contract(Base):
    __tablename__ = "contracts"
    id                       = Column(Integer, primary_key=True)
    name                     = Column(String, nullable=False)
    status                   = Column(String, default="processing")
    contract_type            = Column(String)
    parties                  = Column(SAJson)
    effective_date           = Column(String)
    expiration_date          = Column(String)
    auto_renewal             = Column(Boolean, default=False)
    auto_renewal_notice_days = Column(Integer)
    auto_renewal_term_years  = Column(Integer)
    total_value              = Column(Float)
    currency                 = Column(String, default="USD")
    governing_law            = Column(String)
    plain_english_summary    = Column(Text)
    pdf_path                 = Column(String)   # path to stored PDF file
    language                 = Column(String, default="en")  # detected language code
    created_at               = Column(DateTime, default=datetime.utcnow)
    risk_clauses  = relationship("RiskClause",  back_populates="contract", cascade="all, delete-orphan")
    obligations   = relationship("Obligation",  back_populates="contract", cascade="all, delete-orphan")


class RiskClause(Base):
    __tablename__ = "risk_clauses"
    id           = Column(Integer, primary_key=True)
    contract_id  = Column(Integer, ForeignKey("contracts.id"))
    type         = Column(String)
    severity     = Column(String)
    title        = Column(String)
    description  = Column(Text)
    section_ref  = Column(String)
    page_number  = Column(Integer)   # PDF page where this clause appears
    text_snippet = Column(Text)      # exact quoted text from the contract
    contract     = relationship("Contract", back_populates="risk_clauses")


class Obligation(Base):
    __tablename__ = "obligations"
    id           = Column(Integer, primary_key=True)
    contract_id  = Column(Integer, ForeignKey("contracts.id"))
    title        = Column(String)
    description  = Column(Text)
    due_date     = Column(String)
    frequency    = Column(String)
    owner_team   = Column(String)
    trigger_type = Column(String, default="time_based")
    status       = Column(String, default="pending")
    section_ref  = Column(String)    # e.g. "§ 5.2 — Reporting Obligations"
    page_number  = Column(Integer)   # PDF page where this obligation appears
    text_snippet = Column(Text)      # exact quoted text from the contract
    contract     = relationship("Contract", back_populates="obligations")


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True)
    username      = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role          = Column(String, nullable=False)   # legal | procurement | executive
    full_name     = Column(String, nullable=False)
    sessions      = relationship("UserSession", back_populates="user", cascade="all, delete-orphan")


class UserSession(Base):
    __tablename__ = "user_sessions"
    id         = Column(Integer, primary_key=True)
    token      = Column(String, unique=True, nullable=False)
    user_id    = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    user       = relationship("User", back_populates="sessions")


class NegotiationAnalysis(Base):
    __tablename__ = "negotiation_analyses"
    id             = Column(Integer, primary_key=True)
    contract_id    = Column(Integer, ForeignKey("contracts.id"), unique=True)
    analysis       = Column(SAJson, nullable=False)   # full structured result
    portfolio_hash = Column(String, nullable=False)   # hash of portfolio at analysis time
    created_at     = Column(DateTime, default=datetime.utcnow)
    contract       = relationship("Contract")


Base.metadata.create_all(bind=engine)


# ─────────────────────────────────────────────────────────────
# Auth helpers
# ─────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    key  = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
    return f"{salt}:{key.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, key_hex = stored_hash.split(":", 1)
        key = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 260000)
        return secrets.compare_digest(key.hex(), key_hex)
    except Exception:
        return False


def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization[7:]
    session = db.query(UserSession).filter(UserSession.token == token).first()
    if not session:
        raise HTTPException(401, "Invalid or expired session")
    return session.user


def run_migrations():
    """Add new columns to existing tables without dropping data."""
    with engine.connect() as conn:
        for table, column, dtype in [
            ("contracts",    "pdf_path",    "TEXT"),
            ("contracts",    "language",    "TEXT"),
            ("risk_clauses", "page_number", "INTEGER"),
            ("risk_clauses", "text_snippet","TEXT"),
            ("obligations",  "section_ref", "TEXT"),
            ("obligations",  "page_number", "INTEGER"),
            ("obligations",  "text_snippet","TEXT"),
        ]:
            try:
                conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {dtype}"))
                conn.commit()
            except Exception:
                pass  # column already exists


def seed_users(db: Session):
    """Create three demo users if they don't already exist."""
    demo_users = [
        ("sarah.chen",    "legal123",       "legal",       "Sarah Chen"),
        ("marcus.webb",   "procurement123", "procurement", "Marcus Webb"),
        ("jennifer.park", "coo123",         "executive",   "Jennifer Park"),
    ]
    for username, password, role, full_name in demo_users:
        if not db.query(User).filter(User.username == username).first():
            db.add(User(
                username=username,
                password_hash=hash_password(password),
                role=role,
                full_name=full_name,
            ))
    db.commit()


# ─────────────────────────────────────────────────────────────
# AI Extraction
# ─────────────────────────────────────────────────────────────
EXTRACTION_PROMPT = """You are a contract analysis AI. The contract text below has [PAGE N] markers indicating page breaks. The contract may be written in any language (English, Arabic, French, etc.).

IMPORTANT LANGUAGE RULES:
- Detect the contract's primary language and set the "language" field ("en", "ar", "fr", etc.)
- Write ALL output fields (titles, descriptions, summaries, section_ref, plain_english_summary) in THE SAME LANGUAGE as the contract. If the contract is in Arabic, all output must be in Arabic. If it is in English, all output must be in English.
- If dates use the Hijri (Islamic) calendar, convert them to Gregorian YYYY-MM-DD
- For section references: use the exact section identifier as it appears in the contract (e.g. "المادة ٥ — السرية" for Arabic, "§ 5.1 — Confidentiality" for English)

Return ONLY valid JSON — no markdown, no code fences, no extra text.

Return exactly this structure:
{
  "language": "en" | "ar" | "fr" | "de" | <ISO 639-1 code>,
  "contract_type": "SaaS" | "NDA" | "MSA" | "Employment" | "Services" | "Data" | "Cloud" | "Other",
  "parties": ["Party 1", "Party 2"],
  "effective_date": "YYYY-MM-DD or null",
  "expiration_date": "YYYY-MM-DD or null",
  "auto_renewal": true or false,
  "auto_renewal_notice_days": number or null,
  "auto_renewal_term_years": number or null,
  "total_value": number or null,   // ANNUAL value only. If the contract states a monthly fee, multiply by 12. If it states a multi-year total, divide by the number of years. Always return the per-year amount. Numbers only — no currency symbols.
  "currency": "USD" | "GBP" | "EUR" | "SAR" | "AED" | "KWD" | "QAR" | "OMR" | "BHD" | "EGP" | null,
  "governing_law": "jurisdiction string — in the contract's language",
  "plain_english_summary": "Write 2-3 paragraphs in the CONTRACT'S LANGUAGE: (1) what this contract does and key terms, (2) what is most concerning or risky, (3) what the reader should do now. Use **bold** for critical items. No legal jargon.",
  "risk_clauses": [
    {
      "type": "liability_cap" | "ip_ownership" | "auto_renewal" | "price_change" | "termination" | "indemnification" | "audit_rights" | "data_ownership" | "non_compete" | "sla_penalty",
      "severity": "critical" | "high" | "medium" | "low",
      "title": "Short descriptive title in the CONTRACT'S LANGUAGE (6 words max)",
      "description": "1-2 sentences explaining the risk in the CONTRACT'S LANGUAGE",
      "section_ref": "exact section identifier as it appears in the contract",
      "page_number": <integer page number from [PAGE N] marker where this clause appears, or 1 if unknown>,
      "text_snippet": "<exact quoted phrase of 15-25 words from the contract text that contains this clause>"
    }
  ],
  "obligations": [
    {
      "title": "Short obligation title in the CONTRACT'S LANGUAGE",
      "description": "What specifically must be done, in the CONTRACT'S LANGUAGE",
      "due_date": "YYYY-MM-DD or null (convert Hijri to Gregorian)",
      "frequency": "one_time" | "monthly" | "quarterly" | "annual" | "event_based",
      "owner_team": "Legal" | "Finance" | "IT" | "Procurement" | "Operations" | "HR",
      "trigger_type": "time_based" | "event_based",
      "section_ref": "exact section identifier as it appears in the contract",
      "page_number": <integer page number from [PAGE N] marker where this obligation appears, or 1 if unknown>,
      "text_snippet": "<exact quoted phrase of 15-25 words from the contract text that creates this obligation>"
    }
  ]
}

Contract text:
"""


def parse_claude_json(text: str) -> dict:
    """Robustly parse JSON from Claude output, stripping markdown fences if present."""
    text = text.strip()
    if not text:
        raise ValueError("Empty response from Claude — the prompt may have exceeded max_tokens")
    if "```" in text:
        for block in text.split("```"):
            block = block.strip()
            if block.startswith("json"):
                block = block[4:].strip()
            try:
                return json.loads(block)
            except json.JSONDecodeError:
                continue
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # Last resort: extract the first {...} block in case of leading/trailing prose
        import re
        m = re.search(r'\{.*\}', text, re.DOTALL)
        if m:
            return json.loads(m.group())
        raise


def detect_language(text: str) -> str:
    """Detect primary language from text using Unicode character ranges."""
    if not text:
        return "en"
    arabic_chars = sum(1 for c in text if '\u0600' <= c <= '\u06FF')
    total_alpha   = sum(1 for c in text if c.isalpha())
    if total_alpha == 0:
        return "en"
    return "ar" if (arabic_chars / total_alpha) > 0.3 else "en"


def extract_text_with_pages(contents: bytes) -> str:
    """Extract text from PDF with [PAGE N] markers.

    Strategy (in order):
    1. PyMuPDF  — best Arabic/RTL support, correct glyph ordering
    2. pdfplumber — fallback for Latin-script PDFs
    3. pytesseract OCR — optional fallback for scanned/image-only PDFs
    """
    # ── 1. PyMuPDF ──────────────────────────────────────────────
    try:
        import fitz  # PyMuPDF
        doc = fitz.open(stream=contents, filetype="pdf")
        parts = []
        total_chars = 0
        for i, page in enumerate(doc, 1):
            page_text = page.get_text(
                "text",
                flags=fitz.TEXT_PRESERVE_LIGATURES | fitz.TEXT_PRESERVE_WHITESPACE,
            )
            total_chars += len(page_text.strip())
            parts.append(f"[PAGE {i}]\n{page_text}")
        doc.close()
        avg = total_chars / max(len(parts), 1)
        if avg > 50:          # real text layer
            return "\n\n".join(parts)
    except ImportError:
        pass
    except Exception:
        pass

    # ── 2. pdfplumber ────────────────────────────────────────────
    try:
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            parts = []
            total_chars = 0
            for i, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text() or ""
                total_chars += len(page_text.strip())
                parts.append(f"[PAGE {i}]\n{page_text}")
            avg = total_chars / max(len(parts), 1)
            if avg > 50:
                return "\n\n".join(parts)
    except Exception:
        pass

    # ── 3. OCR fallback (Tesseract + Arabic language pack) ───────
    try:
        import pytesseract
        from pdf2image import convert_from_bytes
        images = convert_from_bytes(contents, dpi=200)
        parts = []
        for i, img in enumerate(images, 1):
            # Detect Arabic vs English OCR language per page dynamically below
            text = pytesseract.image_to_string(img, lang="ara+eng")
            parts.append(f"[PAGE {i}]\n{text}")
        result = "\n\n".join(parts)
        if result.strip():
            return result
    except ImportError:
        pass   # pytesseract / pdf2image not installed — skip silently
    except Exception:
        pass

    return ""


def extract_with_claude(tagged_text: str) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in environment")
    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT + tagged_text[:50000]}],
    )
    return parse_claude_json(msg.content[0].text)


def compute_portfolio_hash(db: Session, exclude_id: int) -> str:
    """Hash of the completed portfolio (excluding target) to detect staleness."""
    contracts = db.query(Contract).filter(
        Contract.status == "completed",
        Contract.id != exclude_id
    ).order_by(Contract.id).all()
    parts = [
        f"{c.id}:{','.join(sorted(r.type for r in c.risk_clauses))}"
        for c in contracts
    ]
    return hashlib.md5("|".join(parts).encode()).hexdigest()


# Role-aware context injected into every LLM call that surfaces results to a user
ROLE_CONTEXT = {
    "legal": (
        "Legal Counsel — primary focus: risk exposure, problematic clause language, and legal liability. "
        "Give clause-level detail, cite exact section references, flag anything that could become a liability. "
        "Prioritise precision over brevity."
    ),
    "procurement": (
        "Procurement/Operations Manager — primary focus: upcoming renewals, vendor obligations, spend optimisation, "
        "and leverage for renegotiation. Lead with deadlines, action items, and contract value. "
        "Be concrete and action-oriented."
    ),
    "executive": (
        "Executive (CFO/COO) — primary focus: strategic overview, total financial commitments, concentration risk, "
        "and compliance posture. Summarise at the portfolio level with key numbers. "
        "Skip clause-level detail unless it has material financial or strategic impact."
    ),
}


def search_with_claude(question: str, contracts: list, role: str = None) -> dict:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise ValueError("ANTHROPIC_API_KEY not set in environment")

    context_parts = []
    for c in contracts:
        risk_lines = "\n".join(
            f"  - [{r['severity'].upper()}] {r['title']} ({r['section_ref'] or 'no ref'}): {r['description']}"
            for r in c.get("risk_clauses", [])
        )
        obligation_lines = "\n".join(
            f"  - {o['title']} | due: {o['due_date'] or 'event-based'} | team: {o['owner_team']}"
            for o in c.get("obligations", [])
        )
        context_parts.append(
            f"Contract #{c['id']}: {c['name']}\n"
            f"Type: {c['contract_type']} | Value: {'$' + str(int(c['total_value'])) if c['total_value'] else 'N/A'} {c['currency'] or ''}\n"
            f"Parties: {', '.join(c.get('parties') or [])}\n"
            f"Expiry: {c['expiration_date'] or 'N/A'} | Governing law: {c.get('governing_law') or 'N/A'} | "
            f"Auto-renewal: {'Yes, ' + str(c['auto_renewal_notice_days']) + 'd notice required' if c['auto_renewal'] else 'No'}\n"
            f"Summary: {(c.get('plain_english_summary') or '')[:600]}\n"
            f"Risk clauses:\n{risk_lines or '  None'}\n"
            f"Obligations:\n{obligation_lines or '  None'}"
        )

    context = "\n\n---\n\n".join(context_parts)

    role_instruction = ""
    if role and role in ROLE_CONTEXT:
        role_instruction = (
            f"You are speaking with a {ROLE_CONTEXT[role]}\n"
            "Adjust the depth, focus, and format of your answer to match their perspective.\n\n"
        )

    prompt = (
        "You are a contract intelligence assistant. "
        + role_instruction +
        "Answer the user's question based ONLY on the contract data below. "
        "Be specific — cite contract names and exact clause section references. "
        "Each result must include the contract_id (the integer N from 'Contract #N' in the data below). "
        "Return ONLY valid JSON, no markdown:\n"
        "{\n"
        '  "answer": "2-3 sentence narrative answer tailored to the user\'s role",\n'
        '  "results": [\n'
        '    {"contract_id": <integer N from Contract #N>, "contract_name": "name", "relevant_value": "specific value or clause text", "section_ref": "§ X.Y — Section Name or empty string", "severity": "critical|high|medium|low|info"}\n'
        "  ],\n"
        '  "recommendation": "One clear actionable recommendation suited to the user\'s role, or null"\n'
        "}\n\n"
        f"Contracts:\n{context}\n\n"
        f"Question: {question}"
    )

    client = anthropic.Anthropic(api_key=api_key)
    msg = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )
    return parse_claude_json(msg.content[0].text)


def build_negotiations_prompt(target: dict, portfolio: list, role: str = None) -> str:
    """Build the negotiations analysis prompt — concise output to minimise token count."""
    def fmt_val(v):
        if not v: return "N/A"
        if v >= 1_000_000: return f"${v/1_000_000:.1f}M"
        if v >= 1_000: return f"${int(v/1000)}k"
        return f"${int(v)}"

    target_clauses = "\n".join(
        f"  - [{r['severity'].upper()}] {r['type']}: {r['title']} — {r['description'][:120]} ({r['section_ref'] or 'no ref'})"
        for r in target.get("risk_clauses", [])
    )
    target_block = (
        f"TARGET CONTRACT: {target['name']}\n"
        f"Type: {target['contract_type']} | Value: {fmt_val(target.get('total_value'))} {target.get('currency','')}\n"
        f"Parties: {', '.join(target.get('parties') or [])}\n"
        f"Expiry: {target.get('expiration_date','N/A')} | Auto-renewal: {'Yes, ' + str(target['auto_renewal_notice_days']) + 'd notice' if target.get('auto_renewal') else 'No'}\n"
        f"Governing law: {target.get('governing_law','N/A')}\n"
        f"Clauses:\n{target_clauses or '  None identified'}"
    )

    portfolio_parts = []
    for c in portfolio:
        clauses = "\n".join(
            f"    - {r['type']}: {r['title']} — {r['description'][:80]}"
            for r in c.get("risk_clauses", [])
        )
        portfolio_parts.append(
            f"  {c['name']} ({c['contract_type']}, {fmt_val(c.get('total_value'))}) | "
            f"Auto-renewal: {'Yes ' + str(c['auto_renewal_notice_days']) + 'd' if c.get('auto_renewal') else 'No'} | "
            f"Law: {c.get('governing_law','N/A')}\n"
            f"{clauses or '    None'}"
        )
    portfolio_block = "PORTFOLIO:\n" + "\n\n".join(portfolio_parts)

    role_instruction = ""
    if role and role in ROLE_CONTEXT:
        role_instruction = f"You are assisting a {ROLE_CONTEXT[role]}\nTailor the depth, emphasis, and recommended actions in your analysis accordingly.\n\n"

    return f"""You are a contract negotiation intelligence assistant.

{role_instruction}Analyse the TARGET CONTRACT and compare each of its key clauses against the PORTFOLIO CONTRACTS.
For each clause type, identify whether the target's terms are unfavourable, average, or favourable compared to the portfolio, and generate a specific negotiation talking point that cites real portfolio data.

Return ONLY valid JSON (no markdown, no code fences):
{{
  "overall_position": "2-3 sentence summary of the overall negotiation position and key risks",
  "leverage_score": <integer 1-5, where 5 = strong leverage / many unfavourable terms to push back on>,
  "clauses": [
    {{
      "type": "<clause type string>",
      "label": "<human-readable label>",
      "your_position": "<what this contract says>",
      "portfolio_benchmark": "<what comparable portfolio contracts say, with specifics e.g. 'avg $380k across 3 SaaS contracts'>",
      "benchmark_rating": "below_average | average | above_average | no_data",
      "talking_point": "<specific negotiation talking point citing portfolio data, 1-2 sentences>",
      "suggested_ask": "<concrete ask for the negotiation, e.g. 'Raise liability cap to $380k'>",
      "priority": "critical | high | medium | low"
    }}
  ],
  "red_flags": ["<clause or term requiring immediate legal attention>"],
  "top_asks": ["<the 3-5 highest-priority negotiation asks in order>"],
  "favorable_terms": ["<terms that are already better than portfolio average, use as anchors>"]
}}

{target_block}

{portfolio_block}

Analyse every clause in the target contract. For clause types not present in the portfolio, still analyse the target's position in absolute terms and note the absence of benchmarks. Be specific — cite actual values and contract names from the portfolio.
"""


# ─────────────────────────────────────────────────────────────
# Serialisation helpers
# ─────────────────────────────────────────────────────────────
def contract_to_dict(c: Contract) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "status": c.status,
        "contract_type": c.contract_type,
        "parties": c.parties or [],
        "effective_date": c.effective_date,
        "expiration_date": c.expiration_date,
        "auto_renewal": c.auto_renewal,
        "auto_renewal_notice_days": c.auto_renewal_notice_days,
        "auto_renewal_term_years": c.auto_renewal_term_years,
        "total_value": c.total_value,
        "currency": c.currency,
        "governing_law": c.governing_law,
        "plain_english_summary": c.plain_english_summary,
        "language": c.language or "en",
        "has_pdf": bool(c.pdf_path and os.path.exists(c.pdf_path)),
        "created_at": c.created_at.isoformat() if c.created_at else None,
        "risk_clauses": [
            {
                "id": r.id, "type": r.type, "severity": r.severity,
                "title": r.title, "description": r.description, "section_ref": r.section_ref,
                "page_number": r.page_number, "text_snippet": r.text_snippet,
            }
            for r in c.risk_clauses
        ],
        "obligations": [
            {
                "id": o.id, "title": o.title, "description": o.description,
                "due_date": o.due_date, "frequency": o.frequency,
                "owner_team": o.owner_team, "trigger_type": o.trigger_type,
                "status": o.status, "section_ref": o.section_ref,
                "page_number": o.page_number, "text_snippet": o.text_snippet,
            }
            for o in c.obligations
        ],
    }


# ─────────────────────────────────────────────────────────────
# App & lifespan
# ─────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    db = SessionLocal()
    try:
        if db.query(Contract).count() == 0:
            seed_database(db)
        else:
            # Remove duplicate contracts (same name, case-insensitive) keeping lowest id
            from sqlalchemy import func
            names = db.query(func.lower(Contract.name)).group_by(func.lower(Contract.name)).having(func.count() > 1).all()
            for (name,) in names:
                dupes = db.query(Contract).filter(func.lower(Contract.name) == name).order_by(Contract.id).all()
                for c in dupes[1:]:  # keep first (seed), delete the rest
                    db.query(RiskClause).filter(RiskClause.contract_id == c.id).delete()
                    db.query(Obligation).filter(Obligation.contract_id == c.id).delete()
                    db.delete(c)
            db.commit()
        seed_users(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Clause API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Auth routes
# ─────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid username or password")
    token = secrets.token_urlsafe(32)
    db.add(UserSession(token=token, user_id=user.id))
    db.commit()
    return {
        "token": token,
        "user": {"id": user.id, "username": user.username, "role": user.role, "full_name": user.full_name},
    }


@app.get("/api/auth/me")
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "username": current_user.username,
            "role": current_user.role, "full_name": current_user.full_name}


@app.post("/api/auth/logout")
def logout(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:]
        db.query(UserSession).filter(UserSession.token == token).delete()
        db.commit()
    return {"ok": True}


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────
@app.get("/api/contracts")
def list_contracts(db: Session = Depends(get_db)):
    contracts = db.query(Contract).order_by(Contract.expiration_date).all()
    return [contract_to_dict(c) for c in contracts]


@app.get("/api/contracts/{contract_id}")
def get_contract(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(404, "Contract not found")
    return contract_to_dict(c)


@app.post("/api/contracts/upload")
async def upload_contract(file: UploadFile = File(...), db: Session = Depends(get_db)):
    contents = await file.read()
    is_pdf = (file.filename or "").lower().endswith(".pdf")

    # Extract text with page markers (for PDF) or plain text
    tagged_text = ""
    if is_pdf:
        try:
            tagged_text = extract_text_with_pages(contents)
        except Exception:
            pass
    if not tagged_text:
        try:
            tagged_text = contents.decode("utf-8", errors="ignore")
        except Exception:
            raise HTTPException(400, "Could not read file. Please upload a PDF or text file.")

    if len(tagged_text.strip()) < 100:
        raise HTTPException(400, "File appears to be empty or unreadable.")

    # Create placeholder record
    display_name = (file.filename or "Unnamed Contract").replace(".pdf", "").replace("_", " ").replace("-", " ").strip()
    contract = Contract(name=display_name, status="processing")
    db.add(contract)
    db.commit()
    db.refresh(contract)

    # Save the PDF file to disk
    if is_pdf:
        pdf_path = os.path.join(UPLOADS_DIR, f"{contract.id}.pdf")
        with open(pdf_path, "wb") as f:
            f.write(contents)
        contract.pdf_path = pdf_path
        db.commit()

    # Detect language from extracted text
    contract.language = detect_language(tagged_text)
    db.commit()

    # Extract with Claude
    try:
        data = extract_with_claude(tagged_text)
    except Exception as e:
        contract.status = "error"
        db.commit()
        raise HTTPException(500, f"AI extraction failed: {e}")

    # Persist extracted data
    contract.status            = "completed"
    contract.language          = data.get("language") or contract.language or "en"
    contract.contract_type     = data.get("contract_type")
    contract.parties           = data.get("parties", [])
    contract.effective_date    = data.get("effective_date")
    contract.expiration_date   = data.get("expiration_date")
    contract.auto_renewal      = data.get("auto_renewal", False)
    contract.auto_renewal_notice_days = data.get("auto_renewal_notice_days")
    contract.auto_renewal_term_years  = data.get("auto_renewal_term_years")
    contract.total_value       = data.get("total_value")
    contract.currency          = data.get("currency", "USD")
    contract.governing_law     = data.get("governing_law")
    contract.plain_english_summary = data.get("plain_english_summary")

    for rc in data.get("risk_clauses", []):
        db.add(RiskClause(
            contract_id=contract.id,
            type=rc.get("type"), severity=rc.get("severity", "medium"),
            title=rc.get("title"), description=rc.get("description"),
            section_ref=rc.get("section_ref"),
            page_number=rc.get("page_number"), text_snippet=rc.get("text_snippet"),
        ))

    for ob in data.get("obligations", []):
        db.add(Obligation(
            contract_id=contract.id,
            title=ob.get("title"), description=ob.get("description"),
            due_date=ob.get("due_date"), frequency=ob.get("frequency", "one_time"),
            owner_team=ob.get("owner_team"),
            trigger_type=ob.get("trigger_type", "time_based"),
            status="pending",
            section_ref=ob.get("section_ref"),
            page_number=ob.get("page_number"), text_snippet=ob.get("text_snippet"),
        ))

    db.commit()
    db.refresh(contract)
    return contract_to_dict(contract)


@app.get("/api/contracts/{contract_id}/pdf")
def get_contract_pdf(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(404, "Contract not found")
    if not c.pdf_path or not os.path.exists(c.pdf_path):
        raise HTTPException(404, "No PDF file available for this contract")
    return FileResponse(c.pdf_path, media_type="application/pdf", filename=f"{c.name}.pdf")


class SearchRequest(BaseModel):
    question: str
    contract_id: Optional[int] = None
    role: Optional[str] = None   # "legal" | "procurement" | "executive"


@app.post("/api/search")
def search_contracts(req: SearchRequest, db: Session = Depends(get_db)):
    query = db.query(Contract).filter(Contract.status == "completed")
    if req.contract_id:
        query = query.filter(Contract.id == req.contract_id)
    contracts = query.all()
    if not contracts:
        return {"answer": "No contracts found in the system.", "results": [], "recommendation": None}
    contract_dicts = [contract_to_dict(c) for c in contracts]
    try:
        return search_with_claude(req.question, contract_dicts, role=req.role)
    except Exception as e:
        raise HTTPException(500, f"Search failed: {e}")


@app.get("/api/negotiations/{contract_id}")
def get_negotiation(contract_id: int, db: Session = Depends(get_db)):
    """Return cached analysis if portfolio hasn't changed, else return staleness flag."""
    c = db.query(Contract).filter(Contract.id == contract_id, Contract.status == "completed").first()
    if not c:
        raise HTTPException(404, "Contract not found")
    cached = db.query(NegotiationAnalysis).filter(NegotiationAnalysis.contract_id == contract_id).first()
    if not cached:
        return {"cached": False, "analysis": None, "stale": False}
    current_hash = compute_portfolio_hash(db, exclude_id=contract_id)
    stale = cached.portfolio_hash != current_hash
    return {
        "cached": True,
        "stale": stale,
        "created_at": cached.created_at.isoformat(),
        "analysis": cached.analysis,
    }


@app.post("/api/negotiations/{contract_id}/analyze")
def run_negotiation_analysis(contract_id: int, role: Optional[str] = None, db: Session = Depends(get_db)):
    """Run negotiation analysis, streaming tokens to the client via SSE."""
    target = db.query(Contract).filter(Contract.id == contract_id, Contract.status == "completed").first()
    if not target:
        raise HTTPException(404, "Contract not found or not yet processed")
    portfolio = db.query(Contract).filter(
        Contract.status == "completed",
        Contract.id != contract_id
    ).all()
    if not portfolio:
        raise HTTPException(400, "Need at least one other contract in portfolio to benchmark against")

    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set")

    prompt   = build_negotiations_prompt(contract_to_dict(target), [contract_to_dict(c) for c in portfolio], role=role)
    ph       = compute_portfolio_hash(db, exclude_id=contract_id)
    ai       = anthropic.Anthropic(api_key=api_key)

    def generate():
        full_text = ""
        try:
            with ai.messages.stream(
                model="claude-sonnet-4-6",
                max_tokens=8192,
                messages=[{"role": "user", "content": prompt}],
            ) as stream:
                for chunk in stream.text_stream:
                    full_text += chunk
                    yield f"data: {json.dumps({'t': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
            return

        try:
            analysis = parse_claude_json(full_text)
        except Exception as e:
            yield f"data: {json.dumps({'error': f'Parse failed: {e}'})}\n\n"
            return

        existing = db.query(NegotiationAnalysis).filter(NegotiationAnalysis.contract_id == contract_id).first()
        now = datetime.utcnow()
        if existing:
            existing.analysis       = analysis
            existing.portfolio_hash = ph
            existing.created_at     = now
        else:
            db.add(NegotiationAnalysis(contract_id=contract_id, analysis=analysis, portfolio_hash=ph))
        db.commit()

        yield f"data: {json.dumps({'done': True, 'cached': True, 'stale': False, 'created_at': now.isoformat(), 'analysis': analysis})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.delete("/api/contracts/{contract_id}")
def delete_contract(contract_id: int, db: Session = Depends(get_db)):
    c = db.query(Contract).filter(Contract.id == contract_id).first()
    if not c:
        raise HTTPException(404, "Contract not found")
    db.delete(c)
    db.commit()
    return {"deleted": contract_id}


@app.get("/api/obligations")
def get_obligations(db: Session = Depends(get_db)):
    obligations = db.query(Obligation).all()
    return [
        {
            "id": o.id,
            "contract_id": o.contract_id,
            "contract_name": o.contract.name if o.contract else "Unknown",
            "title": o.title,
            "description": o.description,
            "due_date": o.due_date,
            "frequency": o.frequency,
            "owner_team": o.owner_team,
            "trigger_type": o.trigger_type,
            "status": o.status,
        }
        for o in obligations
    ]


@app.put("/api/obligations/{obligation_id}/complete")
def complete_obligation(obligation_id: int, db: Session = Depends(get_db)):
    o = db.query(Obligation).filter(Obligation.id == obligation_id).first()
    if not o:
        raise HTTPException(404, "Obligation not found")
    o.status = "completed"
    db.commit()
    return {"status": "completed"}


@app.get("/api/stats")
def get_stats(db: Session = Depends(get_db)):
    today = date.today()
    contracts = db.query(Contract).filter(Contract.status == "completed").all()

    total_value = sum(c.total_value or 0 for c in contracts)

    # Renewal timeline (next 180 days)
    timeline = []
    renewing_90d = []
    for c in contracts:
        if not c.expiration_date:
            continue
        try:
            exp = date.fromisoformat(c.expiration_date)
        except ValueError:
            continue
        days_until = (exp - today).days
        status = "critical" if days_until < 30 else "warn" if days_until < 90 else "ok"
        item = {
            "id": c.id, "name": c.name, "expiration_date": c.expiration_date,
            "days_until": days_until, "status": status,
            "auto_renewal": c.auto_renewal, "value": c.total_value,
        }
        timeline.append(item)
        if 0 <= days_until <= 90 and c.auto_renewal:
            notice = c.auto_renewal_notice_days or 30
            cancel_by = exp - timedelta(days=notice)
            renewing_90d.append({**item, "cancel_by": cancel_by.isoformat(),
                                  "days_until_cancel": (cancel_by - today).days,
                                  "currency": c.currency})

    timeline.sort(key=lambda x: x["days_until"])

    # Risk counts
    critical_count = db.query(RiskClause).filter(RiskClause.severity == "critical").count()

    # Compliance rate
    total_obl = db.query(Obligation).count()
    done_obl  = db.query(Obligation).filter(Obligation.status == "completed").count()
    compliance_rate = int((done_obl / total_obl * 100) if total_obl > 0 else 0)

    # Vendor spend
    vendor_spend = sorted(
        [{"name": (c.parties or [c.name])[0], "value": c.total_value or 0, "id": c.id}
         for c in contracts if c.total_value],
        key=lambda x: x["value"], reverse=True
    )

    # Quarterly commitments
    quarters = {}
    for c in contracts:
        if not c.expiration_date or not c.total_value:
            continue
        try:
            exp = date.fromisoformat(c.expiration_date)
        except ValueError:
            continue
        # Spread annual value across active quarters
        monthly = (c.total_value / 12)
        for m_offset in range(12):
            d = today.replace(day=1) + timedelta(days=m_offset * 30)
            if d > exp:
                break
            q = f"Q{(d.month - 1) // 3 + 1} {d.year}"
            quarters[q] = quarters.get(q, 0) + monthly

    quarterly = [{"quarter": k, "value": round(v)} for k, v in sorted(quarters.items())[:6]]

    return {
        "total_contracts": len(contracts),
        "total_value": total_value,
        "renewing_90d_count": len(renewing_90d),
        "renewing_90d_value": sum(r["value"] or 0 for r in renewing_90d),
        "critical_risks": critical_count,
        "compliance_rate": compliance_rate,
        "timeline": timeline,
        "renewing_90d": renewing_90d,
        "vendor_spend": vendor_spend,
        "quarterly": quarterly,
    }


# ─────────────────────────────────────────────────────────────
# Seed data
# ─────────────────────────────────────────────────────────────
SEED = [
    {
        "name": "Salesforce Enterprise License",
        "status": "completed", "contract_type": "SaaS",
        "parties": ["Acme Corp", "Salesforce Inc."],
        "effective_date": "2024-05-22", "expiration_date": "2026-05-22",
        "auto_renewal": True, "auto_renewal_notice_days": 90, "auto_renewal_term_years": 2,
        "total_value": 180000, "currency": "USD", "governing_law": "California, USA",
        "plain_english_summary": (
            "You are licensed to use Salesforce's CRM platform until **May 22, 2026** at $180,000/year. "
            "The critical issue: you had to notify Salesforce of cancellation by **February 21, 2026** — "
            "that window has now **closed**, locking you into another 2-year term unless you negotiate an exit.\n\n"
            "Salesforce can increase pricing by up to 7% annually with 60 days notice, and their broad mutual "
            "indemnification clause may expose you to their legal costs in third-party IP claims. "
            "Your liability cap is fees paid in the prior 12 months (~$180k).\n\n"
            "**Recommended action:** Contact your Salesforce account executive immediately to negotiate "
            "renewal terms before the new term activates on May 22."
        ),
        "risk_clauses": [
            {"type": "auto_renewal", "severity": "critical",
             "title": "Auto-Renewal Window Expired",
             "description": "Cancellation notice was required by Feb 21, 2026. That deadline has passed — you are locked into a 2-year renewal from May 22, 2026.",
             "section_ref": "§ 14.1 — Term and Renewal"},
            {"type": "price_change", "severity": "high",
             "title": "Annual Price Escalation Right",
             "description": "Salesforce may increase fees up to 7% per year with 60 days written notice. No customer consent required.",
             "section_ref": "§ 5.3 — Fee Adjustments"},
            {"type": "indemnification", "severity": "high",
             "title": "Broad Mutual Indemnification",
             "description": "Both parties must indemnify each other for third-party IP infringement claims. Scope is broad and may expose you to unexpected legal costs.",
             "section_ref": "§ 11.2 — Indemnification"},
            {"type": "liability_cap", "severity": "medium",
             "title": "12-Month Fee Liability Cap",
             "description": "Total liability capped at fees paid in prior 12 months (~$180k). Market standard but worth noting for critical dependencies.",
             "section_ref": "§ 12.1 — Limitation of Liability"},
        ],
        "obligations": [
            {"title": "User access reconciliation report", "description": "Submit quarterly reconciliation of all active Salesforce users vs. licensed seats",
             "due_date": "2026-04-30", "frequency": "quarterly", "owner_team": "IT", "trigger_type": "time_based", "status": "pending"},
            {"title": "Renewal decision — window passed", "description": "Cancellation notice required by Feb 21, 2026 — this deadline has now passed",
             "due_date": "2026-02-21", "frequency": "one_time", "owner_team": "Procurement", "trigger_type": "time_based", "status": "overdue"},
        ],
    },
    {
        "name": "ZetaCo Data License",
        "status": "completed", "contract_type": "Data",
        "parties": ["Acme Corp", "ZetaCo Ltd"],
        "effective_date": "2024-06-12", "expiration_date": "2026-04-10",
        "auto_renewal": True, "auto_renewal_notice_days": 90, "auto_renewal_term_years": 2,
        "total_value": 22000, "currency": "USD", "governing_law": "England & Wales",
        "plain_english_summary": (
            "You are licensed to use ZetaCo's market data feed until **April 10, 2026** — that's in about 23 days. "
            "You needed to notify them of cancellation by January 10, 2026 — **that window closed** three months ago. "
            "You are now locked into another 2-year term at $22,000/year unless you negotiate out immediately.\n\n"
            "The most concerning clause: ZetaCo **claims ownership over any derivative works, models, or analytics** "
            "built using their data feed — even if you built them entirely in-house. They can also raise prices up to 15% annually "
            "with just 30 days notice.\n\n"
            "**Action required now:** Contact ZetaCo today to negotiate an exit or carve out ownership of your internally-built derivatives. "
            "This is both an auto-renewal emergency and a material IP risk."
        ),
        "risk_clauses": [
            {"type": "ip_ownership", "severity": "critical",
             "title": "Derivative Works Ownership Claim",
             "description": "ZetaCo claims rights over analytics, models, or tools derived from their data — even those built entirely by your team using your own resources.",
             "section_ref": "§ 7.3 — Intellectual Property"},
            {"type": "auto_renewal", "severity": "critical",
             "title": "Renewal Lock-In — Window Expired",
             "description": "90-day cancellation notice was required by Jan 10, 2026. Window has passed. Auto-renews April 10 for 2 additional years.",
             "section_ref": "§ 12.1 — Term & Renewal"},
            {"type": "price_change", "severity": "high",
             "title": "15% Annual Price Increase Right",
             "description": "ZetaCo can increase annual fees up to 15% with only 30 days notice. No negotiation or consent required.",
             "section_ref": "§ 4.2 — Fee Adjustments"},
            {"type": "audit_rights", "severity": "medium",
             "title": "Annual Usage Audit Rights",
             "description": "ZetaCo can audit your data usage logs with 5 business days notice, once per year.",
             "section_ref": "§ 9.1 — Audit Rights"},
        ],
        "obligations": [
            {"title": "Q4 usage report submission", "description": "Submit quarterly data usage report to ZetaCo by January 10 each year",
             "due_date": "2026-01-10", "frequency": "quarterly", "owner_team": "Operations", "trigger_type": "time_based", "status": "overdue"},
            {"title": "Security incident notification", "description": "Notify ZetaCo within 72 hours of any security incident involving their data",
             "due_date": None, "frequency": "event_based", "owner_team": "IT", "trigger_type": "event_based", "status": "pending"},
        ],
    },
    {
        "name": "AWS Enterprise Support",
        "status": "completed", "contract_type": "Cloud",
        "parties": ["Acme Corp", "Amazon Web Services"],
        "effective_date": "2024-08-10", "expiration_date": "2026-08-10",
        "auto_renewal": True, "auto_renewal_notice_days": 60, "auto_renewal_term_years": 1,
        "total_value": 96000, "currency": "USD", "governing_law": "Washington, USA",
        "plain_english_summary": (
            "This agreement covers AWS Enterprise Support at $96,000/year, providing dedicated technical account management "
            "and 15-minute critical issue response times. The contract expires **August 10, 2026** — you have until "
            "**June 11, 2026** to cancel if you don't want to renew.\n\n"
            "The main risk is a broad indemnification clause requiring you to defend AWS against claims arising from your "
            "infrastructure configuration. There's also no cash SLA penalty: uptime failures result only in service credits "
            "(up to 30% of monthly fee), with no right to terminate.\n\n"
            "This is a relatively standard enterprise cloud agreement. The 60-day cancellation window gives you reasonable notice. "
            "Consider negotiating the indemnification scope and adding cash SLA penalties at renewal."
        ),
        "risk_clauses": [
            {"type": "indemnification", "severity": "high",
             "title": "Broad Customer Indemnification",
             "description": "You must defend and indemnify AWS against third-party claims arising from your use or misconfiguration of AWS services.",
             "section_ref": "§ 8.2 — Indemnification"},
            {"type": "sla_penalty", "severity": "high",
             "title": "Credits-Only SLA Remedy",
             "description": "AWS uptime SLA breaches result only in service credits (up to 30% of monthly fee). No cash compensation or termination rights.",
             "section_ref": "§ 5.1 — Service Level Agreement"},
            {"type": "termination", "severity": "medium",
             "title": "AWS Immediate Termination Right",
             "description": "AWS can terminate immediately for violation of their Acceptable Use Policy, which they may update with 30 days notice.",
             "section_ref": "§ 14.3 — Termination for Cause"},
        ],
        "obligations": [
            {"title": "Annual penetration test certification", "description": "Submit proof of annual penetration test to AWS Security team",
             "due_date": "2026-01-31", "frequency": "annual", "owner_team": "IT", "trigger_type": "time_based", "status": "overdue"},
            {"title": "SOC 2 Type II report submission", "description": "Provide current SOC 2 Type II report to AWS compliance portal",
             "due_date": "2026-05-15", "frequency": "annual", "owner_team": "IT", "trigger_type": "time_based", "status": "pending"},
        ],
    },
    {
        "name": "BetaTech Services MSA",
        "status": "completed", "contract_type": "Services",
        "parties": ["Acme Corp", "BetaTech GmbH"],
        "effective_date": "2025-04-05", "expiration_date": "2026-04-05",
        "auto_renewal": False, "auto_renewal_notice_days": None, "auto_renewal_term_years": None,
        "total_value": 45000, "currency": "USD", "governing_law": "Germany",
        "plain_english_summary": (
            "BetaTech provides software development services under this MSA at $45,000 for 12 months. "
            "The contract expires **April 5, 2026** — in 18 days — and does **not** auto-renew. "
            "You must actively decide to renew or it simply lapses.\n\n"
            "The most material risk: **BetaTech's maximum liability to you is only $100,000** regardless of actual damage. "
            "Given their access to your production codebase and customer data, this cap is dangerously low. "
            "There is also no explicit IP assignment clause — ownership of deliverables is legally ambiguous under German law.\n\n"
            "**At renewal, prioritise:** (1) increasing the liability cap to ≥$500k, (2) adding explicit IP assignment "
            "for all deliverables, (3) adding a data breach notification clause. Renewal must be decided before April 5."
        ),
        "risk_clauses": [
            {"type": "liability_cap", "severity": "critical",
             "title": "$100k Liability Cap",
             "description": "BetaTech's total liability is capped at $100,000 — far below engagement scope. A significant breach would leave you with minimal recourse.",
             "section_ref": "§ 11.2 — Limitation of Liability"},
            {"type": "ip_ownership", "severity": "high",
             "title": "No IP Assignment Clause",
             "description": "No explicit clause assigns ownership of deliverables to you. IP ownership of work product is ambiguous under German law.",
             "section_ref": "§ 6 — Intellectual Property (absent)"},
            {"type": "termination", "severity": "high",
             "title": "BetaTech Convenience Termination",
             "description": "BetaTech can terminate for any reason with 30 days notice — potentially abandoning in-progress projects mid-delivery.",
             "section_ref": "§ 13.2 — Termination for Convenience"},
        ],
        "obligations": [
            {"title": "Quarterly service review meeting", "description": "Joint review meeting with BetaTech to assess project progress and upcoming milestones",
             "due_date": "2026-03-31", "frequency": "quarterly", "owner_team": "Procurement", "trigger_type": "time_based", "status": "pending"},
            {"title": "Renewal decision deadline", "description": "Decide whether to renew before April 5 — no auto-renewal on this agreement",
             "due_date": "2026-03-26", "frequency": "one_time", "owner_team": "Procurement", "trigger_type": "time_based", "status": "pending"},
        ],
    },
    {
        "name": "Acme–Pinnacle NDA",
        "status": "completed", "contract_type": "NDA",
        "parties": ["Acme Corp", "Pinnacle Ventures"],
        "effective_date": "2025-12-01", "expiration_date": "2026-12-01",
        "auto_renewal": False, "auto_renewal_notice_days": None, "auto_renewal_term_years": None,
        "total_value": None, "currency": None, "governing_law": "New York, USA",
        "plain_english_summary": (
            "Standard mutual NDA covering discussions with Pinnacle Ventures around a potential partnership. "
            "Both parties agree to keep each other's information confidential for **3 years from the date of disclosure** "
            "(not just the contract term). The agreement expires December 1, 2026 with no auto-renewal.\n\n"
            "The main constraint is a **non-solicitation clause**: neither party can solicit the other's employees for "
            "12 months after termination. This may affect recruiting if any Pinnacle staff are of interest.\n\n"
            "This is a low-risk agreement. The only ongoing obligation is ensuring staff who received Pinnacle's "
            "confidential information are reminded of their obligations annually."
        ),
        "risk_clauses": [
            {"type": "non_compete", "severity": "medium",
             "title": "12-Month Non-Solicitation",
             "description": "Neither party can solicit the other's employees for 12 months after termination. May limit recruiting options.",
             "section_ref": "§ 8 — Non-Solicitation"},
            {"type": "liability_cap", "severity": "low",
             "title": "No Liability Cap on Breach",
             "description": "No explicit cap — full injunctive relief and damages are available for unauthorised disclosure. Standard for NDAs.",
             "section_ref": "§ 11 — Remedies"},
        ],
        "obligations": [
            {"title": "Annual staff confidentiality reminder", "description": "Remind staff who received Pinnacle information of confidentiality obligations",
             "due_date": "2026-06-01", "frequency": "annual", "owner_team": "Legal", "trigger_type": "time_based", "status": "pending"},
        ],
    },
]


def seed_database(db: Session):
    for seed in SEED:
        c = Contract(
            name=seed["name"], status=seed["status"],
            contract_type=seed["contract_type"], parties=seed["parties"],
            effective_date=seed["effective_date"], expiration_date=seed["expiration_date"],
            auto_renewal=seed["auto_renewal"],
            auto_renewal_notice_days=seed["auto_renewal_notice_days"],
            auto_renewal_term_years=seed["auto_renewal_term_years"],
            total_value=seed["total_value"], currency=seed["currency"],
            governing_law=seed["governing_law"],
            plain_english_summary=seed["plain_english_summary"],
        )
        db.add(c)
        db.flush()
        for rc in seed.get("risk_clauses", []):
            db.add(RiskClause(contract_id=c.id, **rc))
        for ob in seed.get("obligations", []):
            db.add(Obligation(contract_id=c.id, **ob))
        db.commit()


# ─────────────────────────────────────────────────────────────
# Serve built frontend (production)
# ─────────────────────────────────────────────────────────────
FRONTEND_DIST = os.environ.get("FRONTEND_DIST", os.path.join(BASE_DIR, "..", "frontend", "dist"))
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_spa(full_path: str):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
