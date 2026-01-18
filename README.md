<div align="center">

# Communify 📍🌎

### AI-Powered Accessibility Barrier Reporting Platform

*Making cities accessible for everyone through the power of AI and geospatial intelligence*

**Built for UofTHacks 13**

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Visit%20Site-00C853?style=for-the-badge&logo=vercel&logoColor=white)](https://uofthacks-13-nine.vercel.app/)
[![Devpost](https://img.shields.io/badge/Devpost-Submission-003E54?style=for-the-badge&logo=devpost&logoColor=white)](https://devpost.com/software/communify-65i0w7)
[![YouTube](https://img.shields.io/badge/YouTube-Demo%20Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=awMQtPDcUdU&t=1s)

<br/>

![Gemini](https://img.shields.io/badge/Google%20Gemini-2.0%20Flash-4285F4?style=for-the-badge&logo=google&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Media%20Cloud-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

<br/>

[Features](#-features) • [Tech Stack](#-technology-deep-dive) • [Sponsor Tracks](#-sponsor-track-implementations)

</div>

---

## The Problem

Accessibility isn't just about disabilities—it affects **everyone**. Parents pushing strollers, elderly individuals with walkers, travelers with luggage, people using canes, wheelchair users, and even children learning to walk all face the same urban obstacles. Broken sidewalks, missing ramps, and blocked pathways create barriers that impact millions of people daily. Yet municipal teams struggle to identify and prioritize these repairs across vast urban landscapes.

## Our Solution

**Communify** transforms accessibility reporting through intelligent automation. Citizens snap a photo or video of a barrier, and our AI instantly analyzes, categorizes, and routes the report to the right municipal team—complete with repair cost estimates and severity assessments.

---

## Sponsor Track Implementations

<table>
<tr>
<td width="50%">

### Google Gemini API

**Multi-Modal AI Intelligence at Scale**

We leverage **Gemini 2.0 Flash** across three distinct use cases:

**1. Vision Analysis Pipeline**
- Analyzes uploaded images/videos to detect accessibility barriers
- Classifies into **19 specialized categories** (missing ramps, broken sidewalks, blocked paths, etc.)
- Assesses **severity levels** (low/medium/high) based on safety risk
- Generates **repair cost estimates** in CAD with quantity units
- Returns structured JSON with confidence scores (0.0-1.0)

**2. Intelligent Search Agent (LangGraph)**
- Powers our multi-agent semantic search system
- **Intent Analyst Agent**: Parses natural language queries into structured search plans
- Understands context like "show me all dangerous potholes near downtown"

**3. Semantic Embeddings**
- Uses `text-embedding-004` model for vector representations
- Enables similarity-based report discovery
- Powers intelligent report clustering and recommendations

```python
# Multi-agent architecture with Gemini LLM
Intent Analyst → Search Specialist → Supervisor
     ↓                  ↓               ↓
  (Gemini)         (Tools/FAISS)   (Aggregation)
```

</td>
<td width="50%">

### MongoDB Atlas

**Geospatial Intelligence & Real-Time Data**

Our entire data architecture is built on **MongoDB Atlas** with advanced geospatial capabilities:

**GeoJSON-Powered Reports**
```javascript
{
  location: {
    type: 'Point',
    coordinates: [-79.3832, 43.6532]  // Toronto
  },
  aiDraft: { /* Gemini analysis */ },
  content: { /* User-verified data */ },
  routing: { /* Auto-assigned area */ }
}
```

**Administrative Area Matching**
- Stores **GeoJSON Polygons** for responsibility zones
- Uses `$geoIntersects` for instant report-to-area routing
- Triggers real-time email notifications to area managers

**Key Capabilities:**
- **Geospatial Indexing**: Sub-millisecond location queries
- **Schema Flexibility**: Supports AI drafts + user edits
- **Aggregation Pipelines**: Complex analytics per area
- **Real-time Routing**: Auto-assigns reports to jurisdictions

**Collections:**
- `reports` - Barrier reports with location + AI analysis
- `areas` - Administrative polygons with notification rules

</td>
</tr>
</table>

---

### Cloudinary Integration

<div align="center">

**Optimized Media Pipeline with Intelligent Transformations**

</div>

Our media infrastructure leverages **Cloudinary** for production-grade image handling:

| Feature | Implementation |
|---------|----------------|
| **Direct Upload** | Client-side signed uploads with progress tracking |
| **Auto-Optimization** | `q_auto,f_auto` delivers WebP/AVIF based on browser |
| **Responsive Images** | Thumbnails (400px), Previews (800px), Full (1600px) |
| **Format Conversion** | HEIC → JPEG conversion for iOS compatibility |
| **Graceful Fallback** | Base64 encoding when Cloudinary unavailable |

```typescript
// Cloudinary transformation presets
const TRANSFORMS = {
  thumbnail: 'w_400,q_auto,f_auto',   // Fast feed rendering
  preview:   'w_800,q_auto,f_auto',   // Modal previews
  full:      'w_1600,q_auto,f_auto'   // Full detail view
};
```

---

## Features

<table>
<tr>
<td width="50%">

### For Citizens
- **Smart Photo/Video Upload** - HEIC support, GPS auto-detection
- **AI-Powered Analysis** - Instant categorization via Gemini Vision
- **Cost Estimation** - Canadian dollar repair estimates
- **Interactive 3D Map** - Explore barriers with Mapbox GL
- **Edit AI Suggestions** - Refine before submission

</td>
<td width="50%">

### For Administrators
- **Draw Responsibility Zones** - Polygon-based area management
- **Real-Time Notifications** - Email alerts for new reports
- **Analytics Dashboard** - Severity breakdowns, report counts
- **Semantic Search** - Natural language query interface
- **Status Tracking** - Draft → Open → In Progress → Resolved

</td>
</tr>
</table>

---

## Technology Deep Dive

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                COMMUNIFY                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────────────┐   │
│  │   Frontend   │───▶│  Next.js API │───▶│      Google Gemini API       │   │
│  │   Next.js    │    │    Routes    │    │  ┌────────────────────────┐  │   │
│  │   React 19   │    └──────────────┘    │  │ gemini-2.0-flash       │  │   │
│  │   Mapbox GL  │           │            │  │ (Vision + LLM)         │  │   │
│  └──────────────┘           │            │  ├────────────────────────┤  │   │
│         │                   │            │  │ text-embedding-004     │  │   │
│         │                   ▼            │  │ (Semantic Search)      │  │   │
│         │         ┌──────────────┐       │  └────────────────────────┘  │   │
│         │         │   MongoDB    │       └──────────────────────────────┘   │
│         │         │    Atlas     │                                          │
│         │         │ ┌──────────┐ │       ┌──────────────────────────────┐   │
│         │         │ │ reports  │ │       │        Cloudinary            │   │
│         │         │ │ (GeoJSON │ │       │  ┌────────────────────────┐  │   │
│         └────────▶│ │  Points) │ │◀─────▶│  │ Image Optimization     │  │   │
│                   │ ├──────────┤ │       │  │ Auto-format (WebP)     │  │   │
│                   │ │  areas   │ │       │  │ Responsive transforms  │  │   │
│                   │ │(Polygons)│ │       │  └────────────────────────┘  │   │
│                   │ └──────────┘ │       └──────────────────────────────┘   │
│                   └──────────────┘                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **AI/ML** | Google Gemini 2.0 Flash (Vision + LLM), Gemini Embeddings, FAISS Vector Store |
| **Database** | MongoDB Atlas with Geospatial Indexing |
| **Media** | Cloudinary (CDN + Transformations) |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS |
| **Maps** | Mapbox GL JS + Mapbox Draw |
| **Backend** | Next.js API Routes, FastAPI (Python agents) |
| **Agents** | LangGraph Multi-Agent Orchestration, LangChain |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/reports` | GET | List all reports with geospatial data |
| `/api/reports` | POST | Create report with auto area-routing |
| `/api/areas` | GET/POST | Manage administrative polygons |
| `/api/analyze` | POST | Gemini Vision analysis |
| `/api/cloudinary/signature` | GET | Signed upload params |
| `/api/db/init` | POST | Initialize geospatial indexes |

---

## Project Structure

```
uofthacks-13/
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # Main map interface
│   │   │   ├── admin/page.tsx        # Admin dashboard
│   │   │   └── api/                   # Next.js API routes
│   │   │       ├── analyze/          # Gemini Vision endpoint
│   │   │       ├── reports/          # MongoDB CRUD
│   │   │       └── cloudinary/       # Media upload
│   │   ├── components/               # React components
│   │   ├── lib/
│   │   │   ├── ai/gemini.ts         # Gemini API client
│   │   │   ├── mongodb.ts           # Database connection
│   │   │   └── cloudinary.ts        # Media utilities
│   │   └── hooks/                    # Custom React hooks
│   └── package.json
├── agent_backend/
│   ├── agent.py                      # LangGraph orchestration
│   ├── agents/intent_analyst.py      # Gemini LLM agent
│   ├── embeddings.py                 # Gemini embeddings + FAISS
│   ├── tools.py                      # Search tools
│   └── db.py                         # MongoDB connection
└── README.md
```

---

## AI Analysis Categories

Our Gemini-powered analysis classifies barriers into **19 specialized categories**:

<table>
<tr>
<td>

- `blocked_path`
- `broken_sidewalk`
- `construction_barrier`
- `drainage_issue`
- `missing_ramp`
- `missing_signage`
- `missing_tactile`

</td>
<td>

- `narrow_passage`
- `no_crossing_signal`
- `no_curb_cut`
- `no_ramp`
- `obstacle_on_path`
- `overgrown_vegetation`

</td>
<td>

- `parking_violation`
- `poor_lighting`
- `pothole`
- `slippery_surface`
- `steep_grade`
- `uneven_surface`

</td>
</tr>
</table>

---

<div align="center">

## Built With

**Google Gemini** for intelligent multi-modal analysis

**MongoDB Atlas** for geospatial data at scale

**Cloudinary** for optimized media delivery

---

### Team

Built with dedication for **UofTHacks 13**

---

*Making cities accessible, one report at a time.*

</div>
