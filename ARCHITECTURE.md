# TripSync — Trip Management Platform
## Architecture & Technical Documentation

### Overview
TripSync is a mobile-first, full-stack trip management web application built on top of the [leh-odyssey](https://github.com/manojkumar0610/leh-odyssey) repository. It supports 10,000+ concurrent users with real-time weather, expense splitting, AI-assisted planning, and collaborative group management.

---

## Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Vanilla JS + HTML/CSS (PWA) | Zero-dependency, fast load on mobile |
| Backend API | Node.js + Express OR Supabase Edge Functions | Serverless-scalable |
| Database | PostgreSQL via Neon (serverless) | Already in repo, scales to 10k users |
| Auth | Supabase Auth or JWT | Free tier, email + social login |
| Weather | Open-Meteo API (free, no key) | Free, accurate, global coverage |
| Traffic | TomTom Traffic API (free tier) | 2,500 req/day free |
| AI Agent | Anthropic Claude API (claude-sonnet) | Built-in context, trip-aware |
| Hosting | Netlify (already configured) | Free tier, CI/CD, edge CDN |
| Storage | JSONBin (already in repo) + Neon DB | Hybrid: local + cloud |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT (PWA)                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │Dashboard │ │Itinerary │ │Expenses  │ │AI Assistant  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│              Service Worker (offline cache)                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
┌───────────────────────▼─────────────────────────────────────┐
│                    API GATEWAY (Netlify Functions)           │
│  /api/trips  /api/members  /api/expenses  /api/itinerary    │
└──┬─────────┬───────────────┬────────────────────────────────┘
   │         │               │
   ▼         ▼               ▼
Neon DB   External APIs   Anthropic API
(Postgres) ┌────────────┐  (AI Agent)
           │Open-Meteo  │
           │TomTom      │
           │Geocoding   │
           └────────────┘
```

---

## Database Schema

### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### trips
```sql
CREATE TABLE trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES users(id),
  name VARCHAR(200) NOT NULL,
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  trip_type VARCHAR(50),
  status VARCHAR(20) DEFAULT 'upcoming', -- upcoming | active | completed
  start_date DATE,
  end_date DATE,
  budget_inr DECIMAL(12,2),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### trip_members
```sql
CREATE TABLE trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  name VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  role VARCHAR(50),
  vehicle VARCHAR(100),
  emergency_contact TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);
```

### itinerary_days
```sql
CREATE TABLE itinerary_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  date DATE,
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  distance_km INTEGER,
  status VARCHAR(20) DEFAULT 'upcoming',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### itinerary_activities
```sql
CREATE TABLE itinerary_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id UUID REFERENCES itinerary_days(id) ON DELETE CASCADE,
  time_hhmm VARCHAR(5),
  description TEXT NOT NULL,
  activity_type VARCHAR(50),
  sort_order INTEGER DEFAULT 0
);
```

### expenses
```sql
CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  amount_inr DECIMAL(10,2) NOT NULL,
  category VARCHAR(50),
  paid_by_member_id UUID REFERENCES trip_members(id),
  expense_date DATE,
  split_type VARCHAR(20) DEFAULT 'equal', -- equal | custom | solo
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### expense_splits
```sql
CREATE TABLE expense_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID REFERENCES expenses(id) ON DELETE CASCADE,
  member_id UUID REFERENCES trip_members(id),
  share_amount DECIMAL(10,2),
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMPTZ
);
```

---

## API Reference

### External APIs (Free/Open)

| Service | Purpose | Endpoint |
|---------|---------|----------|
| Open-Meteo | Weather data (free, no API key) | `https://api.open-meteo.com/v1/forecast` |
| Open-Meteo Geocoding | Location search | `https://geocoding-api.open-meteo.com/v1/search` |
| TomTom Traffic | Road conditions | `https://api.tomtom.com/traffic/services/` |
| Anthropic Claude | AI trip assistant | `https://api.anthropic.com/v1/messages` |
| Neon Serverless | PostgreSQL DB | Already in repo |

---

## Key Modules

### 1. Auth Module (`/app/js/app.js`)
- Local demo login (no backend needed for MVP)
- JWT-based session with localStorage
- Signup/Login/Logout flows

### 2. Trip Management
- CRUD for trips
- Status tracking: upcoming → active → completed
- Budget vs. spent tracking

### 3. Itinerary Builder
- Day-by-day timeline
- Per-day activities with timestamps
- Weather overlay per day
- Route notes and alerts

### 4. Member Management
- Add/remove trip participants
- Roles: Organizer, Rider, Mechanic, Medic, Photographer, Navigator
- Contact info + emergency contacts
- Vehicle details

### 5. Expense & Split Engine
- Add expenses with categories
- Equal split (Splitwise-style) auto-calculated
- Balance summary: who owes whom
- Settlement tracking

### 6. Weather Module (`/app/js/weather.js`)
- Live weather via Open-Meteo (free, no key)
- Route waypoint weather cards
- Traffic/road alert simulation (TomTom in production)
- Condition icons + severity coloring

### 7. AI Assistant (`/app/js/ai.js`)
- Claude claude-sonnet-4-20250514 integration
- Trip-context system prompt
- Multi-turn chat history
- Pre-built suggestion chips
- Handles: itinerary, budget, permits, packing, routes

---

## Deployment (Netlify — Already Configured)

```bash
# Install and build
npm install

# Deploy
netlify deploy --prod --dir=app
```

**Environment Variables (Netlify Dashboard):**
```
ANTHROPIC_API_KEY=sk-ant-...
NEON_DATABASE_URL=postgresql://...
TOMTOM_API_KEY=... (optional)
```

---

## Scalability Plan (10k Users)

| Concern | Solution |
|---------|---------|
| DB connections | Neon serverless (connection pooling built-in) |
| Static assets | Netlify CDN edge (auto) |
| API rate limits | Cache weather data 30min via Netlify KV |
| AI costs | Rate-limit per user: 20 msgs/day |
| Offline use | Service Worker caches itinerary + member data |
| Real-time updates | Supabase Realtime or Pusher for live expense sync |

---

## Development Roadmap

### Phase 1 — MVP (Current Branch: `feature/trip-management-platform`)
- [x] Auth (demo + localStorage)
- [x] Trip CRUD
- [x] Member management
- [x] Expense splitting (equal)
- [x] Itinerary timeline
- [x] Live weather (Open-Meteo)
- [x] AI assistant (Claude)
- [x] Mobile-responsive PWA

### Phase 2 — Backend Integration
- [ ] Neon PostgreSQL schema migration
- [ ] Supabase Auth (email + Google)
- [ ] Real-time expense sync
- [ ] Photo/receipt upload (Cloudinary)
- [ ] Push notifications (FCM)

### Phase 3 — Advanced Features
- [ ] TomTom traffic API integration
- [ ] Offline-first sync (service worker)
- [ ] Trip invitation via link
- [ ] Custom expense split ratios
- [ ] GPS route tracking
- [ ] Export itinerary as PDF

---

## UI/UX Design Principles
- **Dark theme** — readability in bright outdoor sun
- **Mobile-first** — thumb-friendly tap targets (min 44px)
- **Offline resilience** — critical data cached locally
- **Typography** — Syne (headings) + DM Sans (body) — legible, premium
- **Color system** — Indigo accent, semantic green/amber/red for status

---

*Branch: `feature/trip-management-platform` | Base: `leh-odyssey` repo*
