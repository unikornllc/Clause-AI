# Clause — Contract Intelligence

Post-signature contract intelligence. Upload contracts, get instant AI-powered insights.

## Quick Start

### 1. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp ../.env.example .env
# Edit .env and add your ANTHROPIC_API_KEY

uvicorn main:app --reload --port 8000
```

### 2. Frontend (new terminal)
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**

The app ships with 5 demo contracts pre-loaded. Upload any real PDF contract to see live Claude extraction.

## Features
- **Contract Brief** — plain English summary of what you agreed to, instantly after upload
- **Renewal Timeline** — visual dashboard of upcoming renewals with days-to-cancel alerts
- **Ask Anything** — natural language search across your entire portfolio
- **Risk Heat Map** — clause-level risk comparison across all vendors
- **Obligation Monitor** — every time-based and event-based obligation, with owner assignment
- **Executive View** — KPIs, vendor concentration, quarterly commitments, AI briefing

## Stack
- Backend: Python · FastAPI · SQLite · SQLAlchemy · pdfplumber · Anthropic SDK
- Frontend: React 18 · Vite · custom CSS design system
- AI: Claude Sonnet (`claude-sonnet-4-6`)
