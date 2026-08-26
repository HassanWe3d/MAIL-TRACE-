<<<<<<< HEAD
# MAIL-TRACE-FINALIZED-
AI-powered email threat detection and forensic intelligence platform that automatically analyzes suspicious emails, extracts IOCs, checks live threat intelligence, performs IP enrichment, assesses risk with AI, and generates an evidence-backed investigation report.
=======
# AI-Powered Email Threat Detection & Forensic Intelligence Platform

## Overview
Backend service for analyzing suspicious emails through automated parsing, authentication analysis, IOC extraction, threat intelligence enrichment, deterministic risk scoring, and AI-powered classification.

## Architecture
```
Email Upload → Parser → Headers/Auth → IOC Extraction → Enrichment (ip-api, VirusTotal) → Risk Engine → Claude AI → PostgreSQL → PDF Report
```

## Tech Stack
- Python 3.12+ / FastAPI / Pydantic
- PostgreSQL / SQLAlchemy (async)
- ReportLab (PDF generation)
- Claude Sonnet (AI classification)
- VirusTotal (threat intel)
- ip-api.com (IP geolocation)

## Setup

### 1. Create virtual environment
```bash
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
# .venv\Scripts\activate   # Windows
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your API keys
```

### 4. Run PostgreSQL
```bash
docker-compose up -d db
```

### 5. Run the server
```bash
uvicorn app.main:app --reload
```

### 6. Docker (full stack)
```bash
docker-compose up --build
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/investigations/upload` | Upload .eml for analysis |
| GET | `/api/investigations` | List investigations (paginated) |
| GET | `/api/investigations/{id}` | Investigation details |
| GET | `/api/investigations/{id}/graph` | Relationship graph |
| GET | `/api/investigations/{id}/report` | PDF forensic report |
| GET | `/api/health` | Health check |
| GET | `/docs` | Swagger UI |

## Example Usage

### Upload an email
```bash
curl -X POST http://localhost:8000/api/investigations/upload \
  -F "file=@suspicious_email.eml"
```

### Get investigation details
```bash
curl http://localhost:8000/api/investigations/{investigation_id}
```

### Download PDF report
```bash
curl http://localhost:8000/api/investigations/{investigation_id}/report -o report.pdf
```

## Risk Scoring
Deterministic weights:
- SPF fail: +15 | DKIM fail: +15 | DMARC fail: +15
- From/Return-Path mismatch: +10
- Malicious URL (VT): +20 | Malicious domain (VT): +15
- Malicious attachment hash (VT): +25
- Suspicious IP (hosting): +10 | Lookalike domain: +10
- AI social engineering: 0-15 (confidence-scaled)

Levels: LOW (0-29), MEDIUM (30-59), HIGH (60-79), CRITICAL (80-100)

## Testing
```bash
cd backend
python -m pytest tests/ -v
```

## Security
- Attachments are never executed
- HTML is never rendered
- API keys stay server-side only
- Enrichment failures don't crash investigations
>>>>>>> master
